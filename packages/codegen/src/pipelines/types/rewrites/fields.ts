/**
 * Field and signal-action rewrites
 *
 * Removes the instance-struct `<field>` members and the signal-action /
 * virtual-method declarations ts-for-gir emits into class and interface
 * bodies — members no GObject-introspection runtime exposes.
 */

import { findMatchingBrace } from "./shared.js";

/**
 * Field-name sets keyed by class or interface name for one namespace.
 */
export type NamespaceFieldNames = ReadonlyMap<string, ReadonlySet<string>>;

/**
 * Class/interface field-name sets for every namespace, keyed lowercase
 * namespace identifier.
 */
export type FieldNameMap = ReadonlyMap<string, NamespaceFieldNames>;

/**
 * Regex fragment matching an optional JSDoc block immediately preceding a
 * member. The inner `(?!\*\/)` guard keeps the lazy body from spanning past
 * the block's own `*\/` into later declarations.
 */
const OPTIONAL_LEADING_JSDOC = String.raw`(?:\/\*\*(?:(?!\*\/)[\s\S])*?\*\/[ \t\n]*)?`;

const stripMethodsFromBody = (body: string, methodNames: ReadonlySet<string>): string => {
    let result = body;
    for (const name of methodNames) {
        const memberLine = new RegExp(String.raw`(^|\n)([ \t]*)${OPTIONAL_LEADING_JSDOC}${name}[<(][^\n]*`);
        const match = memberLine.exec(result);
        if (match?.index === undefined) continue;
        const start = match.index + (match[1] ?? "").length;
        let end = match.index + match[0].length;
        if (result[end] === "\n") end += 1;
        result = result.slice(0, start) + result.slice(end);
    }
    return result;
};

/**
 * Removes the named instance-method declarations from each `interface <Owner>`
 * and `class <Owner>` block, dropping any JSDoc block that precedes them.
 *
 * The strip is scoped to the named block so an identically named method on an
 * unrelated declaration is left intact. A method-member line is matched by its
 * name followed by either `(` or `<` (the latter covering a generic head).
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param strippedByOwner - Method names keyed by owner class/interface name.
 * @returns The source with the named method declarations removed.
 */
const stripBlockMethods = (source: string, strippedByOwner: ReadonlyMap<string, ReadonlySet<string>>): string => {
    let result = source;
    for (const [owner, methodNames] of strippedByOwner) {
        for (const blockKeyword of ["interface", "class"]) {
            const header = new RegExp(String.raw`(^|\n)[ \t]*export[ \t]+${blockKeyword}[ \t]+${owner}\b[^{]*\{`);
            const headerMatch = header.exec(result);
            if (headerMatch?.index === undefined) continue;
            const bodyStart = headerMatch.index + headerMatch[0].length;
            const bodyEnd = findMatchingBrace(result, bodyStart);
            if (bodyEnd < 0) continue;
            const body = result.slice(bodyStart, bodyEnd);
            result = result.slice(0, bodyStart) + stripMethodsFromBody(body, methodNames) + result.slice(bodyEnd);
        }
    }
    return result;
};

/**
 * Removes the signal-action and virtual-method declarations ts-for-gir emits
 * into a class or interface body for which the gtkx runtime exposes no
 * corresponding instance method.
 *
 * ts-for-gir renders every `<glib:signal>` and every `<virtual-method>` as a
 * camelCased instance method even when no `<method>` of that name exists; the
 * gtkx runtime emits only real `<method>` wrappers, never a signal-action or
 * virtual-method accessor. This is a ts-for-gir bug relative to the node-gtk
 * surface gtkx targets: node-gtk's `makeObject` enumerates only properties,
 * methods, and constants. The drift names are computed per owner as the signal
 * and virtual-method names that have no same-named real method.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param strippedByOwner - Signal-action method names keyed by owner name.
 * @returns The source with the signal-action method declarations removed.
 */
export function stripSignalActionMethods(
    source: string,
    strippedByOwner?: ReadonlyMap<string, ReadonlySet<string>>,
): string {
    if (strippedByOwner === undefined || strippedByOwner.size === 0) return source;
    return stripBlockMethods(source, strippedByOwner);
}

const stripFieldsFromBody = (body: string, fieldNames: ReadonlySet<string>): string => {
    let result = body;
    for (const name of fieldNames) {
        const memberLine = new RegExp(String.raw`(^|\n)([ \t]*)${OPTIONAL_LEADING_JSDOC}${name}(\?)?:[ \t][^\n]*`);
        const match = memberLine.exec(result);
        if (match?.index === undefined) continue;
        const start = match.index + (match[1] ?? "").length;
        let end = match.index + match[0].length;
        if (result[end] === "\n") end += 1;
        result = result.slice(0, start) + result.slice(end);
    }
    return result;
};

/**
 * Removes the instance-struct field declarations that ts-for-gir emits into
 * GObject class and interface bodies.
 *
 * ts-for-gir emits each `<field>` element of a class or interface (the
 * embedded `parentInstance` parent struct, private `priv` pointers, and any
 * public layout fields) as a bare `<name>: <type>` member. node-gtk's
 * `makeObject` enumerates only properties, methods, and constants — never
 * `object_info_get_field` — so it never exposes instance-struct fields. The
 * gtkx runtime matches that surface. Boxed-struct fields are left intact
 * because node-gtk's `makeStruct` does expose them.
 *
 * ts-for-gir bug: it surfaces instance-struct `<field>` layout members on the
 * class type, members no GObject-introspection runtime makes accessible.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param fieldNamesByOwner - Field names keyed by class/interface name.
 * @returns The source with instance-struct field declarations removed.
 */
export function stripClassFields(source: string, fieldNamesByOwner?: NamespaceFieldNames): string {
    if (fieldNamesByOwner === undefined || fieldNamesByOwner.size === 0) return source;

    let result = source;
    for (const [owner, fieldNames] of fieldNamesByOwner) {
        if (fieldNames.size === 0) continue;
        for (const blockKeyword of ["interface", "class"]) {
            const header = new RegExp(String.raw`(^|\n)[ \t]*export[ \t]+${blockKeyword}[ \t]+${owner}\b[^{]*\{`);
            const headerMatch = header.exec(result);
            if (headerMatch?.index === undefined) continue;
            const bodyStart = headerMatch.index + headerMatch[0].length;
            const bodyEnd = findMatchingBrace(result, bodyStart);
            if (bodyEnd < 0) continue;
            const body = result.slice(bodyStart, bodyEnd);
            result = result.slice(0, bodyStart) + stripFieldsFromBody(body, fieldNames) + result.slice(bodyEnd);
        }
    }
    return result;
}
