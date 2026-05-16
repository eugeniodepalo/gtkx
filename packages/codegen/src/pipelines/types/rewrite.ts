import { SUPPRESSED_METHOD_NAMES_BY_NAMESPACE } from "../../core/utils/method-suppression.js";

const RAW_FILE_PATTERN = /^node-(.+?)-\d+(?:\.\d+)*\.d\.ts$/;

/**
 * Maps a ts-for-gir raw output filename (e.g. `node-glib-2.0.d.ts`) to the
 * lowercase gtkx namespace identifier (e.g. `glib`). Returns `null` for files
 * that do not match the per-namespace output shape — companion `-import`
 * stubs, the `node-ambient` shim, the bare `node-gtk` namespace augmentor.
 */
export function namespaceFromRawFilename(filename: string): string | null {
    const match = filename.match(RAW_FILE_PATTERN);
    if (!match) return null;
    if (filename.endsWith("-import.d.ts")) return null;
    return match[1] ?? null;
}

const RELATIVE_IMPORT_LINE = /^(import[^;]+from\s+['"])\.\/node-(.+?)-\d+(?:\.\d+)*\.js(['"];?)$/gm;
const IMPORT_SHIM_LINE = /^import\s+['"]\.\/node-.+?-\d+(?:\.\d+)*-import\.d\.ts['"];?\s*$/gm;

/**
 * Rewrites `./node-<ns>-<ver>.js` module specifiers to `@gtkx/ffi/<ns>` and
 * removes the per-namespace `-import.d.ts` augmentation shims that ts-for-gir
 * emits alongside its main namespace file.
 */
export function rewriteNamespaceDeclarations(source: string): string {
    return source
        .replace(IMPORT_SHIM_LINE, "")
        .replace(RELATIVE_IMPORT_LINE, (_match, prefix: string, ns: string, suffix: string) => {
            return `${prefix}@gtkx/ffi/${ns}${suffix}`;
        });
}

const DEFAULT_IMPORT_PATTERN = /^import type (\w+) from (['"]@gtkx\/ffi\/[a-z0-9]+['"]);?$/gm;
const LEGACY_MODULE_KEYWORD_PATTERN = /^(\s*)((?:export\s+)?)module(\s+\w+\s*\{)/gm;

/**
 * Converts each `import type <Name> from '@gtkx/ffi/<ns>'` line into the
 * equivalent `import type * as <Name> from '@gtkx/ffi/<ns>'` so that type
 * expressions like `Gdk.RGBA` inside the .d.ts resolve against the imported
 * module's class declarations rather than the default-export value type.
 */
export function rewriteDefaultImportsToNamespace(source: string): string {
    return source.replace(DEFAULT_IMPORT_PATTERN, (_match, name: string, specifier: string) => {
        return `import type * as ${name} from ${specifier};`;
    });
}

/**
 * Replaces the legacy `module <Name> { ... }` keyword form ts-for-gir 3.x
 * emits for per-class signal/constructor companion blocks with the modern
 * `namespace <Name> { ... }` form. The former is rejected under strict TS
 * 6+ as a stylistic legacy of internal modules.
 */
export function rewriteModuleKeywordToNamespace(source: string): string {
    return source.replace(
        LEGACY_MODULE_KEYWORD_PATTERN,
        (_match, indent: string, exportPrefix: string, rest: string) => {
            return `${indent}${exportPrefix}namespace${rest}`;
        },
    );
}

const NAMESPACE_HEADER_PATTERN = /^export\s+(?:declare\s+)?namespace\s+\w+\s*\{/m;
const EXPORT_DEFAULT_LINE = /^export\s+default\s+\w+\s*;?\s*$/gm;

/**
 * Lifts every declaration inside the file's outer `export namespace <ns> { ... }`
 * to the source-file top level with an `export` keyword, then removes the
 * now-empty namespace wrapper and any `export default <ns>;` statement.
 *
 * ts-for-gir wraps every per-namespace `.d.ts` in a single outer namespace
 * declaration. That shape forces consumers to write `M.cairo.Status` after
 * `import * as M from "@gtkx/ffi/cairo"`. Lifting the contents removes the
 * redundant outer layer so callers can write `M.Status` directly.
 */
export function unwrapOuterNamespace(source: string): string {
    const match = source.match(NAMESPACE_HEADER_PATTERN);
    if (!match || match.index === undefined) return source;

    const headerStart = match.index;
    const bodyStart = headerStart + match[0].length;
    const closeIndex = findMatchingBrace(source, bodyStart);
    if (closeIndex < 0) return source;

    const body = source.slice(bodyStart, closeIndex);
    const lifted = liftNamespaceBody(body);

    const before = source.slice(0, headerStart);
    const after = source.slice(closeIndex + 1);

    return (before + lifted + after).replace(EXPORT_DEFAULT_LINE, "").replace(/\n{3,}/g, "\n\n");
}

/**
 * Removes the leading indentation of the namespace body and prepends `export`
 * to every namespace-level declaration without one. Tracks brace depth so
 * that interface fields named `type`, `class`, etc. aren't accidentally
 * prefixed.
 */
const liftNamespaceBody = (body: string): string => {
    const dedented = dedentBody(body);
    return prefixTopLevelDeclarations(dedented);
};

const prefixTopLevelDeclarations = (source: string): string => {
    const out: string[] = [];
    const len = source.length;
    let depth = 0;
    let inLineComment = false;
    let inBlockComment = false;
    let i = 0;
    let lineStart = 0;
    let pendingDecl: { lineStart: number; lineDepth: number } | null = null;

    while (i <= len) {
        const ch = i < len ? source[i] : "\n";

        if (ch === "\n" || i === len) {
            if (pendingDecl && pendingDecl.lineDepth === 0) {
                const line = source.slice(pendingDecl.lineStart, i);
                const trimmed = line.trimStart();
                const indent = line.slice(0, line.length - trimmed.length);
                out.push(`${indent}export ${trimmed}`);
            } else {
                out.push(source.slice(lineStart, i));
            }
            out.push("\n");
            if (i === len) break;
            inLineComment = false;
            lineStart = i + 1;
            pendingDecl = null;
            i++;
            continue;
        }

        if (inLineComment) {
            i++;
            continue;
        }
        if (inBlockComment) {
            if (ch === "*" && source[i + 1] === "/") {
                inBlockComment = false;
                i += 2;
                continue;
            }
            i++;
            continue;
        }
        if (ch === "/" && source[i + 1] === "/") {
            inLineComment = true;
            i += 2;
            continue;
        }
        if (ch === "/" && source[i + 1] === "*") {
            inBlockComment = true;
            i += 2;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === "`") {
            i = skipStringLiteral(source, i, ch);
            continue;
        }

        if (!pendingDecl && depth === 0 && i === firstNonSpaceOnLine(source, lineStart)) {
            if (lineStartsDeclaration(source, i)) {
                pendingDecl = { lineStart, lineDepth: depth };
            }
        }

        if (ch === "{") depth++;
        else if (ch === "}") depth = Math.max(0, depth - 1);
        i++;
    }

    return out.join("").replace(/\n$/, "");
};

const firstNonSpaceOnLine = (source: string, lineStart: number): number => {
    let i = lineStart;
    while (i < source.length && (source[i] === " " || source[i] === "\t")) i++;
    return i;
};

const DECLARATION_LINE_TEST =
    /^(declare\s+)?(class|interface|type|const|let|var|function|enum|namespace|module|abstract)\b/;
const SKIP_PREFIXES = ["export", "import", "//", "/*", "*"];

const lineStartsDeclaration = (source: string, position: number): boolean => {
    const rest = source.slice(position);
    const eolIndex = rest.indexOf("\n");
    const lineTail = eolIndex < 0 ? rest : rest.slice(0, eolIndex);
    const trimmed = lineTail.trimStart();
    if (trimmed.length === 0) return false;
    for (const prefix of SKIP_PREFIXES) {
        if (trimmed.startsWith(prefix)) return false;
    }
    return DECLARATION_LINE_TEST.test(trimmed);
};

/**
 * Removes the smallest leading-whitespace prefix shared by every non-empty
 * line of `body`. Used to flatten the indentation introduced by the outer
 * namespace wrapper.
 */
const dedentBody = (body: string): string => {
    const lines = body.split("\n");
    let minIndent = Number.POSITIVE_INFINITY;
    for (const line of lines) {
        if (line.trim().length === 0) continue;
        const match = line.match(/^[ \t]*/);
        const width = match ? match[0].length : 0;
        if (width < minIndent) minIndent = width;
    }
    if (!Number.isFinite(minIndent) || minIndent === 0) return body;
    return lines.map((line) => (line.length >= minIndent ? line.slice(minIndent) : line)).join("\n");
};

const skipStringLiteral = (source: string, start: number, quote: string): number => {
    let i = start + 1;
    while (i < source.length) {
        const ch = source[i];
        if (ch === "\\") {
            i += 2;
            continue;
        }
        if (ch === quote) return i + 1;
        if (quote === "`" && ch === "$" && source[i + 1] === "{") {
            i = findMatchingBrace(source, i + 2);
            if (i < 0) return source.length;
            i++;
            continue;
        }
        i++;
    }
    return source.length;
};

const skipLineComment = (source: string, start: number): number => {
    let i = start + 2;
    while (i < source.length && source[i] !== "\n") i++;
    return i + 1;
};

const skipBlockComment = (source: string, start: number): number => {
    let i = start + 2;
    while (i < source.length - 1) {
        if (source[i] === "*" && source[i + 1] === "/") return i + 2;
        i++;
    }
    return source.length;
};

/**
 * Returns the index of the `}` that matches the implicit `{` immediately
 * before `from`, treating strings and comments as opaque. Returns `-1` when
 * no matching brace is found.
 */
const findMatchingBrace = (source: string, from: number): number => {
    let depth = 1;
    let i = from;
    while (i < source.length) {
        const ch = source[i];
        if (ch === '"' || ch === "'" || ch === "`") {
            i = skipStringLiteral(source, i, ch);
            continue;
        }
        if (ch === "/" && source[i + 1] === "/") {
            i = skipLineComment(source, i);
            continue;
        }
        if (ch === "/" && source[i + 1] === "*") {
            i = skipBlockComment(source, i);
            continue;
        }
        if (ch === "{") depth++;
        else if (ch === "}") {
            depth--;
            if (depth === 0) return i;
        }
        i++;
    }
    return -1;
};

const ENUM_HEAD_PATTERN = /(^|\n)([ \t]*)(export[ \t]+)?((?:\/\*\*[\s\S]*?\*\/[ \t\n]*)?)enum[ \t]+(\w+)[ \t]*\{/g;
const EXPORT_BEFORE_DOC_ENUM_PATTERN = /\bexport[ \t]+(\/\*\*[\s\S]*?\*\/)[ \t\n]+(enum\b)/g;
const BLOCK_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT_PATTERN = /\/\/[^\n]*/g;

/**
 * Converts each `enum Foo { A, B }` declaration into a structural
 * `const Foo: { readonly A: 0; readonly B: 1; }` plus a sibling
 * `type Foo = (typeof Foo)[keyof typeof Foo]` alias.
 *
 * ts-for-gir emits numeric TypeScript enums, which are nominally branded and
 * cannot be satisfied by a plain `Object.freeze({ ... })` value emitted from
 * the raw-`.js` codegen side. The const-object shape produced here accepts
 * the frozen object while preserving consumer-facing usage: `M.Foo.A` reads
 * the constant and `Foo` continues to work as a type in function signatures.
 *
 * Member values are resolved in priority order: the real GIR value from
 * `enumValues`, then an explicit initializer present in the source, then the
 * computed ordinal. ts-for-gir emits enums without initializers, so the GIR
 * values are what keep non-sequential enums (offset enums, bitfields)
 * accurate against the runtime. JSDoc comments preceding members are stripped
 * because the const-object shape cannot host per-property block comments.
 *
 * Any JSDoc block authored between the `export` keyword and the `enum`
 * keyword is preserved on the rewritten `const` declaration so the rendered
 * docs stay attached to the new value declaration.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param enumValues - Real enum member values for the namespace, keyed enum
 *     name then member name; members absent from the map fall back as above.
 */
export function rewriteEnumsToConstObjects(source: string, enumValues?: NamespaceEnumValues): string {
    const normalized = source.replace(EXPORT_BEFORE_DOC_ENUM_PATTERN, "$1\nexport $2");
    const matches: Array<{
        start: number;
        end: number;
        replacement: string;
    }> = [];

    ENUM_HEAD_PATTERN.lastIndex = 0;
    for (;;) {
        const result = ENUM_HEAD_PATTERN.exec(normalized);
        if (result === null) break;
        const [matched, lineStart, indent, exportKw, leadingDoc, name] = result;
        if (!name) continue;
        const bodyStart = result.index + matched.length;
        const bodyEnd = findMatchingBrace(normalized, bodyStart);
        if (bodyEnd < 0) continue;
        const body = normalized.slice(bodyStart, bodyEnd);

        matches.push({
            start: result.index,
            end: bodyEnd + 1,
            replacement: renderEnumReplacement(
                lineStart ?? "",
                indent ?? "",
                exportKw ?? "",
                leadingDoc ?? "",
                name,
                body,
                enumValues?.get(name),
            ),
        });
    }

    if (matches.length === 0) return normalized;

    const parts: string[] = [];
    let cursor = 0;
    for (const { start, end, replacement } of matches) {
        parts.push(normalized.slice(cursor, start));
        parts.push(replacement);
        cursor = end;
    }
    parts.push(normalized.slice(cursor));
    return parts.join("");
}

const renderEnumReplacement = (
    lineStart: string,
    indent: string,
    exportKw: string,
    leadingDoc: string,
    name: string,
    body: string,
    memberValues?: ReadonlyMap<string, number>,
): string => {
    const stripped = body.replace(BLOCK_COMMENT_PATTERN, "").replace(LINE_COMMENT_PATTERN, "");
    let nextOrdinal = 0;
    const memberLines: string[] = [];
    for (const raw of stripped.split(",")) {
        const member = raw.trim();
        if (member.length === 0) continue;
        const [memberName, initializer] = splitEnumMember(member);
        if (!memberName || !/^[A-Za-z_]\w*$/.test(memberName)) continue;
        let literal: string;
        const knownValue = memberValues?.get(memberName);
        if (knownValue !== undefined) {
            literal = String(knownValue);
            nextOrdinal = knownValue + 1;
        } else if (initializer !== undefined) {
            literal = initializer;
            const numeric = parseNumericLiteral(initializer);
            if (numeric !== null) nextOrdinal = numeric + 1;
        } else {
            literal = String(nextOrdinal);
            nextOrdinal += 1;
        }
        memberLines.push(`    readonly ${memberName}: ${literal};`);
    }
    const memberBlock = memberLines.join("\n");
    return [
        `${lineStart}${indent}${leadingDoc}${exportKw}const ${name}: {`,
        memberBlock,
        `};`,
        `${indent}${exportKw}type ${name} = (typeof ${name})[keyof typeof ${name}];`,
    ].join("\n");
};

const splitEnumMember = (member: string): [string, string | undefined] => {
    const equalsIndex = member.indexOf("=");
    if (equalsIndex === -1) return [member.trim(), undefined];
    return [member.slice(0, equalsIndex).trim(), member.slice(equalsIndex + 1).trim()];
};

const parseNumericLiteral = (text: string): number | null => {
    const trimmed = text.trim();
    if (trimmed === "") return null;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : null;
};

const taggedDocPattern = (tag: string): RegExp =>
    new RegExp(`[ \\t]*\\/\\*\\*(?:(?!\\*\\/)[\\s\\S])*?@${tag}\\b(?:(?!\\*\\/)[\\s\\S])*?\\*\\/`, "g");

/**
 * Removes each member declaration whose preceding JSDoc block carries the
 * given tag, together with the single member line that follows it.
 *
 * When `memberFilter` is supplied, a tagged block is removed only if the
 * trimmed text of the member line that follows it satisfies the predicate;
 * the JSDoc block is then dropped together with that line.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param tag - JSDoc tag (without the leading `@`) marking members to strip.
 * @param memberFilter - Optional predicate over the trimmed member line.
 * @returns The source with the tagged member declarations removed.
 */
const stripTaggedMembers = (source: string, tag: string, memberFilter?: (memberLine: string) => boolean): string => {
    const pattern = taggedDocPattern(tag);
    const parts: string[] = [];
    let cursor = 0;
    for (;;) {
        const match = pattern.exec(source);
        if (match === null) break;
        const docStart = match.index;
        const lineStart = source.lastIndexOf("\n", docStart) + 1;
        const docEnd = docStart + match[0].length;
        let memberLineStart = docEnd;
        while (memberLineStart < source.length && source[memberLineStart] !== "\n") memberLineStart += 1;
        if (memberLineStart < source.length) memberLineStart += 1;
        let memberEnd = memberLineStart;
        while (memberEnd < source.length && source[memberEnd] !== "\n") memberEnd += 1;
        const memberLine = source.slice(memberLineStart, memberEnd);
        if (memberEnd < source.length) memberEnd += 1;
        if (memberFilter && !memberFilter(memberLine.trim())) {
            pattern.lastIndex = docEnd;
            continue;
        }
        parts.push(source.slice(cursor, lineStart));
        cursor = memberEnd;
        pattern.lastIndex = cursor;
    }
    parts.push(source.slice(cursor));
    return parts.join("");
};

/**
 * Removes the positional `constructor(...)` overloads that ts-for-gir emits
 * for every GIR `<constructor>`, marked with a `@constructor` JSDoc tag.
 *
 * node-gtk's runtime constructor accepts a single GObject construct-properties
 * object; the GIR constructors are exposed only as `static` factory methods.
 * The gtkx runtime matches that: a props-object constructor plus `static`
 * factories. The props-object `constructor(config?: ConstructorProperties)`
 * overload — emitted without a `@constructor` tag — is left in place.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @returns The source with positional constructor overloads removed.
 */
export function stripPositionalConstructors(source: string): string {
    return stripTaggedMembers(source, "constructor", (memberLine) => memberLine.startsWith("constructor"));
}

/**
 * Removes the named instance-method declarations from a class or interface
 * body when the generated runtime omits them because a hand-written override
 * supplies them from the FFI runtime layer.
 *
 * The strip is scoped to the `interface <Owner>` and `class <Owner>` blocks so
 * that an identically named method on an unrelated declaration is left intact.
 * A method-member line is matched by its name followed by either `(` or `<`
 * (the latter covering a generic method head). The preceding JSDoc block, when
 * present, is removed together with the member line.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param suppressedByOwner - Suppressed method names keyed by owner name.
 * @returns The source with the suppressed method declarations removed.
 */
export function stripSuppressedMethods(
    source: string,
    suppressedByOwner?: ReadonlyMap<string, ReadonlySet<string>>,
): string {
    if (suppressedByOwner === undefined || suppressedByOwner.size === 0) return source;

    let result = source;
    for (const [owner, methodNames] of suppressedByOwner) {
        for (const blockKeyword of ["interface", "class"]) {
            const header = new RegExp(`(^|\\n)[ \\t]*export[ \\t]+${blockKeyword}[ \\t]+${owner}\\b[^{]*\\{`);
            const headerMatch = result.match(header);
            if (headerMatch === null || headerMatch.index === undefined) continue;
            const bodyStart = headerMatch.index + headerMatch[0].length;
            const bodyEnd = findMatchingBrace(result, bodyStart);
            if (bodyEnd < 0) continue;
            const body = result.slice(bodyStart, bodyEnd);
            result = result.slice(0, bodyStart) + stripMethodsFromBody(body, methodNames) + result.slice(bodyEnd);
        }
    }
    return result;
}

/**
 * Regex fragment matching an optional JSDoc block immediately preceding a
 * member. The inner `(?!\*\/)` guard keeps the lazy body from spanning past
 * the block's own `*\/` into later declarations.
 */
const OPTIONAL_LEADING_JSDOC = "(?:\\/\\*\\*(?:(?!\\*\\/)[\\s\\S])*?\\*\\/[ \\t\\n]*)?";

const stripMethodsFromBody = (body: string, methodNames: ReadonlySet<string>): string => {
    let result = body;
    for (const name of methodNames) {
        const memberLine = new RegExp(`(^|\\n)([ \\t]*)${OPTIONAL_LEADING_JSDOC}${name}[<(][^\\n]*`);
        const match = result.match(memberLine);
        if (match === null || match.index === undefined) continue;
        const start = match.index + (match[1] ?? "").length;
        let end = match.index + match[0].length;
        if (result[end] === "\n") end += 1;
        result = result.slice(0, start) + result.slice(end);
    }
    return result;
};

/**
 * Field-name sets keyed by class or interface name for one namespace.
 */
export type NamespaceFieldNames = ReadonlyMap<string, ReadonlySet<string>>;

/**
 * Class/interface field-name sets for every namespace, keyed lowercase
 * namespace identifier.
 */
export type FieldNameMap = ReadonlyMap<string, NamespaceFieldNames>;

/**
 * Removes the instance-struct field declarations that ts-for-gir emits into
 * GObject class and interface bodies.
 *
 * ts-for-gir emits each `<field>` element of a class or interface (the
 * embedded `parentInstance` parent struct, private `priv` pointers, and any
 * public layout fields) as a bare `<name>: <type>` member. node-gtk's
 * `makeObject` enumerates only properties, methods, and constants — never
 * `object_info_get_field` — so it never exposes instance-struct fields. The
 * gtkx runtime matches that surface. Boxed-struct fields are left intact
 * because node-gtk's `makeStruct` does expose them.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param fieldNamesByOwner - Field names keyed by class/interface name.
 * @returns The source with instance-struct field declarations removed.
 */
export function stripClassFields(source: string, fieldNamesByOwner?: NamespaceFieldNames): string {
    if (fieldNamesByOwner === undefined || fieldNamesByOwner.size === 0) return source;

    let result = source;
    for (const [owner, fieldNames] of fieldNamesByOwner) {
        if (fieldNames.size === 0) continue;
        for (const blockKeyword of ["interface", "class"]) {
            const header = new RegExp(`(^|\\n)[ \\t]*export[ \\t]+${blockKeyword}[ \\t]+${owner}\\b[^{]*\\{`);
            const headerMatch = result.match(header);
            if (headerMatch === null || headerMatch.index === undefined) continue;
            const bodyStart = headerMatch.index + headerMatch[0].length;
            const bodyEnd = findMatchingBrace(result, bodyStart);
            if (bodyEnd < 0) continue;
            const body = result.slice(bodyStart, bodyEnd);
            result = result.slice(0, bodyStart) + stripFieldsFromBody(body, fieldNames) + result.slice(bodyEnd);
        }
    }
    return result;
}

const stripFieldsFromBody = (body: string, fieldNames: ReadonlySet<string>): string => {
    let result = body;
    for (const name of fieldNames) {
        const memberLine = new RegExp(`(^|\\n)([ \\t]*)${OPTIONAL_LEADING_JSDOC}${name}(\\?)?:[ \\t][^\\n]*`);
        const match = result.match(memberLine);
        if (match === null || match.index === undefined) continue;
        const start = match.index + (match[1] ?? "").length;
        let end = match.index + match[0].length;
        if (result[end] === "\n") end += 1;
        result = result.slice(0, start) + result.slice(end);
    }
    return result;
};

const GTYPE_STRUCT_CLASS_PATTERN = /(^|\n)([ \t]*)export[ \t]+(?:abstract[ \t]+)?class[ \t]+(\w+)\b[^{]*\{/g;

/**
 * Removes the `export abstract class <name> { ... }` value declaration that
 * ts-for-gir emits for each gtype-struct (a class or interface vtable record).
 *
 * node-gtk's runtime never exposes gtype-structs as namespace members, so the
 * value declaration would make the contract demand a runtime export that does
 * not — and should not — exist. The companion `export interface <name>` is
 * left in place so type references elsewhere in the declarations resolve.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param gtypeStructNames - Gtype-struct record names for the namespace.
 * @returns The source with gtype-struct class declarations removed.
 */
export function stripGtypeStructClasses(source: string, gtypeStructNames?: ReadonlySet<string>): string {
    if (gtypeStructNames === undefined || gtypeStructNames.size === 0) return source;

    const matches: Array<{ start: number; end: number }> = [];
    GTYPE_STRUCT_CLASS_PATTERN.lastIndex = 0;
    for (;;) {
        const result = GTYPE_STRUCT_CLASS_PATTERN.exec(source);
        if (result === null) break;
        const name = result[3];
        if (name === undefined || !gtypeStructNames.has(name)) continue;
        const bodyEnd = findMatchingBrace(source, result.index + result[0].length);
        if (bodyEnd < 0) continue;
        const start = result.index + (result[1] ?? "").length;
        let end = bodyEnd + 1;
        if (source[end] === "\n") end += 1;
        matches.push({ start, end });
    }

    if (matches.length === 0) return source;

    const parts: string[] = [];
    let cursor = 0;
    for (const { start, end } of matches) {
        parts.push(source.slice(cursor, start));
        cursor = end;
    }
    parts.push(source.slice(cursor));
    return parts.join("");
}

const MULTI_RETURN_TUPLE_PATTERN = /:\s*\[ \/\* [A-Za-z_$][\w$]* \*\//g;

const findMatchingBracket = (source: string, from: number): number => {
    let depth = 1;
    let i = from;
    while (i < source.length) {
        const ch = source[i];
        if (ch === '"' || ch === "'" || ch === "`") {
            i = skipStringLiteral(source, i, ch);
            continue;
        }
        if (ch === "/" && source[i + 1] === "/") {
            i = skipLineComment(source, i);
            continue;
        }
        if (ch === "/" && source[i + 1] === "*") {
            i = skipBlockComment(source, i);
            continue;
        }
        if (ch === "[") depth++;
        else if (ch === "]") {
            depth--;
            if (depth === 0) return i;
        }
        i++;
    }
    return -1;
};

const EVENT_EMITTER_SIGNAL_LINE = /^[ \t]*(?:on|once|off)\(sigName:[^\n]*\): NodeJS\.EventEmitter[ \t]*\n/gm;
const SYNTHETIC_GTYPE_FIELD_LINE = /^[ \t]*__gtype__: number[ \t]*\n/gm;
const SYNTHETIC_GTYPE_SIGNAL_LINE = /^[ \t]*(?:connect|on|once|off|emit)\(sigName: "notify::__gtype__"[^\n]*\n/gm;
const SYNTHETIC_GTYPE_INSTANCE_LINE = /^[ \t]*gTypeInstance: TypeInstance[ \t]*\n/gm;
const SYNTHETIC_INIT_LINE = /^[ \t]*_init\(config\?: [\w.]*ConstructorProperties\): void[ \t]*\n/gm;
const SYNTHETIC_DISCONNECT_LINE = /^[ \t]*disconnect\((?:id|handlerId): number\): void[ \t]*\n/gm;

/**
 * Removes the `on` / `once` / `off` signal-companion overloads that ts-for-gir
 * emits for every signal-bearing class and interface, together with the
 * synthetic `__gtype__` field and its `notify::__gtype__` signal overloads.
 *
 * The `on` / `once` / `off` overloads describe node-gtk's `EventEmitter`-style
 * aliases and return `NodeJS.EventEmitter`; the gtkx runtime models signal
 * handling through `connect` and `emit` only. The `__gtype__` and
 * `gTypeInstance` fields, the `_init` constructor helper, and the
 * `disconnect(id)` overload are ts-for-gir syntheses that the gtkx runtime
 * does not declare on the class shape. Trimming them keeps the contract
 * aligned with the surface the runtime statically provides.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @returns The source with the node-gtk-only signal surface removed.
 */
export function stripEventEmitterSignalOverloads(source: string): string {
    return source
        .replace(EVENT_EMITTER_SIGNAL_LINE, "")
        .replace(SYNTHETIC_GTYPE_FIELD_LINE, "")
        .replace(SYNTHETIC_GTYPE_SIGNAL_LINE, "")
        .replace(SYNTHETIC_GTYPE_INSTANCE_LINE, "")
        .replace(SYNTHETIC_INIT_LINE, "")
        .replace(SYNTHETIC_DISCONNECT_LINE, "");
}

/**
 * Replaces the comment-labelled multi-return tuple type that ts-for-gir emits
 * for functions and methods with out-parameters
 * (`: [ /* returnType *\/ A, /* out *\/ B ]`) with the looser `: any[]` array
 * type.
 *
 * A generated runtime wrapper collects out-parameters into a plain JavaScript
 * array literal, which TypeScript infers as `any[]` rather than a fixed-length
 * tuple. Relaxing the contract to `any[]` lets the runtime array satisfy the
 * declared shape, matching node-gtk, which returns out-parameters as an array.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @returns The source with multi-return tuples relaxed to `any[]`.
 */
export function relaxMultiReturnTuples(source: string): string {
    const parts: string[] = [];
    let cursor = 0;
    MULTI_RETURN_TUPLE_PATTERN.lastIndex = 0;
    for (;;) {
        const match = MULTI_RETURN_TUPLE_PATTERN.exec(source);
        if (match === null) break;
        const bracketIndex = source.indexOf("[", match.index);
        const closeIndex = findMatchingBracket(source, bracketIndex + 1);
        if (closeIndex < 0) break;
        parts.push(source.slice(cursor, match.index));
        parts.push(": any[]");
        cursor = closeIndex + 1;
        MULTI_RETURN_TUPLE_PATTERN.lastIndex = cursor;
    }
    parts.push(source.slice(cursor));
    return parts.join("");
}

/**
 * Real enum member values for one namespace, keyed enum name then member name.
 */
export type NamespaceEnumValues = ReadonlyMap<string, ReadonlyMap<string, number>>;

/**
 * Real enum member values for every namespace, keyed lowercase namespace
 * identifier (e.g. `"gtk"`, `"cairo"`).
 */
export type EnumValueMap = ReadonlyMap<string, NamespaceEnumValues>;

/**
 * Gtype-struct record names for every namespace, keyed lowercase namespace
 * identifier.
 */
export type GtypeStructMap = ReadonlyMap<string, ReadonlySet<string>>;

/**
 * Result of running every rewrite over a single ts-for-gir output file.
 */
export type RewriteResult = {
    /** Lowercase namespace identifier extracted from the raw filename. */
    namespace: string;
    /** Final `.d.ts` contents after every rewrite has been applied. */
    content: string;
};

/**
 * Applies every rewrite to each per-namespace `.d.ts` produced by ts-for-gir.
 * Files outside the per-namespace pattern (ambient shims, the bare `node-gtk`
 * augmentor, `-import` stubs) are ignored.
 *
 * @param rawFilesByName - ts-for-gir output keyed by raw filename.
 * @param enumValues - Real enum member values used to keep rewritten enum
 *     const-objects accurate; namespaces absent from the map fall back to
 *     ts-for-gir initializers and ordinals.
 * @param gtypeStructNames - Gtype-struct record names whose `export abstract
 *     class` value declarations are stripped to match node-gtk's runtime.
 */
export function loadAndRewrite(
    rawFilesByName: Map<string, string>,
    enumValues?: EnumValueMap,
    gtypeStructNames?: GtypeStructMap,
    classFieldNames?: FieldNameMap,
    signalActionMethodNames?: FieldNameMap,
): RewriteResult[] {
    const results: RewriteResult[] = [];
    for (const [filename, contents] of rawFilesByName) {
        const namespace = namespaceFromRawFilename(filename);
        if (!namespace) continue;
        let source = unwrapOuterNamespace(contents);
        source = rewriteEnumsToConstObjects(source, enumValues?.get(namespace));
        source = stripGtypeStructClasses(source, gtypeStructNames?.get(namespace));
        source = stripClassFields(source, classFieldNames?.get(namespace));
        source = stripPositionalConstructors(source);
        source = stripSuppressedMethods(source, SUPPRESSED_METHOD_NAMES_BY_NAMESPACE.get(namespace));
        source = stripSuppressedMethods(source, signalActionMethodNames?.get(namespace));
        source = relaxMultiReturnTuples(source);
        source = stripEventEmitterSignalOverloads(source);
        source = rewriteNamespaceDeclarations(source);
        source = rewriteDefaultImportsToNamespace(source);
        source = rewriteModuleKeywordToNamespace(source);
        results.push({ namespace, content: source });
    }
    return results;
}
