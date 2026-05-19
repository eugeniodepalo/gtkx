/**
 * Gtype-struct rewrites
 *
 * Removes the `export class` value declarations ts-for-gir emits for
 * gtype-struct vtable records and synthetic anonymous-composite names —
 * exports no GObject-introspection runtime provides.
 */

import { findMatchingBrace } from "./shared.js";

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
