import { DIVERGENT_OVERRIDE_METHODS_BY_NAMESPACE } from "../../core/utils/method-suppression.js";

const RAW_FILE_PATTERN = /^node-(.+?)-\d+(?:\.\d+)*\.d\.ts$/;

/**
 * Maps a ts-for-gir raw output filename (e.g. `node-glib-2.0.d.ts`) to the
 * lowercase gtkx namespace identifier (e.g. `glib`). Returns `null` for files
 * that do not match the per-namespace output shape — companion `-import`
 * stubs, the `node-ambient` shim, the bare `node-gtk` namespace augmentor.
 */
export function namespaceFromRawFilename(filename: string): string | null {
    const match = RAW_FILE_PATTERN.exec(filename);
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
    const match = NAMESPACE_HEADER_PATTERN.exec(source);
    if (match?.index === undefined) return source;

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

type PendingDeclaration = { lineStart: number; lineDepth: number };

const renderScannedLine = (
    source: string,
    lineStart: number,
    lineEnd: number,
    pendingDecl: PendingDeclaration | null,
): string => {
    if (pendingDecl?.lineDepth === 0) {
        const line = source.slice(pendingDecl.lineStart, lineEnd);
        const trimmed = line.trimStart();
        const indent = line.slice(0, line.length - trimmed.length);
        return `${indent}export ${trimmed}`;
    }
    return source.slice(lineStart, lineEnd);
};

type ScannerState = {
    i: number;
    depth: number;
    inLineComment: boolean;
    inBlockComment: boolean;
};

const isOpaqueRegionStart = (source: string, i: number): boolean => {
    const ch = source[i];
    return ch === "/" || ch === '"' || ch === "'" || ch === "`";
};

const advanceWithinComment = (source: string, state: ScannerState): boolean => {
    if (state.inLineComment) {
        state.i += 1;
        return true;
    }
    if (state.inBlockComment) {
        if (source[state.i] === "*" && source[state.i + 1] === "/") {
            state.inBlockComment = false;
            state.i += 2;
        } else {
            state.i += 1;
        }
        return true;
    }
    return false;
};

const advanceOpaqueRegion = (source: string, state: ScannerState): boolean => {
    const ch = source[state.i];
    if (ch === "/" && source[state.i + 1] === "/") {
        state.inLineComment = true;
        state.i += 2;
        return true;
    }
    if (ch === "/" && source[state.i + 1] === "*") {
        state.inBlockComment = true;
        state.i += 2;
        return true;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
        state.i = skipStringLiteral(source, state.i, ch);
        return true;
    }
    return false;
};

type LineScanContext = {
    out: string[];
    lineStart: number;
    pendingDecl: PendingDeclaration | null;
};

const flushScannedLine = (source: string, state: ScannerState, ctx: LineScanContext): void => {
    ctx.out.push(renderScannedLine(source, ctx.lineStart, state.i, ctx.pendingDecl), "\n");
    state.inLineComment = false;
    ctx.lineStart = state.i + 1;
    ctx.pendingDecl = null;
    state.i += 1;
};

const detectPendingDeclaration = (source: string, state: ScannerState, ctx: LineScanContext): void => {
    if (ctx.pendingDecl || state.depth !== 0) return;
    if (state.i !== firstNonSpaceOnLine(source, ctx.lineStart)) return;
    if (!lineStartsDeclaration(source, state.i)) return;
    ctx.pendingDecl = { lineStart: ctx.lineStart, lineDepth: state.depth };
};

const updateBraceDepth = (state: ScannerState, ch: string | undefined): void => {
    if (ch === "{") state.depth += 1;
    else if (ch === "}") state.depth = Math.max(0, state.depth - 1);
};

const prefixTopLevelDeclarations = (source: string): string => {
    const len = source.length;
    const state: ScannerState = { i: 0, depth: 0, inLineComment: false, inBlockComment: false };
    const ctx: LineScanContext = { out: [], lineStart: 0, pendingDecl: null };

    while (state.i <= len) {
        const ch = state.i < len ? source[state.i] : "\n";

        if (ch === "\n" || state.i === len) {
            const atEnd = state.i === len;
            flushScannedLine(source, state, ctx);
            if (atEnd) break;
            continue;
        }

        if (advanceWithinComment(source, state)) continue;
        if (isOpaqueRegionStart(source, state.i) && advanceOpaqueRegion(source, state)) continue;

        detectPendingDeclaration(source, state, ctx);
        updateBraceDepth(state, ch);
        state.i += 1;
    }

    return ctx.out.join("").replace(/\n$/, "");
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
        const match = /^[ \t]*/.exec(line);
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
export function rewriteEnumsToConstObjects(
    source: string,
    enumValues?: NamespaceEnumValues,
    errorDomainNames?: ReadonlySet<string>,
): string {
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
            replacement: renderEnumReplacement({
                lineStart: lineStart ?? "",
                indent: indent ?? "",
                exportKw: exportKw ?? "",
                leadingDoc: leadingDoc ?? "",
                name,
                body,
                memberValues: enumValues?.get(name),
                isErrorDomain: errorDomainNames?.has(name) ?? false,
            }),
        });
    }

    if (matches.length === 0) return normalized;

    const parts: string[] = [];
    let cursor = 0;
    for (const { start, end, replacement } of matches) {
        parts.push(normalized.slice(cursor, start), replacement);
        cursor = end;
    }
    parts.push(normalized.slice(cursor));
    return parts.join("");
}

type EnumReplacementInput = {
    lineStart: string;
    indent: string;
    exportKw: string;
    leadingDoc: string;
    name: string;
    body: string;
    memberValues?: ReadonlyMap<string, number>;
    isErrorDomain: boolean;
};

