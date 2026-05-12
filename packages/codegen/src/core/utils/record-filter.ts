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

import type { GirRecord, GirRepository } from "@gtkx/gir";
import { isPrimitiveFieldType } from "../type-system/ffi-types.js";

function resolveRecord(typeName: string, repo: GirRepository, currentNamespace: string): GirRecord | null {
    if (typeName.includes(".")) {
        return repo.resolveRecord(typeName);
    }
    const ns = repo.getNamespace(currentNamespace);
    return ns?.records.get(typeName) ?? null;
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

    const resolved = resolveRecord(typeName, repo, currentNamespace);
    if (!resolved) return false;

    if (resolved.glibTypeName) return true;
    if (resolved.opaque || resolved.disguised) return false;

    const publicFields = resolved.getPublicFields().filter((field) => field.callback === undefined);
    if (publicFields.length === 0) return false;

    return publicFields.every((field) => isGeneratableFieldType(field.type.name, repo, currentNamespace, visited));
}

/**
 * Returns `true` if the record should receive a full generated binding.
 *
 * A `false` result means the record is skipped entirely — no stub class is
 * emitted. Boxed types always pass once they survive the vtable check;
 * plain structs must be non-opaque, have at least one field, and have
 * every public field marshalable. Inline callback fields (function-pointer
 * slots) do not gate marshalability: they have no JS-visible accessor and
 * their presence on a struct is orthogonal to whether the rest of the
 * struct can be marshalled.
 *
 * @param record - The record under consideration.
 * @param repo - Repository for recursive field-type resolution.
 * @param currentNamespace - Namespace used to resolve unqualified names.
 */
export function shouldGenerateRecord(record: GirRecord, repo: GirRepository, currentNamespace: string): boolean {
    if (isClassVtable(record)) return false;
    if (record.isBoxed()) return true;
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
