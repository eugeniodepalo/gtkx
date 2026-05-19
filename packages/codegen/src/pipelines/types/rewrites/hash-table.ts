/**
 * Hash-table rewrites
 *
 * Retypes every keyed-`GHashTable` parameter and return in the contract to the
 * `Map<K, V>` type the gtkx runtime marshals such tables to.
 */

import { escapeRegExp, findMatchingParen, rewriteOwnerBlockBodies } from "./shared.js";

/**
 * One contract member carrying a keyed `GHashTable` parameter or return,
 * together with the `Map<K, V>` type the gtkx runtime exposes for it.
 */
export type HashTableMemberEntry = {
    /** The contract member name declaring the keyed `GHashTable`. */
    member: string;
    /** Whether the member is a top-level `export function`. */
    isFunction: boolean;
    /** The `Map<K, V>` TypeScript type the runtime marshals the table to. */
    mapType: string;
};

/**
 * Keyed-`GHashTable` member entries for one namespace, keyed by owner type
 * name. The empty string keys the namespace-level standalone functions.
 */
export type NamespaceHashTableMembers = ReadonlyMap<string, readonly HashTableMemberEntry[]>;

/**
 * Keyed-`GHashTable` member entries for every namespace, keyed lowercase
 * namespace identifier.
 */
export type HashTableMemberMap = ReadonlyMap<string, NamespaceHashTableMembers>;

const HASH_TABLE_TYPE_TOKEN = /\b(?:GLib\.)?HashTable\b/g;

/**
 * Replaces every `GLib.HashTable` / `HashTable` token in a member declaration's
 * parameter list and return annotation with the supplied `Map<K, V>` type.
 *
 * @param region - The source region containing the member declaration.
 * @param entry - The member name, kind, and `Map<K, V>` substitution.
 * @returns The region with the member's `GHashTable` tokens retyped.
 */
const rewriteHashTableMemberDeclaration = (region: string, entry: HashTableMemberEntry): string => {
    const head = entry.isFunction
        ? String.raw`((?:^|\n)[ \t]*export[ \t]+function[ \t]+${escapeRegExp(entry.member)}\s*)\(`
        : String.raw`((?:^|\n)[ \t]*(?:static[ \t]+)?${escapeRegExp(entry.member)}\s*)\(`;
    const pattern = new RegExp(head, "g");
    let result = region;
    for (;;) {
        const match = pattern.exec(result);
        if (match === null) break;
        const headText = match[1] ?? "";
        const parenStart = match.index + headText.length;
        const parenEnd = findMatchingParen(result, parenStart + 1);
        if (parenEnd < 0) {
            pattern.lastIndex = parenStart + 1;
            continue;
        }
        const afterParams = result.slice(parenEnd + 1);
        const returnMatch = /^\s*:\s*[^\n;]+/.exec(afterParams);
        const returnLength = returnMatch ? returnMatch[0].length : 0;
        const declarationEnd = parenEnd + 1 + returnLength;
        const declaration = result.slice(parenStart, declarationEnd);
        if (!HASH_TABLE_TYPE_TOKEN.test(declaration)) {
            pattern.lastIndex = declarationEnd;
            continue;
        }
        const rewritten = declaration.replace(HASH_TABLE_TYPE_TOKEN, entry.mapType);
        result = result.slice(0, parenStart) + rewritten + result.slice(declarationEnd);
        pattern.lastIndex = parenStart + rewritten.length;
    }
    return result;
};

const rewriteHashTableEntriesInRegion = (region: string, entries: readonly HashTableMemberEntry[]): string => {
    let result = region;
    for (const entry of entries) {
        result = rewriteHashTableMemberDeclaration(result, entry);
    }
    return result;
};

/**
 * Retypes every keyed-`GHashTable` parameter and return in the contract to the
 * `Map<K, V>` type the gtkx runtime actually marshals.
 *
 * ts-for-gir renders a keyed `GHashTable` as the bare `GLib.HashTable` opaque
 * type, but the runtime converts such tables to and from a `Map<K, V>`. Each
 * affected member is retyped within its owner block; standalone functions are
 * retyped at the file's top level. The opaque `GLib.HashTable` API itself —
 * whose tables carry `gpointer` keys and values — is left untouched.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param hashTableMembers - Keyed-`GHashTable` entries keyed by owner type name.
 * @returns The source with keyed `GHashTable` signatures retyped to `Map`.
 */
export function rewriteHashTableTypes(source: string, hashTableMembers?: NamespaceHashTableMembers): string {
    if (hashTableMembers === undefined || hashTableMembers.size === 0) return source;

    let result = source;

    const functionEntries = hashTableMembers.get("");
    if (functionEntries) {
        result = rewriteHashTableEntriesInRegion(result, functionEntries);
    }

    for (const [owner, entries] of hashTableMembers) {
        if (owner === "" || entries.length === 0) continue;
        result = rewriteOwnerBlockBodies(result, owner, (body) => rewriteHashTableEntriesInRegion(body, entries));
    }

    return result;
}
