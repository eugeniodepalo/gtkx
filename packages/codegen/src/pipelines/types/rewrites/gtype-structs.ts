/**
 * Gtype-struct rewrites
 *
 * Removes the `export class` value declarations ts-for-gir emits for
 * gtype-struct vtable records and synthetic anonymous-composite names —
 * exports no GObject-introspection runtime provides.
 */

import { scanBracedDeclarations, spliceOutRanges } from "./shared.js";

/**
 * Gtype-struct record names for every namespace, keyed lowercase namespace
 * identifier.
 */
export type GtypeStructMap = ReadonlyMap<string, ReadonlySet<string>>;

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
    return spliceOutRanges(
        source,
        scanBracedDeclarations(source, GTYPE_STRUCT_CLASS_PATTERN, (match) => {
            const name = match[3];
            return name !== undefined && gtypeStructNames.has(name);
        }),
    );
}

const ANONYMOUS_COMPOSITE_CLASS_PATTERN =
    /(^|\n)([ \t]*)export[ \t]+(?:abstract[ \t]+)?class[ \t]+_\w+__(?:union|struct)\b[^{]*\{/g;

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
    return spliceOutRanges(source, scanBracedDeclarations(source, ANONYMOUS_COMPOSITE_CLASS_PATTERN));
}
