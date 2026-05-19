/**
 * Connect and method-conflict rewrites
 *
 * Honors `// Has conflict:` method signatures and applies the runtime's
 * `connect`-method and shadowed-method renames to the contract.
 */

import { escapeRegExp, findMatchingBrace, findMatchingParen, splitParameterList, TYPE_BLOCK_HEADER } from "./shared.js";

const CONFLICT_COMMENT = /\/\/ Has conflict: ([A-Za-z_$][\w$]*)\(([^\n]*)\): ([^\n]+)(?:\r?\n)/g;

/**
 * Corrects method signatures that ts-for-gir merged from a GIR
 * `<virtual-method>` over the GIR `<method>` of the same name.
 *
 * When a class declares both a `<method>` and a same-named `<virtual-method>`
 * with differing signatures, ts-for-gir keeps the virtual method's signature as
 * the active member and demotes the real method's signature to a
 * `// Has conflict:` comment. The generated runtime binds the C `<method>`,
 * whose parameter list and return type are authoritative, so the active member
 * of that name is rewritten — within its declaring class or interface block —
 * to the parameter list and return type recorded in the conflict comment.
 *
 * ts-for-gir bug: on a `<method>`/`<virtual-method>` name clash it promotes the
 * virtual method's signature over the real `<method>` the runtime actually
 * binds, leaving the authoritative signature only in a comment.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @returns The source with conflict-comment signatures honored.
 */
export function honorConflictSignatures(source: string): string {
    let result = source;
    TYPE_BLOCK_HEADER.lastIndex = 0;
    for (;;) {
        const header = TYPE_BLOCK_HEADER.exec(result);
        if (header === null) break;
        const bodyStart = header.index + header[0].length;
        const bodyEnd = findMatchingBrace(result, bodyStart);
        if (bodyEnd < 0) continue;
        const body = result.slice(bodyStart, bodyEnd);
        const newBody = honorConflictSignaturesInBlock(body);
        if (newBody !== body) {
            result = result.slice(0, bodyStart) + newBody + result.slice(bodyEnd);
        }
        TYPE_BLOCK_HEADER.lastIndex = bodyStart + newBody.length;
    }
    return result;
}

/**
 * Rewrites the active member of every `// Has conflict:` name within a single
 * class or interface body to the parameter list and return type recorded in
 * the conflict comment.
 *
 * @param body - The class or interface body text.
 * @returns The body with conflict-comment signatures applied.
 */
const honorConflictSignaturesInBlock = (body: string): string => {
    let result = body;
    CONFLICT_COMMENT.lastIndex = 0;
    for (;;) {
        const match = CONFLICT_COMMENT.exec(body);
        if (match === null) break;
        const name = match[1];
        const params = match[2];
        const returnType = match[3];
        if (name === undefined || params === undefined || returnType === undefined) continue;
        const memberPattern = new RegExp(String.raw`(\n[ \t]*${escapeRegExp(name)})\([^\n]*\): [^\n]+`);
        result = result.replace(memberPattern, `$1(${params}): ${returnType}`);
    }
    return result;
};

