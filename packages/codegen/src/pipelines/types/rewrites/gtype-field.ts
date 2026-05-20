/**
 * `__gtype__` field rewrite
 *
 * Ensures every interface whose corresponding class is registered with the
 * runtime (`registerNativeClass`) carries an `__gtype__: number` member,
 * mirroring the prototype stamp installed at registration time. ts-for-gir
 * emits the field for GObject-derived interfaces only — boxed-record
 * interfaces lose it — and the runtime now stamps it on every registered
 * class, so the type surface needs to follow.
 *
 * Plain structs that the runtime does not register (records without a
 * `glib:type-name`) are intentionally left alone, since their interfaces are
 * used as plain-object literal shapes and adding a required `__gtype__` would
 * break those literals.
 */

import { findMatchingBrace } from "./shared.js";

const HAS_GTYPE_FIELD = /^[ \t]*__gtype__\??:[ \t][^\n]*/m;

/**
 * Per-namespace set of class/record names whose runtime wrapper is registered
 * with `registerNativeClass`, keyed lowercase namespace identifier.
 */
export type RegisteredClassMap = ReadonlyMap<string, ReadonlySet<string>>;

/**
 * Inserts `__gtype__: number` into every `interface X` whose body lacks it,
 * provided `X` is a registered runtime class for the namespace currently
 * being rewritten.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param registeredNames - Class/record names registered at runtime.
 * @returns The source with `__gtype__: number` added to registered records.
 */
export function ensureGtypeFieldOnRecords(source: string, registeredNames?: ReadonlySet<string>): string {
    if (registeredNames === undefined || registeredNames.size === 0) return source;
    let result = source;
    for (const name of registeredNames) {
        result = ensureGtypeFieldOnInterface(result, name);
    }
    return result;
}

function ensureGtypeFieldOnInterface(source: string, owner: string): string {
    const header = new RegExp(String.raw`(^|\n)[ \t]*export[ \t]+interface[ \t]+${owner}\b[^{]*\{`);
    const match = header.exec(source);
    if (match?.index === undefined) return source;
    const bodyStart = match.index + match[0].length;
    const bodyEnd = findMatchingBrace(source, bodyStart);
    if (bodyEnd < 0) return source;
    const body = source.slice(bodyStart, bodyEnd);
    if (HAS_GTYPE_FIELD.test(body)) return source;
    return `${source.slice(0, bodyStart)}\n    __gtype__: number${body}${source.slice(bodyEnd)}`;
}