const renderEnumReplacement = (input: EnumReplacementInput): string => {
    const { lineStart, indent, exportKw, leadingDoc, name, body, memberValues, isErrorDomain } = input;
    const stripped = body.replace(BLOCK_COMMENT_PATTERN, "").replace(LINE_COMMENT_PATTERN, "");
    let nextOrdinal = 0;
    const memberLines: string[] = [];
    for (const raw of stripped.split(",")) {
        const member = raw.trim();
        if (member.length === 0) continue;
        const [memberName, initializer] = splitEnumMember(member);
        if (!memberName || !/^[A-Za-z_]\w*$/.test(memberName)) continue;
        let literal: string;
        const knownValue =
            memberValues?.get(memberName) ??
            (memberName.startsWith("TODO_") ? memberValues?.get(memberName.slice("TODO_".length)) : undefined);
        if (knownValue !== undefined) {
            literal = String(knownValue);
            nextOrdinal = knownValue + 1;
        } else if (initializer === undefined) {
            literal = String(nextOrdinal);
            nextOrdinal += 1;
        } else {
            literal = initializer;
            const numeric = parseNumericLiteral(initializer);
            if (numeric !== null) nextOrdinal = numeric + 1;
        }
        memberLines.push(`    readonly ${memberName}: ${literal};`);
    }
    const memberBlock = memberLines.join("\n");
    if (isErrorDomain) {
        const hasInstance =
            "{ readonly [Symbol.hasInstance]: (value: unknown) =>" +
            " value is Error & { readonly domain: number; readonly code: number } }";
        return [
            `${lineStart}${indent}${leadingDoc}${exportKw}const ${name}: {`,
            memberBlock,
            `} & ${hasInstance};`,
            `${indent}${exportKw}type ${name} = (typeof ${name})[Exclude<keyof typeof ${name}, symbol>];`,
        ].join("\n");
    }
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
    new RegExp(String.raw`[ \t]*\/\*\*(?:(?!\*\/)[\s\S])*?@${tag}\b(?:(?!\*\/)[\s\S])*?\*\/`, "g");

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
/**
 * Region spanning the single source line that immediately follows a tagged
 * JSDoc block, with `text` trimmed of its bounding whitespace.
 */
type FollowingMemberLine = { start: number; end: number; text: string };

const indexOfLineEnd = (source: string, from: number): number => {
    let i = from;
    while (i < source.length && source[i] !== "\n") i += 1;
    return i;
};

const followingMemberLine = (source: string, docEnd: number): FollowingMemberLine => {
    let start = indexOfLineEnd(source, docEnd);
    if (start < source.length) start += 1;
    const lineEnd = indexOfLineEnd(source, start);
    const end = lineEnd < source.length ? lineEnd + 1 : lineEnd;
    return { start, end, text: source.slice(start, lineEnd) };
};

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
        const member = followingMemberLine(source, docEnd);
        if (memberFilter && !memberFilter(member.text.trim())) {
            pattern.lastIndex = docEnd;
            continue;
        }
        parts.push(source.slice(cursor, lineStart));
        cursor = member.end;
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
 * ts-for-gir bug: it emits a positional `constructor` overload for every GIR
 * `<constructor>`, a shape neither node-gtk nor the gtkx runtime provides.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @returns The source with positional constructor overloads removed.
 */
export function stripPositionalConstructors(source: string): string {
    return stripTaggedMembers(source, "constructor", (memberLine) => memberLine.startsWith("constructor"));
}

const POSITIONAL_CONSTRUCTOR_LINE = /(^|\n)([ \t]*)constructor\((?!\s*\)|\s*config\?:)[^\n]*\n/g;

/**
 * Removes the untagged positional `constructor(...)` overloads ts-for-gir
 * emits for GIR `<interface>` declarations carrying a `<constructor>`.
 *
 * ts-for-gir renders such an interface as a `class` with two constructor
 * overloads: the GObject `constructor(config?: ConstructorProperties)` form
 * and a positional one mirroring the GIR constructor. The gtkx runtime only
 * provides the props-object constructor plus `static` factories, matching
 * node-gtk; the positional overload — emitted without the `@constructor`
 * JSDoc tag {@link stripPositionalConstructors} keys on — is removed here.
 *
 * ts-for-gir bug: it emits a positional `constructor` overload for an
 * `<interface>`'s `<constructor>`, untagged, that the runtime never provides.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @returns The source with untagged positional constructor overloads removed.
 */
export function stripUntaggedPositionalConstructors(source: string): string {
    return source.replace(POSITIONAL_CONSTRUCTOR_LINE, "$1");
}

/**
 * Removes the named instance-method declarations from each `interface <Owner>`
 * and `class <Owner>` block, dropping any JSDoc block that precedes them.
 *
 * The strip is scoped to the named block so an identically named method on an
 * unrelated declaration is left intact. A method-member line is matched by its
 * name followed by either `(` or `<` (the latter covering a generic head).
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param strippedByOwner - Method names keyed by owner class/interface name.
 * @returns The source with the named method declarations removed.
 */
const stripBlockMethods = (source: string, strippedByOwner: ReadonlyMap<string, ReadonlySet<string>>): string => {
    let result = source;
    for (const [owner, methodNames] of strippedByOwner) {
        for (const blockKeyword of ["interface", "class"]) {
            const header = new RegExp(String.raw`(^|\n)[ \t]*export[ \t]+${blockKeyword}[ \t]+${owner}\b[^{]*\{`);
            const headerMatch = header.exec(result);
            if (headerMatch?.index === undefined) continue;
            const bodyStart = headerMatch.index + headerMatch[0].length;
            const bodyEnd = findMatchingBrace(result, bodyStart);
            if (bodyEnd < 0) continue;
            const body = result.slice(bodyStart, bodyEnd);
            result = result.slice(0, bodyStart) + stripMethodsFromBody(body, methodNames) + result.slice(bodyEnd);
        }
    }
    return result;
};

/**
 * Removes the signal-action and virtual-method declarations ts-for-gir emits
 * into a class or interface body for which the gtkx runtime exposes no
 * corresponding instance method.
 *
 * ts-for-gir renders every `<glib:signal>` and every `<virtual-method>` as a
 * camelCased instance method even when no `<method>` of that name exists; the
 * gtkx runtime emits only real `<method>` wrappers, never a signal-action or
 * virtual-method accessor. This is a ts-for-gir bug relative to the node-gtk
 * surface gtkx targets: node-gtk's `makeObject` enumerates only properties,
 * methods, and constants. The drift names are computed per owner as the signal
 * and virtual-method names that have no same-named real method.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param strippedByOwner - Signal-action method names keyed by owner name.
 * @returns The source with the signal-action method declarations removed.
 */
export function stripSignalActionMethods(
    source: string,
    strippedByOwner?: ReadonlyMap<string, ReadonlySet<string>>,
): string {
    if (strippedByOwner === undefined || strippedByOwner.size === 0) return source;
    return stripBlockMethods(source, strippedByOwner);
}

/**
 * Removes the contract declaration of a GIR method that a hand-written FFI
 * runtime override supplies under the same name but with a signature that
 * diverges from the GIR shape.
 *
 * Where a suppressed method whose override preserves the GIR call shape keeps
 * its contract declaration — the override and the declaration merge cleanly —
 * a divergent override cannot: its `declare module` declaration would form an
 * incompatible overload set with the ts-for-gir declaration. Dropping the
 * ts-for-gir declaration leaves the override's declaration as the single,
 * authoritative one. The member still ships on `@gtkx/ffi/<ns>` through the
 * override, and the conformance gate verifies it there.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param strippedByOwner - Divergent-override method names keyed by owner name.
 * @returns The source with the divergent-override declarations removed.
 */
export function stripDivergentOverrideMethods(
    source: string,
    strippedByOwner?: ReadonlyMap<string, ReadonlySet<string>>,
): string {
    if (strippedByOwner === undefined || strippedByOwner.size === 0) return source;
    return stripBlockMethods(source, strippedByOwner);
}

/**
 * Regex fragment matching an optional JSDoc block immediately preceding a
 * member. The inner `(?!\*\/)` guard keeps the lazy body from spanning past
 * the block's own `*\/` into later declarations.
 */
const OPTIONAL_LEADING_JSDOC = String.raw`(?:\/\*\*(?:(?!\*\/)[\s\S])*?\*\/[ \t\n]*)?`;

const stripMethodsFromBody = (body: string, methodNames: ReadonlySet<string>): string => {
    let result = body;
    for (const name of methodNames) {
        const memberLine = new RegExp(String.raw`(^|\n)([ \t]*)${OPTIONAL_LEADING_JSDOC}${name}[<(][^\n]*`);
        const match = memberLine.exec(result);
        if (match?.index === undefined) continue;
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
 * ts-for-gir bug: it surfaces instance-struct `<field>` layout members on the
 * class type, members no GObject-introspection runtime makes accessible.
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
            const header = new RegExp(String.raw`(^|\n)[ \t]*export[ \t]+${blockKeyword}[ \t]+${owner}\b[^{]*\{`);
            const headerMatch = header.exec(result);
            if (headerMatch?.index === undefined) continue;
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
        const memberLine = new RegExp(String.raw`(^|\n)([ \t]*)${OPTIONAL_LEADING_JSDOC}${name}(\?)?:[ \t][^\n]*`);
        const match = memberLine.exec(result);
        if (match?.index === undefined) continue;
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
 * ts-for-gir bug: it emits a runtime `class` value for each gtype-struct
 * vtable record, an export no GObject-introspection runtime provides.
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

const ANONYMOUS_COMPOSITE_CLASS_PATTERN =
    /(^|\n)([ \t]*)export[ \t]+(?:abstract[ \t]+)?class[ \t]+_\w+__\w+__(?:union|struct)\b[^{]*\{/g;

/**
 * Removes the `export class _<Owner>__<field>__union` value declarations that
 * ts-for-gir synthesises for anonymous unions and structs nested inside a
 * record's field layout.
 *
 * These synthetic names exist only so the field's type has a referenceable
 * symbol; node-gtk never exposes the anonymous composite as a namespace
 * member. The companion `export interface` is left in place so the field
 * type still resolves.
 *
 * ts-for-gir bug: it emits a runtime `class` value for each synthetic
 * anonymous-composite name, an export the runtime never provides.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @returns The source with synthetic anonymous-composite classes removed.
 */
export function stripAnonymousCompositeClasses(source: string): string {
    const matches: Array<{ start: number; end: number }> = [];
    ANONYMOUS_COMPOSITE_CLASS_PATTERN.lastIndex = 0;
    for (;;) {
        const result = ANONYMOUS_COMPOSITE_CLASS_PATTERN.exec(source);
        if (result === null) break;
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

const GTYPE_CONSTANT_PATTERN = /^(export const [A-Z][A-Z0-9_]*: )GType(\s*)$/gm;

const NUMERIC_CONSTANT_PATTERN = /^(export const (\w+): )([^\n]+?)(\s*)$/gm;
const PRIMITIVE_CONSTANT_TYPES: ReadonlySet<string> = new Set(["number", "string", "boolean"]);

/**
 * Relaxes a top-level `export const <NAME>: <Type>` declaration to `: number`
 * when the GIR `<constant>` carries a numeric value.
 *
 * ts-for-gir types some numeric constants after an opaque GIR type, but the
 * gtkx runtime emits the numeric literal from the GIR `<constant>` value, as
 * node-gtk does. The looser type keeps the contract aligned with the runtime.
 *
 * ts-for-gir bug: it types a plain numeric GIR `<constant>` after a nominal
 * GIR type rather than after the numeric literal value the constant holds.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param numericConstants - Names of numeric-valued constants for the namespace.
 * @returns The source with numeric constant types relaxed.
 */
export function relaxNumericConstants(source: string, numericConstants?: ReadonlySet<string>): string {
    if (numericConstants === undefined || numericConstants.size === 0) return source;
    return source.replace(NUMERIC_CONSTANT_PATTERN, (match, prefix: string, name: string, type: string, ws: string) => {
        if (!numericConstants.has(name) || PRIMITIVE_CONSTANT_TYPES.has(type.trim())) return match;
        return `${prefix}number${ws}`;
    });
}

/**
 * Relaxes a top-level `export const <NAME>: GType` declaration to `: number`.
 *
 * ts-for-gir types a handful of plain numeric type-system bitmask constants as
 * `GType`, but the gtkx runtime emits them as the numeric literal taken
 * straight from the GIR `<constant>` value. node-gtk likewise exposes them as
 * plain numbers, so the looser type keeps the contract aligned with the
 * runtime surface.
 *
 * ts-for-gir bug: it types these numeric type-system constants as the nominal
 * `GType` rather than as the plain `number` their GIR value is.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @returns The source with `GType`-typed numeric constants relaxed.
 */
export function relaxGtypeConstants(source: string): string {
    return source.replace(GTYPE_CONSTANT_PATTERN, "$1number$2");
}

const GTYPE_OBJECT_ALIAS_PATTERN =
    /export type GType<T = unknown> = \{\s*__type__\(arg: never\): T\s*name: string\s*\};/;
const TYPE_INVALID_DECLARATION_PATTERN = /export let TYPE_INVALID(\s*): 0n/;

/**
 * Rewrites the `GType` type alias from the ts-for-gir phantom-object shape
 * to a branded number — `number & { readonly __gtype__?: T }`.
 *
 * ts-for-gir declares `GType` as an object type carrying a phantom `__type__`
 * method, but a GType is a plain numeric `gsize` at runtime. The branded form
 * keeps the phantom `<T>` payload the typed `typeFromName` overloads depend on
 * while making a runtime `number` directly assignable to a `GType` slot — and
 * a `GType` usable as an arithmetic operand, `Map` key, or `=== 0` operand.
 *
 * The companion `TYPE_INVALID` declaration is retyped from the `0n` bigint
 * literal to `GType` so the typed `typeFromName("void")` overload yields a
 * `GType` consistent with the numeric runtime value.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @returns The source with the `GType` alias rewritten to a branded number.
 */
export function rewriteGTypeDeclaration(source: string): string {
    return source
        .replace(GTYPE_OBJECT_ALIAS_PATTERN, "export type GType<T = unknown> = number & { readonly __gtype__?: T };")
        .replace(TYPE_INVALID_DECLARATION_PATTERN, "export let TYPE_INVALID$1: GType");
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

/**
 * Matches the header of an exported `class` or `interface` block, capturing
 * the leading newline (or start) in group 1 and the type name in group 2.
 */
const TYPE_BLOCK_HEADER = /(^|\n)[ \t]*export[ \t]+(?:abstract[ \t]+)?(?:interface|class)[ \t]+(\w+)\b[^{]*\{/g;

const EVENT_EMITTER_SIGNAL_RETURN = /(\n[ \t]*(?:on|once|off)\(sigName:[^\n]*\): )NodeJS\.EventEmitter\b/g;
const SYNTHETIC_GTYPE_FIELD_LINE = /^[ \t]*__gtype__: number[ \t]*\n/gm;
const SYNTHETIC_GTYPE_SIGNAL_LINE = /^[ \t]*(?:connect|on|once|off|emit)\(sigName: "notify::__gtype__"[^\n]*\n/gm;
const SYNTHETIC_GTYPE_INSTANCE_LINE = /^[ \t]*gTypeInstance: TypeInstance[ \t]*\n/gm;
const SYNTHETIC_INIT_LINE = /^[ \t]*_init\(config\?: [\w.]*ConstructorProperties\): void[ \t]*\n/gm;

/**
 * Aligns the ts-for-gir signal-companion surface with the gtkx runtime.
 *
 * ts-for-gir emits `on` / `once` / `off` signal aliases typed against
 * `NodeJS.EventEmitter`; the gtkx runtime supplies them through hand-written
 * GObject overrides that return the receiver for chaining. The
 * `NodeJS.EventEmitter` return type is a ts-for-gir bug relative to the gtkx
 * runtime — its `on` / `once` / `off` are not Node `EventEmitter` aliases — so
 * it is corrected to the declaring class or interface, the type the runtime
 * override actually returns, scoped per owner block. The members themselves
 * are kept because they are genuine public API.
 *
 * ts-for-gir also synthesizes a `_init(config?)` constructor helper, a
 * `gTypeInstance: TypeInstance` field, a bare `__gtype__: number` field, and
 * `notify::__gtype__` signal overloads. `_init`, `gTypeInstance` and the
 * `notify::__gtype__` signal are GJS-isms with no node-gtk or gtkx counterpart
 * and are removed. The runtime-stamped `__gtype__` is genuine API, but the
 * hand-written GObject override declares it authoritatively — as a `readonly`
 * branded `GType` — so the loosely-typed ts-for-gir `__gtype__: number` line
 * is removed in favor of that override declaration.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @returns The source with the signal-companion surface aligned to the runtime.
 */
export function stripEventEmitterSignalOverloads(source: string): string {
    let result = source;
    TYPE_BLOCK_HEADER.lastIndex = 0;
    for (;;) {
        const header = TYPE_BLOCK_HEADER.exec(result);
        if (header === null) break;
        const ownerName = header[2];
        if (ownerName === undefined) continue;
        const bodyStart = header.index + header[0].length;
        const bodyEnd = findMatchingBrace(result, bodyStart);
        if (bodyEnd < 0) continue;
        const body = result.slice(bodyStart, bodyEnd);
        const newBody = body.replace(EVENT_EMITTER_SIGNAL_RETURN, `$1${ownerName}`);
        if (newBody === body) continue;
        result = result.slice(0, bodyStart) + newBody + result.slice(bodyEnd);
        TYPE_BLOCK_HEADER.lastIndex = bodyStart + newBody.length;
    }
    return result
        .replace(SYNTHETIC_GTYPE_FIELD_LINE, "")
        .replace(SYNTHETIC_GTYPE_SIGNAL_LINE, "")
        .replace(SYNTHETIC_GTYPE_INSTANCE_LINE, "")
        .replace(SYNTHETIC_INIT_LINE, "");
}

/**
 * Counts the top-level entries of a tuple-type body, treating nested `<>`,
 * `()`, `[]`, `{}`, string literals and block comments as opaque.
 *
 * @param body - The text between a tuple type's brackets.
 * @returns The number of comma-separated entries.
 */
const OPENING_BRACKETS = new Set(["<", "(", "[", "{"]);
const CLOSING_BRACKETS = new Set([">", ")", "]", "}"]);
const TUPLE_WHITESPACE = new Set([" ", "\t", "\r", "\n"]);

type TupleScanState = { entries: number; depth: number; hasContent: boolean };

const skipTupleOpaqueRegion = (body: string, i: number, ch: string): number | null => {
    if (ch === '"' || ch === "'" || ch === "`") return skipStringLiteral(body, i, ch);
    if (ch === "/" && body[i + 1] === "*") return skipBlockComment(body, i);
    if (ch === "/" && body[i + 1] === "/") return skipLineComment(body, i);
    return null;
};

const applyTupleChar = (state: TupleScanState, ch: string): void => {
    if (OPENING_BRACKETS.has(ch)) {
        state.depth++;
        state.hasContent = true;
    } else if (CLOSING_BRACKETS.has(ch)) {
        state.depth = Math.max(0, state.depth - 1);
    } else if (ch === "," && state.depth === 0) {
        state.entries++;
    } else if (!TUPLE_WHITESPACE.has(ch)) {
        state.hasContent = true;
    }
};

const countTupleEntries = (body: string): number => {
    const state: TupleScanState = { entries: 0, depth: 0, hasContent: false };
    let i = 0;
    while (i < body.length) {
        const ch = body[i];
        if (ch === undefined) break;
        const skipTo = skipTupleOpaqueRegion(body, i, ch);
        if (skipTo !== null) {
            if (ch !== "/") state.hasContent = true;
            i = skipTo;
            continue;
        }
        applyTupleChar(state, ch);
        i++;
    }
    return state.hasContent ? state.entries + 1 : 0;
};

/**
 * Replaces the comment-labelled multi-return tuple type that ts-for-gir emits
 * for functions and methods with out-parameters
 * (`: [ /* returnType *\/ A, /* out *\/ B ]`) with a fixed-length tuple of
 * `any` of the same arity (`: [any, any]`).
 *
 * A generated runtime wrapper collects out-parameters into a plain JavaScript
 * array literal whose length is fixed by the call. Preserving the tuple arity
 * keeps the contract's call-convention shape — how many values the caller
 * receives — verifiable, while leaving the element types as `any` so the
 * untyped, marshaled runtime values still satisfy the contract.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @returns The source with multi-return tuples reduced to `any`-element tuples.
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
        const arity = countTupleEntries(source.slice(bracketIndex + 1, closeIndex));
        const tuple = arity > 0 ? `[${Array.from({ length: arity }, () => "any").join(", ")}]` : "any[]";
        parts.push(source.slice(cursor, match.index), `: ${tuple}`);
        cursor = closeIndex + 1;
        MULTI_RETURN_TUPLE_PATTERN.lastIndex = cursor;
    }
    parts.push(source.slice(cursor));
    return parts.join("");
}

const CONFLICT_COMMENT = /\/\/ Has conflict: ([A-Za-z_$][\w$]*)\(([^\n]*)\): ([^\n]+)(?:\r?\n)/g;

/**
 * Corrects method signatures that ts-for-gir merged from a GIR
 * `<virtual-method>` over the GIR `<method>` of the same name.
 *
 * When a class declares both a `<method>` and a same-named `<virtual-method>`
 * with differing signatures, ts-for-gir keeps the virtual method's signature as
 * the active member and demotes the real method's signature to a
 * `// Has conflict:` comment. The generated runtime binds the C `<method>`,
 * whose parameter list and return type are authoritative, so the active member
 * of that name is rewritten — within its declaring class or interface block —
 * to the parameter list and return type recorded in the conflict comment.
 *
 * ts-for-gir bug: on a `<method>`/`<virtual-method>` name clash it promotes the
 * virtual method's signature over the real `<method>` the runtime actually
 * binds, leaving the authoritative signature only in a comment.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @returns The source with conflict-comment signatures honored.
 */
export function honorConflictSignatures(source: string): string {
    let result = source;
    TYPE_BLOCK_HEADER.lastIndex = 0;
    for (;;) {
        const header = TYPE_BLOCK_HEADER.exec(result);
        if (header === null) break;
        const bodyStart = header.index + header[0].length;
        const bodyEnd = findMatchingBrace(result, bodyStart);
        if (bodyEnd < 0) continue;
        const body = result.slice(bodyStart, bodyEnd);
        const newBody = honorConflictSignaturesInBlock(body);
        if (newBody !== body) {
            result = result.slice(0, bodyStart) + newBody + result.slice(bodyEnd);
        }
        TYPE_BLOCK_HEADER.lastIndex = bodyStart + newBody.length;
    }
    return result;
}

/**
 * Rewrites the active member of every `// Has conflict:` name within a single
 * class or interface body to the parameter list and return type recorded in
 * the conflict comment.
 *
 * @param body - The class or interface body text.
 * @returns The body with conflict-comment signatures applied.
 */
const honorConflictSignaturesInBlock = (body: string): string => {
    let result = body;
    CONFLICT_COMMENT.lastIndex = 0;
    for (;;) {
        const match = CONFLICT_COMMENT.exec(body);
        if (match === null) break;
        const name = match[1];
        const params = match[2];
        const returnType = match[3];
        if (name === undefined || params === undefined || returnType === undefined) continue;
        const memberPattern = new RegExp(String.raw`(\n[ \t]*${escapeRegExp(name)})\([^\n]*\): [^\n]+`);
        result = result.replace(memberPattern, `$1(${params}): ${returnType}`);
    }
    return result;
};

/**
 * Escapes regular-expression metacharacters in a literal string fragment.
 *
 * @param value - The literal text to escape.
 * @returns The text safe for embedding in a `RegExp`.
 */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

const METHOD_CONNECT_LINE = /(\n[ \t]*)connect\((?!sigName:)([^\n]*)/g;

/**
 * Renamed `connect`-method names for one namespace, keyed owner type name.
 */
export type NamespaceConnectRenames = ReadonlyMap<string, string>;

/**
 * Renamed `connect`-method names for every namespace, keyed lowercase
 * namespace identifier.
 */
export type ConnectRenameMap = ReadonlyMap<string, NamespaceConnectRenames>;

/**
 * Renames the GIR `connect` method in the contract to match the gtkx runtime.
 *
 * GObject-derived types carry a `connect` signal-subscription method, so the
 * runtime renames any colliding GIR `<method>` named `connect` to an
 * owner-prefixed name. This rewrite applies the runtime's rename in the
 * contract, resolved per type so a flattened inherited method takes its
 * declaring ancestor's name.
 *
 * This is a deliberate gtkx divergence from node-gtk, not a ts-for-gir bug
 * fix. node-gtk lets a colliding GIR `<method>` named `connect` overwrite the
 * inherited signal-subscription `connect` on the prototype, so one of the two
 * — typically the signal `connect` — becomes unreachable (e.g. on
 * `Gio.Socket`). gtkx instead keeps both: the colliding GIR method is exposed
 * under an owner-prefixed name and the signal `connect` stays in place. The
 * contract is rewritten to reflect that gtkx-specific reachable surface.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param renames - Renamed `connect` names keyed owner type name.
 * @returns The source with method-`connect` declarations renamed.
 */
export function renameConflictingConnectMethods(source: string, renames?: NamespaceConnectRenames): string {
    if (renames === undefined || renames.size === 0) return source;
    let result = source;
    TYPE_BLOCK_HEADER.lastIndex = 0;
    for (;;) {
        const header = TYPE_BLOCK_HEADER.exec(result);
        if (header === null) break;
        const ownerName = header[2];
        if (ownerName === undefined) continue;
        const renamed = renames.get(ownerName);
        if (renamed === undefined) continue;
        const bodyStart = header.index + header[0].length;
        const bodyEnd = findMatchingBrace(result, bodyStart);
        if (bodyEnd < 0) continue;
        const body = result.slice(bodyStart, bodyEnd);
        const newBody = body.replace(METHOD_CONNECT_LINE, `$1${renamed}($2`);
        if (newBody === body) continue;
        result = result.slice(0, bodyStart) + newBody + result.slice(bodyEnd);
        TYPE_BLOCK_HEADER.lastIndex = bodyStart + newBody.length;
    }
    return result;
}

/**
 * One method that the gtkx runtime renamed away from a collision with an
 * inherited member of the same name.
 */
export type MethodShadowRename = {
    /** The camelCased GIR method name as ts-for-gir emits it. */
    original: string;
    /** The owner-prefixed name the runtime exposes the method under. */
    renamed: string;
    /** The method's declared parameter count, used to pick the right overload. */
    arity: number;
};

/**
 * Method shadow-renames for one namespace, keyed owner type name.
 */
export type NamespaceMethodShadowRenames = ReadonlyMap<string, readonly MethodShadowRename[]>;

/**
 * Method shadow-renames for every namespace, keyed lowercase namespace
 * identifier.
 */
export type MethodShadowRenameMap = ReadonlyMap<string, NamespaceMethodShadowRenames>;

/**
 * Renames, in the contract, every class method the gtkx runtime renamed because
 * its name collided with an inherited member.
 *
 * The gtkx codegen renames a class `<method>` whose name matches a method
 * inherited from an ancestor class or interface to an owner-prefixed name.
 * ts-for-gir flattens both the inherited member and the colliding method into
 * the subclass body as overloads of the original name; this rewrite renames the
 * colliding overload — identified within its declaring class block by its
 * declared parameter count — to the name the runtime exposes.
 *
 * This is a deliberate gtkx divergence from node-gtk, not a ts-for-gir bug
 * fix. node-gtk lets a subclass's colliding GIR `<method>` shadow the inherited
 * member of the same name on the prototype, leaving the inherited one
 * unreachable. gtkx keeps both: the collider is exposed under an owner-prefixed
 * name and the inherited member stays in place. The clash is only ever between
 * two distinct C functions that happen to share a GIR `name`; a true
 * polymorphic override — the same method re-listed by a subclass — is not a
 * clash and is not renamed, because the GIR `<class>` element lists only the
 * class's own `<method>` entries and never re-declares an inherited method.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param renames - Method shadow-renames keyed owner type name.
 * @returns The source with shadowed methods renamed.
 */
export function renameShadowedMethods(source: string, renames?: NamespaceMethodShadowRenames): string {
    if (renames === undefined || renames.size === 0) return source;
    let result = source;
    TYPE_BLOCK_HEADER.lastIndex = 0;
    for (;;) {
        const header = TYPE_BLOCK_HEADER.exec(result);
        if (header === null) break;
        const ownerName = header[2];
        if (ownerName === undefined) continue;
        const ownerRenames = renames.get(ownerName);
        if (ownerRenames === undefined || ownerRenames.length === 0) continue;
        const bodyStart = header.index + header[0].length;
        const bodyEnd = findMatchingBrace(result, bodyStart);
        if (bodyEnd < 0) continue;
        const body = result.slice(bodyStart, bodyEnd);
        let newBody = body;
        for (const rename of ownerRenames) {
            newBody = renameMethodOverload(newBody, rename);
        }
        if (newBody !== body) {
            result = result.slice(0, bodyStart) + newBody + result.slice(bodyEnd);
        }
        TYPE_BLOCK_HEADER.lastIndex = bodyStart + newBody.length;
    }
    return result;
}

/**
 * Renames the single declaration of `rename.original` within a class body whose
 * declared parameter count matches `rename.arity`, leaving same-named inherited
 * overloads untouched.
 *
 * @param body - The class body text.
 * @param rename - The shadow-rename to apply.
 * @returns The body with the matching overload renamed.
 */
const renameMethodOverload = (body: string, rename: MethodShadowRename): string => {
    const pattern = new RegExp(String.raw`(\n[ \t]*)${escapeRegExp(rename.original)}\(`, "g");
    for (;;) {
        const match = pattern.exec(body);
        if (match === null) return body;
        const parenStart = match.index + match[0].length - 1;
        const parenEnd = findMatchingParen(body, parenStart + 1);
        if (parenEnd < 0) continue;
        const params = body.slice(parenStart + 1, parenEnd);
        const arity = params.trim().length === 0 ? 0 : splitParameterList(params).length;
        if (arity !== rename.arity) continue;
        return `${body.slice(0, match.index)}${match[1]}${rename.renamed}(${body.slice(match.index + match[0].length)}`;
    }
};

const OPTIONAL_INOUT_RETURN = /\(([^\n]*)\): (\/\* (\w+) \*\/ [\w.]+)(?<suffix>(?:\[\])?)(?=\r?\n)/g;

/**
 * Relaxes the return type of a callable whose sole out/inout-derived return
 * comes from an optional parameter.
 *
 * ts-for-gir types such a return after the parameter's element type, but the
 * generated runtime yields `null` when the optional parameter is omitted. The
 * return type is widened with `| null` so the runtime value satisfies it.
 *
 * ts-for-gir bug: it types an optional-parameter-derived out/inout return as
 * non-nullable, ignoring the `null` the runtime yields when the parameter is
 * omitted.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @returns The source with optional-inout returns made nullable.
 */
export function relaxOptionalInoutReturns(source: string): string {
    return source.replace(
        OPTIONAL_INOUT_RETURN,
        (match, params: string, returnType: string, paramName: string, suffix: string) => {
            const optionalParam = new RegExp(String.raw`\b${escapeRegExp(paramName)}\?:`);
            if (!optionalParam.test(params)) return match;
            return `(${params}): ${returnType}${suffix} | null`;
        },
    );
}

/**
 * One GIO-style async callable paired with its companion `*_finish` callable,
 * each named as the contract member that declares it.
 */
export type AsyncMemberEntry = {
    /** The contract member name of the `*_async` callable. */
    asyncMember: string;
    /** The contract member name of the companion `*_finish` callable. */
    finishMember: string;
};

/**
 * Async callable entries for one namespace, keyed by owner type name. The empty
 * string keys the namespace-level standalone functions.
 */
export type NamespaceAsyncMembers = ReadonlyMap<string, readonly AsyncMemberEntry[]>;

/**
 * Async callable entries for every namespace, keyed lowercase namespace
 * identifier.
 */
export type AsyncMemberMap = ReadonlyMap<string, NamespaceAsyncMembers>;

/**
 * Extracts the declared return type of a contract member, searching the given
 * region of the source.
 *
 * @param region - The source region to search (a class/interface body, or the
 *     whole file for namespace-level functions).
 * @param memberName - The member to locate.
 * @param isFunction - Whether the member is a top-level `export function`.
 * @returns The declared return type text, or `null` when the member is absent.
 */
const findMemberReturnType = (region: string, memberName: string, isFunction: boolean): string | null => {
    const head = isFunction
        ? String.raw`(?:^|\n)[ \t]*export[ \t]+function[ \t]+${escapeRegExp(memberName)}\s*\(`
        : String.raw`(?:^|\n)[ \t]*${escapeRegExp(memberName)}\s*\(`;
    const headMatch = new RegExp(head).exec(region);
    if (headMatch?.index === undefined) return null;
    const parenStart = region.indexOf("(", headMatch.index);
    if (parenStart < 0) return null;
    const parenEnd = findMatchingParen(region, parenStart + 1);
    if (parenEnd < 0) return null;
    const afterParams = region.slice(parenEnd + 1);
    const returnMatch = /^\s*:\s*([^\n;]+)/.exec(afterParams);
    if (returnMatch?.[1] === undefined) return null;
    return returnMatch[1].trim().replace(/;$/, "").trim();
};

/**
 * Returns the index of the `)` matching the implicit `(` at `from - 1`,
 * treating strings and comments as opaque. Returns `-1` when unmatched.
 */
const findMatchingParen = (source: string, from: number): number => {
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
        if (ch === "(") depth++;
        else if (ch === ")") {
            depth--;
            if (depth === 0) return i;
        }
        i++;
    }
    return -1;
};

/**
 * Rewrites an async callable's declaration: drops its trailing
 * `GAsyncReadyCallback` parameter and retypes its return from `void` to
 * `Promise<finishReturnType>`.
 *
 * The async callable is matched within `region` by its member name followed by
 * a parameter list whose final entry is the `AsyncReadyCallback` parameter.
 */
const rewriteAsyncMemberDeclaration = (
    region: string,
    memberName: string,
    finishReturnType: string,
    isFunction: boolean,
): string => {
    const head = isFunction
        ? String.raw`((?:^|\n)[ \t]*export[ \t]+function[ \t]+${escapeRegExp(memberName)}\s*)\(`
        : String.raw`((?:^|\n)[ \t]*${escapeRegExp(memberName)}\s*)\(`;
    const pattern = new RegExp(head, "g");
    let result = region;
    for (;;) {
        const match = pattern.exec(result);
        if (match === null) break;
        const headText = match[1] ?? "";
        const parenStart = match.index + headText.length;
        const parenEnd = findMatchingParen(result, parenStart + 1);
        if (parenEnd < 0) {
            pattern.lastIndex = parenStart + 1;
            continue;
        }
        const params = result.slice(parenStart + 1, parenEnd);
        const newParams = dropAsyncCallbackParameter(params);
        if (newParams === null) {
            pattern.lastIndex = parenEnd + 1;
            continue;
        }
        const afterParams = result.slice(parenEnd + 1);
        const returnMatch = /^\s*:\s*[^\n;]+/.exec(afterParams);
        const returnLength = returnMatch ? returnMatch[0].length : 0;
        const replacement = `${headText}(${newParams}): Promise<${finishReturnType}>`;
        result = result.slice(0, match.index) + replacement + result.slice(parenEnd + 1 + returnLength);
        pattern.lastIndex = match.index + replacement.length;
    }
    return result;
};

/**
 * Removes the trailing `GAsyncReadyCallback` parameter from an async callable's
 * parameter list.
 *
 * ts-for-gir types that parameter either as `AsyncReadyCallback` — possibly
 * with a following `user_data` parameter — or, where the callable is merged
 * from a GIR `<virtual-method>`, as a trailing closure parameter. Both forms
 * are recognized; the closure form drops only the final parameter so an
 * earlier progress-callback parameter is retained.
 *
 * @param params - The declared parameter list.
 * @returns The parameter list without the ready-callback parameter, or `null`
 *     when no ready-callback parameter is present.
 */
const dropAsyncCallbackParameter = (params: string): string | null => {
    const entries = splitParameterList(params);
    if (entries.some((entry) => /\bAsyncReadyCallback\b/.test(entry))) {
        return entries
            .filter((entry) => !/\bAsyncReadyCallback\b/.test(entry) && !/^\s*user_?[dD]ata\b/.test(entry))
            .join(", ");
    }
    const last = entries.at(-1);
    if (last !== undefined && /:\s*[\w.]*Closure\b/.test(last)) {
        return entries.slice(0, -1).join(", ");
    }
    return null;
};

/**
 * Splits a parameter-list string into top-level parameter entries, treating
 * nested `<>`, `()`, `[]`, `{}` and string literals as opaque.
 */
const splitParameterList = (params: string): string[] => {
    const entries: string[] = [];
    let depth = 0;
    let start = 0;
    let i = 0;
    while (i < params.length) {
        const ch = params[i];
        if (ch === '"' || ch === "'" || ch === "`") {
            i = skipStringLiteral(params, i, ch);
            continue;
        }
        if (ch === "<" || ch === "(" || ch === "[" || ch === "{") depth++;
        else if (ch === ">" || ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
        else if (ch === "," && depth === 0) {
            entries.push(params.slice(start, i).trim());
            start = i + 1;
        }
        i++;
    }
    const tail = params.slice(start).trim();
    if (tail.length > 0) entries.push(tail);
    return entries;
};

/**
 * Rewrites every GIO-style async callable declaration in the contract so it
 * matches the Promise-returning runtime wrapper.
 *
 * Each `*_async` member's trailing `GAsyncReadyCallback` parameter is dropped
 * and its return type is changed from `void` to `Promise<R>`, where `R` is the
 * declared return type of its companion `*_finish` member. Class and interface
 * members are rewritten within their owner block; standalone functions are
 * rewritten at the file's top level.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param asyncMembers - Async callable entries keyed by owner type name.
 * @returns The source with async callable signatures made Promise-returning.
 */
/**
 * Applies `transformBody` to the body of the `class` or `interface` block
 * named `owner`, for each block keyword. The transform receives the current
 * body text and returns the rewritten body.
 *
 * @param source - The source containing the owner blocks.
 * @param owner - The class or interface name to locate.
 * @param transformBody - The body-text transform applied within the block.
 * @returns The source with the located block bodies transformed.
 */
const rewriteOwnerBlockBodies = (source: string, owner: string, transformBody: (body: string) => string): string => {
    let result = source;
    for (const blockKeyword of ["interface", "class"]) {
        const header = new RegExp(
            String.raw`(^|\n)[ \t]*export[ \t]+(?:abstract[ \t]+)?${blockKeyword}[ \t]+${owner}\b[^{]*\{`,
        );
        const headerMatch = header.exec(result);
        if (headerMatch?.index === undefined) continue;
        const bodyStart = headerMatch.index + headerMatch[0].length;
        const bodyEnd = findMatchingBrace(result, bodyStart);
        if (bodyEnd < 0) continue;
        const body = result.slice(bodyStart, bodyEnd);
        result = result.slice(0, bodyStart) + transformBody(body) + result.slice(bodyEnd);
    }
    return result;
};

const rewriteAsyncEntriesInRegion = (
    region: string,
    entries: readonly AsyncMemberEntry[],
    isFunction: boolean,
): string => {
    let result = region;
    for (const { asyncMember, finishMember } of entries) {
        const finishReturn = findMemberReturnType(result, finishMember, isFunction);
        if (finishReturn === null) continue;
        result = rewriteAsyncMemberDeclaration(result, asyncMember, finishReturn, isFunction);
    }
    return result;
};

export function rewriteAsyncSignatures(source: string, asyncMembers?: NamespaceAsyncMembers): string {
    if (asyncMembers === undefined || asyncMembers.size === 0) return source;

    let result = source;

    const functionEntries = asyncMembers.get("");
    if (functionEntries) {
        result = rewriteAsyncEntriesInRegion(result, functionEntries, true);
    }

    for (const [owner, entries] of asyncMembers) {
        if (owner === "" || entries.length === 0) continue;
        result = rewriteOwnerBlockBodies(result, owner, (body) => rewriteAsyncEntriesInRegion(body, entries, false));
    }

    return result;
}

/**
 * One contract member carrying a keyed `GHashTable` parameter or return,
 * together with the `Map<K, V>` type the gtkx runtime exposes for it.
 */
export type HashTableMemberEntry = {
    /** The contract member name declaring the keyed `GHashTable`. */
    member: string;
    /** Whether the member is a top-level `export function`. */
    isFunction: boolean;
    /** The `Map<K, V>` TypeScript type the runtime marshals the table to. */
    mapType: string;
};

/**
 * Keyed-`GHashTable` member entries for one namespace, keyed by owner type
 * name. The empty string keys the namespace-level standalone functions.
 */
export type NamespaceHashTableMembers = ReadonlyMap<string, readonly HashTableMemberEntry[]>;

/**
 * Keyed-`GHashTable` member entries for every namespace, keyed lowercase
 * namespace identifier.
 */
export type HashTableMemberMap = ReadonlyMap<string, NamespaceHashTableMembers>;

const HASH_TABLE_TYPE_TOKEN = /\b(?:GLib\.)?HashTable\b/g;

/**
 * Replaces every `GLib.HashTable` / `HashTable` token in a member declaration's
 * parameter list and return annotation with the supplied `Map<K, V>` type.
 *
 * @param region - The source region containing the member declaration.
 * @param entry - The member name, kind, and `Map<K, V>` substitution.
 * @returns The region with the member's `GHashTable` tokens retyped.
 */
const rewriteHashTableMemberDeclaration = (region: string, entry: HashTableMemberEntry): string => {
    const head = entry.isFunction
        ? String.raw`((?:^|\n)[ \t]*export[ \t]+function[ \t]+${escapeRegExp(entry.member)}\s*)\(`
        : String.raw`((?:^|\n)[ \t]*(?:static[ \t]+)?${escapeRegExp(entry.member)}\s*)\(`;
    const pattern = new RegExp(head, "g");
    let result = region;
    for (;;) {
        const match = pattern.exec(result);
        if (match === null) break;
        const headText = match[1] ?? "";
        const parenStart = match.index + headText.length;
        const parenEnd = findMatchingParen(result, parenStart + 1);
        if (parenEnd < 0) {
            pattern.lastIndex = parenStart + 1;
            continue;
        }
        const afterParams = result.slice(parenEnd + 1);
        const returnMatch = /^\s*:\s*[^\n;]+/.exec(afterParams);
        const returnLength = returnMatch ? returnMatch[0].length : 0;
        const declarationEnd = parenEnd + 1 + returnLength;
        const declaration = result.slice(parenStart, declarationEnd);
        if (!HASH_TABLE_TYPE_TOKEN.test(declaration)) {
            pattern.lastIndex = declarationEnd;
            continue;
        }
        const rewritten = declaration.replace(HASH_TABLE_TYPE_TOKEN, entry.mapType);
        result = result.slice(0, parenStart) + rewritten + result.slice(declarationEnd);
        pattern.lastIndex = parenStart + rewritten.length;
    }
    return result;
};

/**
 * Retypes every keyed-`GHashTable` parameter and return in the contract to the
 * `Map<K, V>` type the gtkx runtime actually marshals.
 *
 * ts-for-gir renders a keyed `GHashTable` as the bare `GLib.HashTable` opaque
 * type, but the runtime converts such tables to and from a `Map<K, V>`. Each
 * affected member is retyped within its owner block; standalone functions are
 * retyped at the file's top level. The opaque `GLib.HashTable` API itself —
 * whose tables carry `gpointer` keys and values — is left untouched.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param hashTableMembers - Keyed-`GHashTable` entries keyed by owner type name.
 * @returns The source with keyed `GHashTable` signatures retyped to `Map`.
 */
const rewriteHashTableEntriesInRegion = (region: string, entries: readonly HashTableMemberEntry[]): string => {
    let result = region;
    for (const entry of entries) {
        result = rewriteHashTableMemberDeclaration(result, entry);
    }
    return result;
};

export function rewriteHashTableTypes(source: string, hashTableMembers?: NamespaceHashTableMembers): string {
    if (hashTableMembers === undefined || hashTableMembers.size === 0) return source;

    let result = source;

    const functionEntries = hashTableMembers.get("");
    if (functionEntries) {
        result = rewriteHashTableEntriesInRegion(result, functionEntries);
    }

    for (const [owner, entries] of hashTableMembers) {
        if (owner === "" || entries.length === 0) continue;
        result = rewriteOwnerBlockBodies(result, owner, (body) => rewriteHashTableEntriesInRegion(body, entries));
    }

    return result;
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
 * Error-domain enum names for every namespace, keyed lowercase namespace
 * identifier. Enums named here are rewritten with an `instanceof`-capable
 * `[Symbol.hasInstance]` member.
 */
export type ErrorDomainMap = ReadonlyMap<string, ReadonlySet<string>>;

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
 * Per-namespace GIR-derived data the rewrites consult to keep the generated
 * `.d.ts` aligned with the gtkx runtime. Every field is optional; a namespace
 * absent from a given map falls back to the corresponding rewrite's default.
 */
export type RewriteInputs = {
    /**
     * Real enum member values used to keep rewritten enum const-objects
     * accurate; namespaces absent from the map fall back to ts-for-gir
     * initializers and ordinals.
     */
    enumValues?: EnumValueMap;
    /**
     * Gtype-struct record names whose `export abstract class` value
     * declarations are stripped to match node-gtk's runtime.
     */
    gtypeStructNames?: GtypeStructMap;
    /** Instance-struct field names stripped from class and interface bodies. */
    classFieldNames?: FieldNameMap;
    /** Signal-action and virtual-method names stripped from type bodies. */
    signalActionMethodNames?: FieldNameMap;
    /** Renamed `connect`-method names keyed owner type name. */
    connectRenames?: ConnectRenameMap;
    /** Names of numeric-valued constants whose declared type is relaxed. */
    numericConstantNames?: FieldNameMap;
    /** GIO-style async callable entries retyped to Promise-returning. */
    asyncMembers?: AsyncMemberMap;
    /** Method shadow-renames keyed owner type name. */
    methodShadowRenames?: MethodShadowRenameMap;
    /** Keyed-`GHashTable` member entries retyped to `Map<K, V>`. */
    hashTableMembers?: HashTableMemberMap;
    /** Error-domain enum names rewritten with an `instanceof`-capable member. */
    errorDomainNames?: ErrorDomainMap;
};

/**
 * Applies every rewrite to each per-namespace `.d.ts` produced by ts-for-gir.
 * Files outside the per-namespace pattern (ambient shims, the bare `node-gtk`
 * augmentor, `-import` stubs) are ignored.
 *
 * @param rawFilesByName - ts-for-gir output keyed by raw filename.
 * @param inputs - Per-namespace GIR-derived data consulted by the rewrites.
 */
export function loadAndRewrite(rawFilesByName: Map<string, string>, inputs: RewriteInputs = {}): RewriteResult[] {
    const {
        enumValues,
        gtypeStructNames,
        classFieldNames,
        signalActionMethodNames,
        connectRenames,
        numericConstantNames,
        asyncMembers,
        methodShadowRenames,
        hashTableMembers,
        errorDomainNames,
    } = inputs;
    const results: RewriteResult[] = [];
    for (const [filename, contents] of rawFilesByName) {
        const namespace = namespaceFromRawFilename(filename);
        if (!namespace) continue;
        let source = unwrapOuterNamespace(contents);
        source = rewriteEnumsToConstObjects(source, enumValues?.get(namespace), errorDomainNames?.get(namespace));
        source = stripGtypeStructClasses(source, gtypeStructNames?.get(namespace));
        source = stripAnonymousCompositeClasses(source);
        source = stripClassFields(source, classFieldNames?.get(namespace));
        source = stripPositionalConstructors(source);
        source = stripUntaggedPositionalConstructors(source);
        source = stripSignalActionMethods(source, signalActionMethodNames?.get(namespace));
        source = stripDivergentOverrideMethods(source, DIVERGENT_OVERRIDE_METHODS_BY_NAMESPACE.get(namespace));
        source = relaxMultiReturnTuples(source);
        source = relaxOptionalInoutReturns(source);
        source = renameConflictingConnectMethods(source, connectRenames?.get(namespace));
        source = honorConflictSignatures(source);
        source = renameShadowedMethods(source, methodShadowRenames?.get(namespace));
        source = relaxGtypeConstants(source);
        source = rewriteGTypeDeclaration(source);
        source = relaxNumericConstants(source, numericConstantNames?.get(namespace)?.get(""));
        source = stripEventEmitterSignalOverloads(source);
        source = rewriteAsyncSignatures(source, asyncMembers?.get(namespace));
        source = rewriteHashTableTypes(source, hashTableMembers?.get(namespace));
        source = rewriteNamespaceDeclarations(source);
        source = rewriteDefaultImportsToNamespace(source);
        source = rewriteModuleKeywordToNamespace(source);
        results.push({ namespace, content: source });
    }
    return results;
}
