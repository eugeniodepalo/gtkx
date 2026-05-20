import type { NativeHandle } from "@gtkx/native";
import type { GType } from "../src/generated/gobject/gobject.js";
import { G_TYPE_INVALID, typeIsA } from "../src/gtype.js";
import { getInstanceGType } from "../src/native.js";

/**
 * Tests whether a `GTypeInstance`-compatible handle is an instance of `gtype`.
 *
 * Composes {@link getInstanceGType} with `g_type_is_a`, so the check covers
 * both class inheritance and interface implementation in a single call.
 *
 * @param handle - Handle to a live GObject-compatible instance
 * @param gtype - GType identifier of the target type
 */
export function instanceIsA(handle: NativeHandle, gtype: GType): boolean {
    const instanceGtype: GType = getInstanceGType(handle);
    if (instanceGtype === G_TYPE_INVALID) return false;
    return typeIsA(instanceGtype, gtype);
}
