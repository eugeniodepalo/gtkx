/**
 * Re-export the helpers FIRST so that ES modules visit `./helpers.js`
 * before the generated-code imports below. Generated bindings call `t.fn(...)`
 * at module load time, which would hit a TDZ error if `helpers.js` were
 * evaluated after the generated modules in our import-graph cycle.
 */

export type { ArrayKind, ArrayOptions, Ownership, TrampolineOptions, TrampolineScope } from "./helpers.js";
export { alloc, call, freeze, getNativeId, read, t, unfreeze, write } from "./helpers.js";

import { getInstanceGType, type NativeHandle, type Ref } from "@gtkx/native";
import type { Error as GError } from "./generated/glib/glib.js";
import type { GType } from "./generated/gobject/gobject.js";
import { G_TYPE_INVALID, typeIsA } from "./gtype.js";
import { type NativeClass, setHandle, tryGetHandle } from "./handles.js";
import { getNativeObject } from "./registry.js";

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
    const instanceGtype: GType = getInstanceGType(handle);
    if (instanceGtype === G_TYPE_INVALID) return false;
    return typeIsA(instanceGtype, gtype);
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
 * Throws a {@link NativeError} when a `GError` out-parameter holds an error.
 *
 * Generated bindings for throwing callables pass the populated error ref and
 * the GLib `Error` wrapper class. A no-op when the ref is empty.
 *
 * @param error - Out-parameter ref populated by the FFI call
 * @param errorClass - The GLib `Error` wrapper class
 *
 * @internal Module-private helper invoked by generated bindings.
 */
export function checkError(error: Ref<NativeHandle | null>, errorClass: NativeClass<GError>): void {
    if (error.value !== null) {
        throw new NativeError(getNativeObject(error.value, errorClass));
    }
}

/**
 * Throws an `Error` reporting that a callable cannot be marshalled through the
 * `@gtkx/ffi` runtime.
 *
 * Generated bindings expose every method and function the contract declares,
 * including ones whose signature the FFI layer cannot marshal. Those members
 * delegate to this helper so a call surfaces a descriptive error instead of a
 * silent `undefined`. The `never` return type lets a delegating method body
 * (`return throwUnsupported(...)`) be inferred as `never`.
 *
 * @param message - Description of the unsupported callable.
 * @returns Never returns; always throws.
 *
 * @internal Module-private helper invoked by generated bindings.
 */
export function throwUnsupported(message: string): never {
    throw new Error(message);
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
    if (ifaceGType === G_TYPE_INVALID) return null;
    if (!instanceIsA(handle, ifaceGType)) return null;

    const instance = Object.create(iface.prototype) as T;
    setHandle(instance, handle);
    return instance;
}
