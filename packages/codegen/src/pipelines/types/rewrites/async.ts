/**
 * Async-signature rewrites
 *
 * Rewrites every GIO-style `*_async` callable in the contract to the
 * Promise-returning shape the runtime wrapper exposes: drops the trailing
 * `GAsyncReadyCallback` parameter and retypes the return to `Promise<R>`.
 */

import { escapeRegExp, findMatchingParen, rewriteOwnerBlockBodies, splitParameterList } from "./shared.js";

/**
 * One GIO-style async callable paired with its companion `*_finish` callable,
 * each named as the contract member that declares it.
 */
export type AsyncMemberEntry = {
    /** The contract member name of the `*_async` callable. */
    asyncMember: string;
    /** The contract member name of the companion `*_finish` callable. */
    finishMember: string;
};

/**
 * Async callable entries for one namespace, keyed by owner type name. The empty
 * string keys the namespace-level standalone functions.
 */
export type NamespaceAsyncMembers = ReadonlyMap<string, readonly AsyncMemberEntry[]>;

/**
 * Async callable entries for every namespace, keyed lowercase namespace
 * identifier.
 */
export type AsyncMemberMap = ReadonlyMap<string, NamespaceAsyncMembers>;

/**
 * Extracts the declared return type of a contract member, searching the given
 * region of the source.
 *
 * @param region - The source region to search (a class/interface body, or the
 *     whole file for namespace-level functions).
 * @param memberName - The member to locate.
 * @param isFunction - Whether the member is a top-level `export function`.
 * @returns The declared return type text, or `null` when the member is absent.
 */
const findMemberReturnType = (region: string, memberName: string, isFunction: boolean): string | null => {
    const head = isFunction
        ? String.raw`(?:^|\n)[ \t]*export[ \t]+function[ \t]+${escapeRegExp(memberName)}\s*\(`
        : String.raw`(?:^|\n)[ \t]*${escapeRegExp(memberName)}\s*\(`;
    const headMatch = new RegExp(head).exec(region);
    if (headMatch?.index === undefined) return null;
    const parenStart = region.indexOf("(", headMatch.index);
    if (parenStart < 0) return null;
    const parenEnd = findMatchingParen(region, parenStart + 1);
    if (parenEnd < 0) return null;
    const afterParams = region.slice(parenEnd + 1);
    const returnMatch = /^\s*:\s*([^\n;]+)/.exec(afterParams);
    if (returnMatch?.[1] === undefined) return null;
    return returnMatch[1].trim().replace(/;$/, "").trim();
};

/**
 * Rewrites an async callable's declaration: drops its trailing
 * `GAsyncReadyCallback` parameter and retypes its return from `void` to
 * `Promise<finishReturnType>`.
 *
 * The async callable is matched within `region` by its member name followed by
 * a parameter list whose final entry is the `AsyncReadyCallback` parameter.
 */
const rewriteAsyncMemberDeclaration = (
    region: string,
    memberName: string,
    finishReturnType: string,
    isFunction: boolean,
): string => {
    const head = isFunction
        ? String.raw`((?:^|\n)[ \t]*export[ \t]+function[ \t]+${escapeRegExp(memberName)}\s*)\(`
        : String.raw`((?:^|\n)[ \t]*${escapeRegExp(memberName)}\s*)\(`;
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
        const params = result.slice(parenStart + 1, parenEnd);
        const newParams = dropAsyncCallbackParameter(params);
        if (newParams === null) {
            pattern.lastIndex = parenEnd + 1;
            continue;
        }
        const afterParams = result.slice(parenEnd + 1);
        const returnMatch = /^\s*:\s*[^\n;]+/.exec(afterParams);
        const returnLength = returnMatch ? returnMatch[0].length : 0;
        const replacement = `${headText}(${newParams}): Promise<${finishReturnType}>`;
        result = result.slice(0, match.index) + replacement + result.slice(parenEnd + 1 + returnLength);
        pattern.lastIndex = match.index + replacement.length;
    }
    return result;
};

/**
 * Removes the trailing `GAsyncReadyCallback` parameter from an async callable's
 * parameter list.
 *
 * ts-for-gir types that parameter either as `AsyncReadyCallback` — possibly
 * with a following `user_data` parameter — or, where the callable is merged
 * from a GIR `<virtual-method>`, as a trailing closure parameter. Both forms
 * are recognized; the closure form drops only the final parameter so an
 * earlier progress-callback parameter is retained.
 *
 * @param params - The declared parameter list.
 * @returns The parameter list without the ready-callback parameter, or `null`
 *     when no ready-callback parameter is present.
 */
const dropAsyncCallbackParameter = (params: string): string | null => {
    const entries = splitParameterList(params);
    if (entries.some((entry) => /\bAsyncReadyCallback\b/.test(entry))) {
        return entries
            .filter((entry) => !/\bAsyncReadyCallback\b/.test(entry) && !/^\s*user_?[dD]ata\b/.test(entry))
            .join(", ");
    }
    const last = entries.at(-1);
    if (last !== undefined && /:\s*[\w.]*Closure\b/.test(last)) {
        return entries.slice(0, -1).join(", ");
    }
    return null;
};

const rewriteAsyncEntriesInRegion = (
    region: string,
    entries: readonly AsyncMemberEntry[],
    isFunction: boolean,
): string => {
    let result = region;
    for (const { asyncMember, finishMember } of entries) {
        const finishReturn = findMemberReturnType(result, finishMember, isFunction);
        if (finishReturn === null) continue;
        result = rewriteAsyncMemberDeclaration(result, asyncMember, finishReturn, isFunction);
    }
    return result;
};

/**
 * Rewrites every GIO-style async callable declaration in the contract so it
 * matches the Promise-returning runtime wrapper.
 *
 * Each `*_async` member's trailing `GAsyncReadyCallback` parameter is dropped
 * and its return type is changed from `void` to `Promise<R>`, where `R` is the
 * declared return type of its companion `*_finish` member. Class and interface
 * members are rewritten within their owner block; standalone functions are
 * rewritten at the file's top level.
 *
 * @param source - The `.d.ts` source to rewrite.
 * @param asyncMembers - Async callable entries keyed by owner type name.
 * @returns The source with async callable signatures made Promise-returning.
 */
export function rewriteAsyncSignatures(source: string, asyncMembers?: NamespaceAsyncMembers): string {
    if (asyncMembers === undefined || asyncMembers.size === 0) return source;

    let result = source;

    const functionEntries = asyncMembers.get("");
    if (functionEntries) {
        result = rewriteAsyncEntriesInRegion(result, functionEntries, true);
    }

    for (const [owner, entries] of asyncMembers) {
        if (owner === "" || entries.length === 0) continue;
        result = rewriteOwnerBlockBodies(result, owner, (body) => rewriteAsyncEntriesInRegion(body, entries, false));
    }

    return result;
}
