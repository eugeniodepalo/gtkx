/**
 * Type-pipeline rewrites
 *
 * Applies the per-concern rewrite passes to each per-namespace `.d.ts`
 * ts-for-gir emits. The passes live in `./rewrites/`; this module wires them
 * into the fixed `loadAndRewrite` sequence and re-exports them.
 */

import { type AsyncMemberMap, rewriteAsyncSignatures } from "./rewrites/async.js";
import {
    type ConnectRenameMap,
    honorConflictSignatures,
    type MethodShadowRenameMap,
    renameConflictingConnectMethods,
    renameShadowedMethods,
} from "./rewrites/connect.js";
import { relaxGtypeConstants, relaxNumericConstants, rewriteGTypeDeclaration } from "./rewrites/constants.js";
import { stripPositionalConstructors, stripUntaggedPositionalConstructors } from "./rewrites/constructors.js";
import {
    type BitfieldMap,
    type EnumValueMap,
    type ErrorDomainMap,
    rewriteEnumsToConstObjects,
} from "./rewrites/enums.js";
import { type FieldNameMap, stripClassFields, stripSignalActionMethods } from "./rewrites/fields.js";
import {
    type GtypeStructMap,
    stripAnonymousCompositeClasses,
    stripGtypeStructClasses,
} from "./rewrites/gtype-structs.js";
import { type HashTableMemberMap, rewriteHashTableTypes } from "./rewrites/hash-table.js";
import {
    namespaceFromRawFilename,
    rewriteDefaultImportsToNamespace,
    rewriteModuleKeywordToNamespace,
    rewriteNamespaceDeclarations,
    unwrapOuterNamespace,
} from "./rewrites/namespace-wrapper.js";
import { relaxMultiReturnTuples, relaxOptionalInoutReturns } from "./rewrites/return-types.js";
import { stripEventEmitterSignalOverloads } from "./rewrites/signals.js";

export * from "./rewrites/async.js";
export * from "./rewrites/connect.js";
export * from "./rewrites/constants.js";
export * from "./rewrites/constructors.js";
export * from "./rewrites/enums.js";
export * from "./rewrites/fields.js";
export * from "./rewrites/gtype-structs.js";
export * from "./rewrites/hash-table.js";
export * from "./rewrites/namespace-wrapper.js";
export * from "./rewrites/return-types.js";
export * from "./rewrites/signals.js";

/**
 * Result of running every rewrite over a single ts-for-gir output file.
 */
export type RewriteResult = {
    /** Lowercase namespace identifier extracted from the raw filename. */
    namespace: string;
    /** Final `.d.ts` contents after every rewrite has been applied. */
    content: string;
};

/**
 * Per-namespace GIR-derived data the rewrites consult to keep the generated
 * `.d.ts` aligned with the gtkx runtime. Every field is optional; a namespace
 * absent from a given map falls back to the corresponding rewrite's default.
 */
export type RewriteInputs = {
    /**
     * Real enum member values used to keep rewritten enum const-objects
     * accurate; namespaces absent from the map fall back to ts-for-gir
     * initializers and ordinals.
     */
    enumValues?: EnumValueMap;
    /**
     * Gtype-struct record names whose `export abstract class` value
     * declarations are stripped to match node-gtk's runtime.
     */
    gtypeStructNames?: GtypeStructMap;
    /** Instance-struct field names stripped from class and interface bodies. */
    classFieldNames?: FieldNameMap;
    /** Signal-action and virtual-method names stripped from type bodies. */
    signalActionMethodNames?: FieldNameMap;
    /** Renamed `connect`-method names keyed owner type name. */
    connectRenames?: ConnectRenameMap;
    /** Names of numeric-valued constants whose declared type is relaxed. */
    numericConstantNames?: FieldNameMap;
    /** GIO-style async callable entries retyped to Promise-returning. */
    asyncMembers?: AsyncMemberMap;
    /** Method shadow-renames keyed owner type name. */
    methodShadowRenames?: MethodShadowRenameMap;
    /** Keyed-`GHashTable` member entries retyped to `Map<K, V>`. */
    hashTableMembers?: HashTableMemberMap;
    /** Error-domain enum names rewritten with an `instanceof`-capable member. */
    errorDomainNames?: ErrorDomainMap;
    /** Bitfield enum names whose type alias is widened to `number`. */
    bitfieldNames?: BitfieldMap;
};

/**
 * Applies every rewrite to each per-namespace `.d.ts` produced by ts-for-gir.
 * Files outside the per-namespace pattern (ambient shims, the bare `node-gtk`
 * augmentor, `-import` stubs) are ignored.
 *
 * @param rawFilesByName - ts-for-gir output keyed by raw filename.
 * @param inputs - Per-namespace GIR-derived data consulted by the rewrites.
 */
export function loadAndRewrite(rawFilesByName: Map<string, string>, inputs: RewriteInputs = {}): RewriteResult[] {
    const {
        enumValues,
        gtypeStructNames,
        classFieldNames,
        signalActionMethodNames,
        connectRenames,
        numericConstantNames,
        asyncMembers,
        methodShadowRenames,
        hashTableMembers,
        errorDomainNames,
        bitfieldNames,
    } = inputs;
    const results: RewriteResult[] = [];
    for (const [filename, contents] of rawFilesByName) {
        const namespace = namespaceFromRawFilename(filename);
        if (!namespace) continue;
        let source = unwrapOuterNamespace(contents);
        source = rewriteEnumsToConstObjects(
            source,
            enumValues?.get(namespace),
            errorDomainNames?.get(namespace),
            bitfieldNames?.get(namespace),
        );
        source = stripGtypeStructClasses(source, gtypeStructNames?.get(namespace));
        source = stripAnonymousCompositeClasses(source);
        source = stripClassFields(source, classFieldNames?.get(namespace));
        source = stripPositionalConstructors(source);
        source = stripUntaggedPositionalConstructors(source);
        source = stripSignalActionMethods(source, signalActionMethodNames?.get(namespace));
        source = relaxMultiReturnTuples(source);
        source = relaxOptionalInoutReturns(source);
        source = renameConflictingConnectMethods(source, connectRenames?.get(namespace));
        source = honorConflictSignatures(source);
        source = renameShadowedMethods(source, methodShadowRenames?.get(namespace));
        source = relaxGtypeConstants(source);
        source = rewriteGTypeDeclaration(source);
        source = relaxNumericConstants(source, numericConstantNames?.get(namespace)?.get(""));
        source = stripEventEmitterSignalOverloads(source);
        source = rewriteAsyncSignatures(source, asyncMembers?.get(namespace));
        source = rewriteHashTableTypes(source, hashTableMembers?.get(namespace));
        source = rewriteNamespaceDeclarations(source);
        source = rewriteDefaultImportsToNamespace(source);
        source = rewriteModuleKeywordToNamespace(source);
        results.push({ namespace, content: source });
    }
    return results;
}
