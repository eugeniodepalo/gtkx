/**
 * Return-type rewrites
 *
 * Reduces ts-for-gir's comment-labeled multi-return tuples to fixed-arity
 * `any` tuples and widens optional-parameter-derived out/inout returns with
 * `| null`.
 */

import { escapeRegExp, findMatchingBracket, skipBlockComment, skipLineComment, skipStringLiteral } from "./shared.js";

const MULTI_RETURN_TUPLE_PATTERN = /:\s*\[ \/\* [A-Za-z_$][\w$]* \*\//g;

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

/**
 * Counts the top-level entries of a tuple-type body, treating nested `<>`,
 * `()`, `[]`, `{}`, string literals and block comments as opaque.
 *
 * @param body - The text between a tuple type's brackets.
 * @returns The number of comma-separated entries.
 */
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
 * Replaces the comment-labeled multi-return tuple type that ts-for-gir emits
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

const OPTIONAL_INOUT_RETURN = /\): \/\* (\w+) \*\/ [\w.]+(?:\[\])?(?=\r?\n)/g;

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
    return source.replace(OPTIONAL_INOUT_RETURN, (match, paramName: string, offset: number) => {
        const lineStart = source.lastIndexOf("\n", offset) + 1;
        const openParen = source.indexOf("(", lineStart);
        if (openParen < 0 || openParen >= offset) return match;
        const params = source.slice(openParen + 1, offset);
        const optionalParam = new RegExp(String.raw`\b${escapeRegExp(paramName)}\?:`);
        return optionalParam.test(params) ? `${match} | null` : match;
    });
}
