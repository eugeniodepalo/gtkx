/**
 * Safe JavaScript string-literal encoding for generated source.
 */

const LINE_SEPARATOR = String.fromCodePoint(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCodePoint(0x2029);
const CODE_BREAKING_CHARACTERS = new RegExp(`[<>${LINE_SEPARATOR}${PARAGRAPH_SEPARATOR}]`, "g");
const UNICODE_ESCAPE_PREFIX = String.raw`\u`;

const escapeCodeBreakingCharacter = (char: string): string =>
    `${UNICODE_ESCAPE_PREFIX}${(char.codePointAt(0) ?? 0).toString(16).padStart(4, "0")}`;

/**
 * Encodes a string as a JavaScript string literal that is safe to embed in
 * generated source in any context.
 *
 * Beyond {@link JSON.stringify}, it escapes `<`, `>`, and the U+2028/U+2029
 * line separators so the resulting literal can never terminate an enclosing
 * markup element or break a statement boundary in the emitted code.
 *
 * @param value - The raw string to encode.
 * @returns A double-quoted JavaScript string literal.
 */
export const jsStringLiteral = (value: string): string =>
    JSON.stringify(value).replaceAll(CODE_BREAKING_CHARACTERS, escapeCodeBreakingCharacter);
