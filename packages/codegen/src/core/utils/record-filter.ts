/**
 * Record Filter
 *
 * Canonical predicates that decide which GIR records receive FFI bindings.
 *
 * The codegen needs to answer three related but distinct questions:
 *
 * - Is this record a class or interface vtable that JS should never see?
 * - Should this record receive a full TypeScript binding?
 * - Can a no-arg JS constructor be synthesised for this record?
 *
 * Keeping these three predicates in one place avoids the drift that
 * accumulates when the same conditions are re-implemented at every call
 * site.
 */

import type { GirRecord, GirRepository } from "../../gir/index.js";
import { isPrimitiveFieldType } from "../type-system/ffi-types.js";

function resolveRecord(typeName: string, repo: GirRepository, currentNamespace: string): GirRecord | null {
    if (typeName.includes(".")) {
        return repo.resolveRecord(typeName);
    }
    const ns = repo.getNamespace(currentNamespace);
    return ns?.records.get(typeName) ?? null;
}

function qualifyTypeName(typeName: string, currentNamespace: string): string {
    return typeName.includes(".") ? typeName : `${currentNamespace}.${typeName}`;
}

function resolvesToEnumOrFlags(typeName: string, repo: GirRepository, currentNamespace: string): boolean {
    const qualified = qualifyTypeName(typeName, currentNamespace);
    return repo.resolveEnum(qualified) !== null || repo.resolveFlags(qualified) !== null;
}

function resolvesToClassOrInterface(typeName: string, repo: GirRepository, currentNamespace: string): boolean {
    const qualified = qualifyTypeName(typeName, currentNamespace);
    const kind = repo.getTypeKind(qualified);
    return kind === "class" || kind === "interface";
}

/**
 * Returns `true` for records that back a class or interface vtable.
 *
 * Combines the GIR-supplied `glib:is-gtype-struct-for` flag with the
 * `*Class` / `*Iface` naming convention, since many vtable records lack
 * the explicit attribute and must be filtered by name.
 *
 * @param record - The record to inspect.
 */
export function isClassVtable(record: GirRecord): boolean {
    return record.isGtypeStruct() || record.name.endsWith("Class") || record.name.endsWith("Iface");
}

/**
 * Returns `true` if `typeName` resolves to a type whose memory layout the
 * codegen can faithfully marshal across the FFI boundary.
 *
 * Primitives are always marshalable. Nested record types are walked
 * recursively: boxed types are marshalable via their copy/free pair;
 * disguised, opaque, or empty plain structs are not. Cycles are broken
 * via the `visited` set.
 *
 * @param typeName - Bare or `Namespace.Name` qualified type name.
 * @param repo - Repository used to resolve nested record references.
 * @param currentNamespace - Namespace used to resolve unqualified names.
 * @param visited - Internal cycle-breaker set; pass nothing on first call.
 */
export function isGeneratableFieldType(
    typeName: string,
    repo: GirRepository,
    currentNamespace: string,
    visited: Set<string> = new Set(),
): boolean {
    if (isPrimitiveFieldType(typeName)) return true;

    if (visited.has(typeName)) return false;
    visited.add(typeName);

    if (resolvesToEnumOrFlags(typeName, repo, currentNamespace)) return true;
    if (resolvesToClassOrInterface(typeName, repo, currentNamespace)) return true;

    const resolved = resolveRecord(typeName, repo, currentNamespace);
    if (!resolved) return false;

    if (resolved.glibTypeName) return true;
    if (resolved.disguised && resolved.fields.length === 0) return true;
    if (resolved.opaque || resolved.disguised) return false;

    const publicFields = resolved.getPublicFields().filter((field) => field.callback === undefined);
    if (publicFields.length === 0) return false;

    return publicFields.every((field) => isGeneratableFieldType(field.type.name, repo, currentNamespace, visited));
}

/**
 * Returns `true` if the record should receive a generated binding.
 *
 * Class vtables (`*Class` / `*Iface`) are routed to the class-struct
 * generator and always rejected here. Every other record — boxed types,
 * opaque structs, structs with only private fields — receives at least
 * a stub class so the ts-for-gir-published `.d.ts` contract can reference
 * the symbol. Field accessors are only emitted when {@link
 * isGeneratableFieldType} accepts every public field.
 *
 * @param record - The record under consideration.
 * @param _repo - Repository for recursive field-type resolution.
 * @param _currentNamespace - Namespace used to resolve unqualified names.
 */
export function shouldGenerateRecord(record: GirRecord, _repo: GirRepository, _currentNamespace: string): boolean {
    if (isClassVtable(record)) return false;
    return true;
}

/**
 * Returns `true` if the record's public fields are fully marshalable, in
 * which case the record generator can emit field accessors and registry
 * metadata. A `false` result keeps the emitted class as a bare symbol
 * stub so cross-namespace `.d.ts` references still resolve.
 *
 * @param record - The record under consideration.
 * @param repo - Repository for recursive field-type resolution.
 * @param currentNamespace - Namespace used to resolve unqualified names.
 */
export function canMarshalRecord(record: GirRecord, repo: GirRepository, currentNamespace: string): boolean {
    if (record.isBoxed()) return true;
    if (record.disguised && record.fields.length === 0) return true;
    if (record.opaque) return false;
    if (record.fields.length === 0) return false;

    const publicFields = record.getPublicFields().filter((field) => field.callback === undefined);
    if (publicFields.length === 0) return false;

    return publicFields.every((field) => isGeneratableFieldType(field.type.name, repo, currentNamespace));
}

/**
 * Returns `true` if the codegen can synthesise a no-arg constructor that
 * locally allocates an instance of `record`.
 *
 * This is intentionally narrower than {@link shouldGenerateRecord}: only
 * the conditions required to compute the struct size are checked.
 *
 * @param record - The record under consideration.
 */
export function canAllocateRecord(record: GirRecord): boolean {
    if (isClassVtable(record)) return false;
    if (record.fields.length === 0) return false;
    if (record.isBoxed()) return true;
    if (record.opaque) return false;
    return record.getPublicFields().length > 0;
}
