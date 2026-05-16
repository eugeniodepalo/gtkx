/**
 * Generated-code-independent access to the GObject type system.
 *
 * The runtime modules `registry.ts`, `register-class.ts`, and `native.ts`
 * need a handful of `g_type_*` functions for runtime type resolution.
 * Importing them from the generated `gobject` bindings would make the
 * runtime layer depend on generated code and close an import cycle through
 * the runtime barrel, leaving registration helpers undefined when generated
 * modules call them at load time. These hand-written FFI bindings keep the
 * runtime self-contained.
 */

import { createRef } from "@gtkx/native";
import type { GType } from "./generated/gobject/gobject.js";
import { t } from "./helpers.js";

const LIB = "libgobject-2.0.so.0";

/**
 * The invalid GType sentinel (`G_TYPE_INVALID`), the numeric `0` the GObject
 * type system reserves for "no type". Returned by type-resolution helpers
 * when a class, parent, or instance has no associated GType.
 */
export const G_TYPE_INVALID: GType = 0;

/**
 * Narrows a marshaled FFI result to a `GType`.
 *
 * A `g_*_get_type` FFI call yields its numeric `gsize` as an untyped
 * marshaled value; this helper coerces it to a number and brands it as the
 * `GType` it is at runtime. It is the single sanctioned conversion point
 * from a raw FFI result to a `GType`.
 *
 * @param value - The marshaled FFI result of a type-resolution call.
 * @returns The result as a `GType`.
 */
export function gtypeFromFfi(value: unknown): GType {
    return Number(value);
}

const g_type_is_a = t.fn(LIB, "g_type_is_a", [{ type: t.uint64 }, { type: t.uint64 }], t.boolean);

const g_type_parent = t.fn(LIB, "g_type_parent", [{ type: t.uint64 }], t.uint64);

const g_type_interfaces = t.fn(
    LIB,
    "g_type_interfaces",
    [{ type: t.uint64 }, { type: t.ref(t.uint32) }],
    t.sizedArray(t.uint64, 1, "full"),
);

/**
 * Tests whether `type` is a descendant of `isAType`, or — when `isAType` is
 * an interface — whether `type` conforms to it.
 *
 * @param type - The GType to test
 * @param isAType - The ancestor class or interface GType
 */
export function typeIsA(type: GType, isAType: GType): boolean {
    return g_type_is_a(type, isAType) as boolean;
}

/**
 * Returns the direct parent type of `type`, or the invalid GType (`0`) when
 * `type` has no parent.
 *
 * @param type - The GType whose parent to resolve
 */
export function typeParent(type: GType): GType {
    return g_type_parent(type) as GType;
}

/**
 * Returns the interface types that `type` and its ancestors implement.
 *
 * @param type - The GType whose implemented interfaces to enumerate
 */
export function typeInterfaces(type: GType): GType[] {
    const nInterfacesRef = createRef(0);
    return g_type_interfaces(type, nInterfacesRef) as GType[];
}