const METHOD_CONNECT_LINE = /(\n[ \t]*)connect\((?!sigName:)([^\n]*)/g;

/**
 * Renamed `connect`-method names for one namespace, keyed owner type name.
 */
export type NamespaceConnectRenames = ReadonlyMap<string, string>;

/**
 * Renamed `connect`-method names for every namespace, keyed lowercase
 * namespace identifier.
 */
export type ConnectRenameMap = ReadonlyMap<string, NamespaceConnectRenames>;

/**
 * Renames the GIR `connect` method in the contract to match the gtkx runtime.
 *
 * GObject-derived types carry a `connect` signal-subscription method, so the
 * runtime renames any colliding GIR `<method>` named `connect` to an
 * owner-prefixed name. This rewrite applies the runtime's rename in the
 * contract, resolved per type so a flattened inherited method takes its
 * declaring ancestor's name.
 *
 * This is a deliberate gtkx divergence from node-gtk, not a ts-for-gir bug
 * fix. node-gtk lets a colliding GIR `<method>` named `connect` overwrite the
 * inherited signal-subscription `connect` on the prototype, so one of the two
 * — typically the signal `connect` — becomes unreachable (e.g. on
 * `Gio.Socket`). gtkx instead keeps both: the colliding GIR method is exposed
 * under an owner-prefixed name and the signal `connect` stays in place. The
 * contract is rewritten to reflect that gtkx-specific reachable surface.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param renames - Renamed `connect` names keyed owner type name.
 * @returns The source with method-`connect` declarations renamed.
 */
export function renameConflictingConnectMethods(source: string, renames?: NamespaceConnectRenames): string {
    if (renames === undefined || renames.size === 0) return source;
    let result = source;
    TYPE_BLOCK_HEADER.lastIndex = 0;
    for (;;) {
        const header = TYPE_BLOCK_HEADER.exec(result);
        if (header === null) break;
        const ownerName = header[2];
        if (ownerName === undefined) continue;
        const renamed = renames.get(ownerName);
        if (renamed === undefined) continue;
        const bodyStart = header.index + header[0].length;
        const bodyEnd = findMatchingBrace(result, bodyStart);
        if (bodyEnd < 0) continue;
        const body = result.slice(bodyStart, bodyEnd);
        const newBody = body.replace(METHOD_CONNECT_LINE, `$1${renamed}($2`);
        if (newBody === body) continue;
        result = result.slice(0, bodyStart) + newBody + result.slice(bodyEnd);
        TYPE_BLOCK_HEADER.lastIndex = bodyStart + newBody.length;
    }
    return result;
}

/**
 * One method that the gtkx runtime renamed away from a collision with an
 * inherited member of the same name.
 */
export type MethodShadowRename = {
    /** The camelCased GIR method name as ts-for-gir emits it. */
    original: string;
    /** The owner-prefixed name the runtime exposes the method under. */
    renamed: string;
    /** The method's declared parameter count, used to pick the right overload. */
    arity: number;
};

/**
 * Method shadow-renames for one namespace, keyed owner type name.
 */
export type NamespaceMethodShadowRenames = ReadonlyMap<string, readonly MethodShadowRename[]>;

/**
 * Method shadow-renames for every namespace, keyed lowercase namespace
 * identifier.
 */
export type MethodShadowRenameMap = ReadonlyMap<string, NamespaceMethodShadowRenames>;

/**
 * Renames, in the contract, every class method the gtkx runtime renamed because
 * its name collided with an inherited member.
 *
 * The gtkx codegen renames a class `<method>` whose name matches a method
 * inherited from an ancestor class or interface to an owner-prefixed name.
 * ts-for-gir flattens both the inherited member and the colliding method into
 * the subclass body as overloads of the original name; this rewrite renames the
 * colliding overload — identified within its declaring class block by its
 * declared parameter count — to the name the runtime exposes.
 *
 * This is a deliberate gtkx divergence from node-gtk, not a ts-for-gir bug
 * fix. node-gtk lets a subclass's colliding GIR `<method>` shadow the inherited
 * member of the same name on the prototype, leaving the inherited one
 * unreachable. gtkx keeps both: the collider is exposed under an owner-prefixed
 * name and the inherited member stays in place. The clash is only ever between
 * two distinct C functions that happen to share a GIR `name`; a true
 * polymorphic override — the same method re-listed by a subclass — is not a
 * clash and is not renamed, because the GIR `<class>` element lists only the
 * class's own `<method>` entries and never re-declares an inherited method.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param renames - Method shadow-renames keyed owner type name.
 * @returns The source with shadowed methods renamed.
 */
export function renameShadowedMethods(source: string, renames?: NamespaceMethodShadowRenames): string {
    if (renames === undefined || renames.size === 0) return source;
    let result = source;
    TYPE_BLOCK_HEADER.lastIndex = 0;
    for (;;) {
        const header = TYPE_BLOCK_HEADER.exec(result);
        if (header === null) break;
        const next = applyShadowRenamesToHeader(result, header, renames);
        if (next === null) continue;
        result = next.result;
        TYPE_BLOCK_HEADER.lastIndex = next.advanceTo;
    }
    return result;
}

const applyShadowRenamesToHeader = (
    result: string,
    header: RegExpExecArray,
    renames: NamespaceMethodShadowRenames,
): { result: string; advanceTo: number } | null => {
    const ownerName = header[2];
    if (ownerName === undefined) return null;
    const ownerRenames = renames.get(ownerName);
    if (ownerRenames === undefined || ownerRenames.length === 0) return null;
    const bodyStart = header.index + header[0].length;
    const bodyEnd = findMatchingBrace(result, bodyStart);
    if (bodyEnd < 0) return null;
    const body = result.slice(bodyStart, bodyEnd);
    let newBody = body;
    for (const rename of ownerRenames) {
        newBody = renameMethodOverload(newBody, rename);
    }
    const next = newBody !== body ? result.slice(0, bodyStart) + newBody + result.slice(bodyEnd) : result;
    return { result: next, advanceTo: bodyStart + newBody.length };
};

/**
 * Renames the single declaration of `rename.original` within a class body whose
 * declared parameter count matches `rename.arity`, leaving same-named inherited
 * overloads untouched.
 *
 * @param body - The class body text.
 * @param rename - The shadow-rename to apply.
 * @returns The body with the matching overload renamed.
 */
const renameMethodOverload = (body: string, rename: MethodShadowRename): string => {
    const pattern = new RegExp(String.raw`(\n[ \t]*)${escapeRegExp(rename.original)}\(`, "g");
    for (;;) {
        const match = pattern.exec(body);
        if (match === null) return body;
        const parenStart = match.index + match[0].length - 1;
        const parenEnd = findMatchingParen(body, parenStart + 1);
        if (parenEnd < 0) continue;
        const params = body.slice(parenStart + 1, parenEnd);
        const arity = params.trim().length === 0 ? 0 : splitParameterList(params).length;
        if (arity !== rename.arity) continue;
        return `${body.slice(0, match.index)}${match[1]}${rename.renamed}(${body.slice(match.index + match[0].length)}`;
    }
};
