/**
 * Constant and GType rewrites
 *
 * Relaxes numeric and `GType`-typed constant declarations to `number` and
 * rewrites the `GType` type alias to the plain numeric form it is at runtime.
 */

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

const GTYPE_CONSTANT_PATTERN = /^(export const [A-Z][A-Z0-9_]*: )GType(\s*)$/gm;

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
 * to the plain `number` a GType is at runtime.
 *
 * ts-for-gir declares `GType` as an object type carrying a phantom `__type__`
 * method that forces nominal matching, but a GType is a plain numeric `gsize`
 * at runtime and no contract member consumes the phantom `<T>` payload. The
 * `number` form makes a runtime `number` directly assignable to a `GType`
 * slot and a `GType` usable as an arithmetic operand, `Map` key, or `=== 0`
 * operand. The `<T = unknown>` parameter is kept so the `GType<...>`
 * references the ts-for-gir output carries continue to resolve.
 *
 * The companion `TYPE_INVALID` declaration is retyped from the `0n` bigint
 * literal to `GType` so the typed `typeFromName("void")` overload yields a
 * `GType` consistent with the numeric runtime value.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @returns The source with the `GType` alias rewritten to `number`.
 */
export function rewriteGTypeDeclaration(source: string): string {
    return source
        .replace(GTYPE_OBJECT_ALIAS_PATTERN, "export type GType<T = unknown> = number;")
        .replace(TYPE_INVALID_DECLARATION_PATTERN, "export let TYPE_INVALID$1: GType");
}
