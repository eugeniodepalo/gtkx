/**
 * Re-export the helpers FIRST so that ES modules visit `./helpers.js`
 * before the generated-code imports below. Generated bindings call `t.fn(...)`
 * at module load time, which would hit a TDZ error if `helpers.js` were
 * evaluated after the generated modules in our import-graph cycle.
 */

export type { ArrayKind, ArrayOptions, Ownership, TrampolineOptions, TrampolineScope } from "./helpers.js";
export { alloc, call, freeze, getNativeId, read, t, unfreeze, write } from "./helpers.js";

import { getInstanceGType, type NativeHandle } from "@gtkx/native";
import type { Error as GError } from "./generated/glib/glib.js";
import type { GType } from "./generated/gobject/gobject.js";
import { typeIsA } from "./generated/gobject/gobject.js";
import { type NativeClass, setHandle, tryGetHandle } from "./handles.js";

export { getInstanceGType } from "@gtkx/native";
export type { NativeClass, NativeHandle } from "./handles.js";

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
    const instanceGtype = getInstanceGType(handle);
    if (instanceGtype === 0) return false;
    return typeIsA(instanceGtype as unknown as GType, gtype);
}

/**
 * Error class wrapping GLib GError structures.
 *
 * Provides access to the error domain, code, and message from
 * native GTK/GLib errors.
 *
 * @example
 * ```tsx
 * try {
 *   file.loadContents();
 * } catch (error) {
 *   if (error instanceof NativeError) {
 *     console.log(`GLib error ${error.domain}:${error.code}: ${error.message}`);
 *   }
 * }
 * ```
 */
export class NativeError extends Error {
    readonly gerror: GError;

    getDomain(): number {
        return this.gerror.domain;
    }

    getCode(): number {
        return this.gerror.code;
    }

    /**
     * Creates a NativeError from a GError instance.
     *
     * @param gerror - GError wrapper instance
     */
    constructor(gerror: GError) {
        super(gerror.message ?? "Unknown error");

        this.gerror = gerror;
        this.name = "NativeError";

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, NativeError);
        }
    }
}

/**
 * Gets a native object as a specific interface type if it implements that interface.
 *
 * Uses GLib's type system to check if the object implements the specified
 * interface, and returns a wrapped instance if it does.
 *
 * @typeParam T - The interface type
 * @param obj - The native object to check
 * @param iface - The interface class
 * @param ifaceGType - The interface's GType identifier (use the interface
 *     module's exported `*_get_type()` function)
 * @returns The wrapped interface instance, or null if not implemented
 *
 * @example
 * ```tsx
 * import { gtk_editable_get_type } from "@gtkx/ffi/generated/gtk/editable.js";
 *
 * const editable = getNativeInterface(widget, Gtk.Editable, gtk_editable_get_type());
 * if (editable) {
 *     const text = editable.getText();
 * }
 * ```
 */
export function getNativeInterface<T extends object>(obj: object, iface: NativeClass<T>, ifaceGType: GType): T | null {
    const handle = tryGetHandle(obj);
    if (!handle) return null;
    if ((ifaceGType as unknown as number) === 0) return null;
    if (!instanceIsA(handle, ifaceGType)) return null;

    const instance = Object.create(iface.prototype) as T;
    setHandle(instance, handle);
    return instance;
}
