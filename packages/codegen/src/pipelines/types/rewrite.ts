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
 * Member values are taken from ts-for-gir's declared values verbatim — if a
 * member lacks an explicit initializer, the computed ordinal is used. JSDoc
 * comments preceding members are stripped because the const-object shape
 * cannot host per-property block comments without breaking the type.
 *
 * Any JSDoc block authored between the `export` keyword and the `enum`
 * keyword is preserved on the rewritten `const` declaration so the rendered
 * docs stay attached to the new value declaration.
 */
export function rewriteEnumsToConstObjects(source: string): string {
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
        if (initializer !== undefined) {
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

const CLASS_NO_EXTENDS_PATTERN = /^(\s*)(export\s+(?:declare\s+)?(?:abstract\s+)?class\s+\w+)(\s*\{)/gm;
const NATIVE_OBJECT_IMPORT = `import type { NativeObject as __gtkx_NativeObject } from "../../object.js";\n`;

/**
 * Adds an `extends NativeObject` clause to every class declaration that has
 * no existing extends clause, plus a type-only import for `NativeObject`.
 *
 * The runtime codegen emits every generated class as `class Foo extends
 * NativeObject`. The ts-for-gir-derived `.d.ts` contract elides that
 * inheritance because ts-for-gir is unaware of gtkx's runtime base. Without
 * this augmentation, consumer code that subclasses a generated class
 * (e.g. `class CustomLabel extends Gtk.Label {}`) cannot satisfy
 * constraints like `T extends typeof NativeObject` because the .d.ts class
 * has no inherited `handle` / `__gtype__` / `_init` members.
 */
export function injectNativeObjectInheritance(source: string): string {
    let mutated = false;
    const rewritten = source.replace(CLASS_NO_EXTENDS_PATTERN, (_match, indent: string, head: string, tail: string) => {
        mutated = true;
        return `${indent}${head} extends __gtkx_NativeObject${tail}`;
    });
    if (!mutated) return source;
    return `${NATIVE_OBJECT_IMPORT}${rewritten}`;
}

const GTYPE_STRUCTURAL_PATTERN = /^export\s+type\s+GType<\s*T\s*=\s*unknown\s*>\s*=\s*\{[\s\S]*?\};/m;
const GTYPE_NUMBER_ALIAS = "export type GType<_T = unknown> = number;";
const TYPE_INVALID_BIGINT_PATTERN = /^export let TYPE_INVALID\s*:\s*0n$/m;
const TYPE_INVALID_NUMBER = "export let TYPE_INVALID: GType<undefined>;";
const TYPE_FROM_NAME_OVERLOAD_PATTERN = /^export function typeFromName\(name:\s*'[^']+'\):\s*typeof TYPE_\w+\s*$/gm;

/**
 * Rewrites the structural `GType<T>` declaration that ts-for-gir emits to a
 * plain `number` alias. The runtime layer marshals every GType as a JavaScript
 * `number` (a 64-bit numeric ID returned by `g_type_from_name` and friends),
 * so a structural object shape forces every cross-boundary site to launder
 * the value through `as unknown as`. Treating `GType` as a numeric alias
 * preserves call-site documentation via the unused type parameter while
 * eliminating cast noise entirely.
 *
 * Also normalizes the `TYPE_INVALID: 0n` bigint-literal declaration to a
 * `GType<undefined>` and drops the per-string `typeFromName` overloads so the
 * generic `typeFromName(name: string): GType` shape wins at every call site.
 */
export function rewriteGTypeToNumberAlias(source: string): string {
    if (!GTYPE_STRUCTURAL_PATTERN.test(source)) return source;
    return source
        .replace(GTYPE_STRUCTURAL_PATTERN, GTYPE_NUMBER_ALIAS)
        .replace(TYPE_INVALID_BIGINT_PATTERN, TYPE_INVALID_NUMBER)
        .replace(TYPE_FROM_NAME_OVERLOAD_PATTERN, "");
}

const CLASS_STRUCT_INTERFACE_HEAD_PATTERN = /^export[ \t]+interface[ \t]+(\w+(?:Class|Iface|Interface))[ \t]*\{/gm;
const EXISTING_VALUE_PATTERN = /^export\s+(?:const|let|var)\s+(\w+)\b/gm;
const PROPERTY_LINE_PATTERN = /^[ \t]*(\w+)\??[ \t]*:[ \t]*([^\n;]+?)(?:;|$)/gm;
const REGISTER_CLASS_IMPORT = `import type { RegisterClassVfuncDescriptor as __gtkx_RegisterClassVfuncDescriptor, RegisterClassInterfaceVfuncDescriptor as __gtkx_RegisterClassInterfaceVfuncDescriptor } from "../../register-class.js";\n`;

/**
 * Augments class-struct records (names ending in `Class`, `Iface`, or
 * `Interface`) with a sibling `export const <Name>` declaration whose value
 * type matches the runtime registry the FFI codegen publishes: a map keyed
 * by camelCased vfunc names with `RegisterClassVfuncDescriptor` or
 * `RegisterClassInterfaceVfuncDescriptor` shapes as values.
 *
 * Without this augmentation, consumer code that spreads
 * `ObjectClass.setProperty` cannot satisfy the
 * `RegisterClassVfuncDefinition` parameter constraint because the .d.ts
 * only declares the GIR `interface` companion (with field function
 * signatures), not the runtime registry shape.
 */
export function injectClassStructRegistryShape(source: string): string {
    const existingValues = new Set<string>();
    for (const m of source.matchAll(EXISTING_VALUE_PATTERN)) {
        const name = m[1];
        if (name) existingValues.add(name);
    }

    const registriesToEmit: Array<{ name: string; descriptorType: string; vfuncNames: string[] }> = [];
    CLASS_STRUCT_INTERFACE_HEAD_PATTERN.lastIndex = 0;
    for (;;) {
        const head = CLASS_STRUCT_INTERFACE_HEAD_PATTERN.exec(source);
        if (head === null) break;
        const name = head[1];
        if (!name || !isClassStructName(name)) continue;
        if (existingValues.has(name)) continue;
        const bodyStart = head.index + head[0].length;
        const bodyEnd = findMatchingBrace(source, bodyStart);
        if (bodyEnd < 0) continue;
        const body = source.slice(bodyStart, bodyEnd);
        const vfuncNames = extractVfuncNames(body);
        const descriptorType = name.endsWith("Class")
            ? "__gtkx_RegisterClassVfuncDescriptor"
            : "__gtkx_RegisterClassInterfaceVfuncDescriptor";
        registriesToEmit.push({ name, descriptorType, vfuncNames });
    }

    if (registriesToEmit.length === 0) return source;

    let modified = source;
    for (const { name } of registriesToEmit) {
        modified = removeClassDeclaration(modified, name);
    }

    const appended = registriesToEmit
        .map(({ name, descriptorType, vfuncNames }) => {
            if (vfuncNames.length === 0) {
                return `export const ${name}: Record<string, ${descriptorType}>;`;
            }
            const lines = vfuncNames.map((vfuncName) => `    readonly ${camelize(vfuncName)}: ${descriptorType};`);
            return `export const ${name}: {\n${lines.join("\n")}\n};`;
        })
        .join("\n\n");

    return `${REGISTER_CLASS_IMPORT}${modified}\n\n${appended}\n`;
}

const removeClassDeclaration = (source: string, className: string): string => {
    const pattern = new RegExp(
        `^[ \\t]*export[ \\t]+(?:declare[ \\t]+)?(?:abstract[ \\t]+)?class[ \\t]+${className}\\b[^{]*\\{`,
        "m",
    );
    const match = source.match(pattern);
    if (!match || match.index === undefined) return source;
    const headStart = match.index;
    const bodyStart = headStart + match[0].length;
    const bodyEnd = findMatchingBrace(source, bodyStart);
    if (bodyEnd < 0) return source;
    return source.slice(0, headStart) + source.slice(bodyEnd + 1).replace(/^[ \t]*\n/, "");
};

const CLASS_STRUCT_SUFFIXES = ["Class", "Iface", "Interface"] as const;

const isClassStructName = (name: string): boolean =>
    CLASS_STRUCT_SUFFIXES.some((suffix) => name.endsWith(suffix) && name !== suffix);

const extractVfuncNames = (body: string): string[] => {
    const names: string[] = [];
    for (const match of body.matchAll(PROPERTY_LINE_PATTERN)) {
        const propName = match[1];
        const propType = match[2];
        if (!propName || !propType) continue;
        if (!propType.includes("=>")) continue;
        names.push(propName);
    }
    return names;
};

const camelize = (snakeOrKebab: string): string =>
    snakeOrKebab.replace(/[-_]([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());

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
 */
export function loadAndRewrite(rawFilesByName: Map<string, string>): RewriteResult[] {
    const results: RewriteResult[] = [];
    for (const [filename, contents] of rawFilesByName) {
        const namespace = namespaceFromRawFilename(filename);
        if (!namespace) continue;
        let source = rewriteGTypeToNumberAlias(contents);
        source = unwrapOuterNamespace(source);
        source = rewriteEnumsToConstObjects(source);
        source = rewriteNamespaceDeclarations(source);
        source = injectNativeObjectInheritance(source);
        source = injectClassStructRegistryShape(source);
        source = rewriteDefaultImportsToNamespace(source);
        source = rewriteModuleKeywordToNamespace(source);
        results.push({ namespace, content: source });
    }
    return results;
}
