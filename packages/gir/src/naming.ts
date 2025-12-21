export const RESERVED_WORDS = new Set([
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

export const toCamelCase = (str: string): string => str.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());

export const toPascalCase = (str: string): string => {
    const camel = toCamelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
};

export const toKebabCase = (str: string): string =>
    str
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/_/g, "-")
        .toLowerCase();

export const toConstantCase = (str: string): string => str.replace(/-/g, "_").toUpperCase();

export const toValidIdentifier = (str: string): string => {
    let result = str.replace(/[^a-zA-Z0-9_$]/g, "_");
    if (RESERVED_WORDS.has(result)) result = `_${result}`;
    if (/^\d/.test(result)) result = `_${result}`;
    return result;
};
