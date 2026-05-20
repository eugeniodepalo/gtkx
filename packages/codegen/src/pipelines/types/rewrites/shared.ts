/**
 * Shared rewrite utilities
 *
 * Brace/bracket/paren scanners, the parameter-list splitter, regex escaping,
 * the owner-block body transform, and the exported `class`/`interface` header
 * pattern — the parsing primitives the per-concern rewrite passes build on.
 */

/**
 * Advances past a string or template literal starting at `start`, treating
 * `${...}` interpolations as nested brace regions.
 */
export const skipStringLiteral = (source: string, start: number, quote: string): number => {
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

/** Advances past a `//` line comment starting at `start`. */
export const skipLineComment = (source: string, start: number): number => {
    let i = start + 2;
    while (i < source.length && source[i] !== "\n") i++;
    return i + 1;
};

/** Advances past a block comment starting at `start`. */
export const skipBlockComment = (source: string, start: number): number => {
    let i = start + 2;
    while (i < source.length - 1) {
        if (source[i] === "*" && source[i + 1] === "/") return i + 2;
        i++;
    }
    return source.length;
};

/**
 * Returns the index of the `close` delimiter matching the implicit `open`
 * delimiter immediately before `from`, treating strings and comments as
 * opaque. Returns `-1` when no matching delimiter is found.
 */
/**
 * Returns the index past any opaque region (string literal or comment) that
 * starts at `i`, or `i` itself when no such region begins there.
 */
const skipOpaqueRegion = (source: string, i: number): number => {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") return skipStringLiteral(source, i, ch);
    if (ch === "/" && source[i + 1] === "/") return skipLineComment(source, i);
    if (ch === "/" && source[i + 1] === "*") return skipBlockComment(source, i);
    return i;
};

const findMatchingDelimiter = (source: string, from: number, open: string, close: string): number => {
    let depth = 1;
    let i = from;
    while (i < source.length) {
        const skipped = skipOpaqueRegion(source, i);
        if (skipped !== i) {
            i = skipped;
            continue;
        }
        const ch = source[i];
        if (ch === open) depth++;
        else if (ch === close) {
            depth--;
            if (depth === 0) return i;
        }
        i++;
    }
    return -1;
};

/**
 * Returns the index of the `}` that matches the implicit `{` immediately
 * before `from`, treating strings and comments as opaque. Returns `-1` when
 * no matching brace is found.
 */
export const findMatchingBrace = (source: string, from: number): number =>
    findMatchingDelimiter(source, from, "{", "}");

/**
 * Returns the index of the `]` matching the implicit `[` immediately before
 * `from`, treating strings and comments as opaque. Returns `-1` when unmatched.
 */
export const findMatchingBracket = (source: string, from: number): number =>
    findMatchingDelimiter(source, from, "[", "]");

/**
 * Returns the index of the `)` matching the implicit `(` at `from - 1`,
 * treating strings and comments as opaque. Returns `-1` when unmatched.
 */
export const findMatchingParen = (source: string, from: number): number =>
    findMatchingDelimiter(source, from, "(", ")");

/**
 * Splits a parameter-list string into top-level parameter entries, treating
 * nested `<>`, `()`, `[]`, `{}` and string literals as opaque.
 */
export const splitParameterList = (params: string): string[] => {
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
 * Escapes regular-expression metacharacters in a literal string fragment.
 *
 * @param value - The literal text to escape.
 * @returns The text safe for embedding in a `RegExp`.
 */
export function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Matches the header of an exported `class` or `interface` block, capturing
 * the leading newline (or start) in group 1 and the type name in group 2.
 */
export const TYPE_BLOCK_HEADER = /(^|\n)[ \t]*export[ \t]+(?:abstract[ \t]+)?(?:interface|class)[ \t]+(\w+)\b[^{]*\{/g;

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
export const rewriteOwnerBlockBodies = (
    source: string,
    owner: string,
    transformBody: (body: string) => string,
): string => {
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

/**
 * Removes the ranges `[start, end)` from `source` and returns the spliced
 * result. The ranges must be sorted in increasing order and non-overlapping.
 */
export const spliceOutRanges = (source: string, ranges: ReadonlyArray<{ start: number; end: number }>): string => {
    if (ranges.length === 0) return source;
    const parts: string[] = [];
    let cursor = 0;
    for (const { start, end } of ranges) {
        parts.push(source.slice(cursor, start));
        cursor = end;
    }
    parts.push(source.slice(cursor));
    return parts.join("");
};

/**
 * Scans `source` for every match of `pattern` that opens a `{` block, walks
 * to its matching `}` via {@link findMatchingBrace}, and returns the
 * `[start, end)` ranges of the full declarations (including leading newline
 * and trailing line terminator).
 *
 * The pattern must capture the leading newline (or start anchor) in its first
 * group so the strip preserves boundary whitespace. Matches for which
 * `accept` returns `false` are excluded from the result.
 */
export const scanBracedDeclarations = (
    source: string,
    pattern: RegExp,
    accept: (match: RegExpExecArray) => boolean = () => true,
): Array<{ start: number; end: number }> => {
    const ranges: Array<{ start: number; end: number }> = [];
    pattern.lastIndex = 0;
    for (;;) {
        const match = pattern.exec(source);
        if (match === null) break;
        if (!accept(match)) continue;
        const bodyEnd = findMatchingBrace(source, match.index + match[0].length);
        if (bodyEnd < 0) continue;
        const start = match.index + (match[1] ?? "").length;
        let end = bodyEnd + 1;
        if (source[end] === "\n") end += 1;
        ranges.push({ start, end });
    }
    return ranges;
};

/**
 * Removes every member line in `body` whose first non-newline character is
 * `name` followed by `nameSuffix`. The optional leading JSDoc block preceding
 * the member is stripped along with the member line.
 *
 * @param body - The block body to mutate.
 * @param name - The member identifier to match.
 * @param nameSuffix - The regex fragment that follows the identifier
 *   (e.g. `[<(]` for methods, `(\?)?:[ \t]` for fields).
 */
export const stripNamedMember = (body: string, name: string, nameSuffix: string): string => {
    const memberLine = new RegExp(String.raw`(^|\n)([ \t]*)${OPTIONAL_LEADING_JSDOC}${name}${nameSuffix}[^\n]*`);
    const match = memberLine.exec(body);
    if (match?.index === undefined) return body;
    const start = match.index + (match[1] ?? "").length;
    let end = match.index + match[0].length;
    if (body[end] === "\n") end += 1;
    return body.slice(0, start) + body.slice(end);
};

const OPTIONAL_LEADING_JSDOC = String.raw`(?:\/\*\*(?:(?!\*\/)[\s\S])*?\*\/[ \t\n]*)?`;
