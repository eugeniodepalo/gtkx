/**
 * Namespace-wrapper rewrites
 *
 * Unwraps the outer per-namespace `namespace { ... }` ts-for-gir emits, lifts
 * its declarations to the file top level, and normalizes module specifiers and
 * the legacy `module` keyword.
 */

import { findMatchingBrace, skipStringLiteral } from "./shared.js";

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
const LEGACY_MODULE_KEYWORD_PATTERN = /^([ \t]*)((?:export[ \t]+)?)module([ \t]+\w+[ \t]*\{)/gm;

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
 *
 * Still required against ts-for-gir 3.3.0: at least the
 * `templates/granite-*.d.ts` companion blocks emit `export module ... { ... }`
 * literally, so removing this rewrite would let the legacy keyword leak into
 * the generated output and fail downstream typechecks.
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
const EXPORT_DEFAULT_LINE = /^export[ \t]+default[ \t]+\w+(?:[ \t]*;)?[ \t]*$/gm;

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
