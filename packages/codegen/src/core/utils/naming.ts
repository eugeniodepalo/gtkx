/**
 * TypeScript/JavaScript naming utilities for code generation.
 *
 * These utilities convert GIR names to idiomatic TypeScript identifiers.
 */

const RESERVED_WORDS = new Set([
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "function",
    "if",
    "import",
    "in",
    "instanceof",
    "new",
    "null",
    "return",
    "super",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with",
    "yield",
    "let",
    "static",
    "enum",
    "implements",
    "interface",
    "package",
    "private",
    "protected",
    "public",
    "await",
    "async",
    "eval",
    "arguments",
]);

export const toCamelCase = (str: string): string =>
    str
        .replace(/^_+([a-zA-Z])/, "$1")
        .replace(/^(.+\w)_+$/, "$1")
        .replaceAll(/[-_]+([a-zA-Z])/g, (_, letter) => letter.toUpperCase())
        .replaceAll(/[-_]+(\d)/g, (_, digit) => digit);

export const kebabToSnake = (str: string): string => str.replaceAll("-", "_");

export const snakeToKebab = (str: string): string => str.replaceAll("_", "-");

const capitalize = (str: string): string => (str.length === 0 ? str : str.charAt(0).toUpperCase() + str.slice(1));

export const toPascalCase = (str: string): string => capitalize(toCamelCase(str));

export const createSetterName = (camelName: string): string => `set${capitalize(camelName)}`;

export const createHandlerName = (camelName: string): string => `on${capitalize(camelName)}`;

export const createWrappedName = (paramName: string): string => `wrapped${capitalize(paramName)}`;

export const toKebabCase = (str: string): string =>
    str
        .replaceAll(/([a-z])([A-Z])/g, "$1-$2")
        .replaceAll(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
        .replaceAll("_", "-")
        .toLowerCase();

export const toConstantCase = (str: string): string => str.replaceAll("-", "_").toUpperCase();

export const toValidMemberName = (str: string): string => {
    let result = str.replaceAll(/[^a-zA-Z0-9_$]/g, "_");
    if (/^\d/.test(result)) result = `_${result}`;
    return result;
};

export const toValidIdentifier = (str: string): string => {
    const result = toValidMemberName(str);
    if (RESERVED_WORDS.has(result)) return `${result}_`;
    return result;
};

const RESERVED_WORD_EXPORT_SUFFIX = "_TODO";

/**
 * Produces a valid identifier for an exported namespace member.
 *
 * A name that collides with a reserved word receives
 * {@link RESERVED_WORD_EXPORT_SUFFIX}, matching ts-for-gir's collision-suffix
 * convention (e.g. the Pango `break` function is exported with that suffix
 * appended).
 *
 * @param str - The raw member name.
 * @returns The collision-safe exported member name.
 */
export const toValidExportName = (str: string): string => {
    const result = toValidMemberName(str);
    if (RESERVED_WORDS.has(result)) return `${result}${RESERVED_WORD_EXPORT_SUFFIX}`;
    return result;
};

/**
 * HarfBuzz publishes every public type in lowercase `snake_case_t` form
 * (e.g. `font_t`, `feature_t`, `aat_layout_feature_selector_t`), and the
 * ts-for-gir-published `.d.ts` contract preserves that shape verbatim. Names
 * that already end with the `_t` suffix are kept as-is so cross-namespace
 * references like `HarfBuzz.font_t` resolve against the gtkx-published
 * exports.
 */
export const normalizeClassName = (name: string): string => {
    if (name.endsWith("_t") && /^[a-z][a-z0-9_]*_t$/.test(name)) {
        return name;
    }
    return toPascalCase(name);
};

export const generateConflictingMethodName = (prefix: string, methodName: string): string => {
    const camelPrefix = toCamelCase(prefix);
    const lowerPrefix = camelPrefix.charAt(0).toLowerCase() + camelPrefix.slice(1);
    return lowerPrefix + toPascalCase(methodName);
};
