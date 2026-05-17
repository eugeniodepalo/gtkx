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
import type { NativeClass } from "./handles.js";
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
 * Error thrown by generated bindings when a throwing GTK/GLib callable fails.
 *
 * Carries the failing `GError`'s domain quark and code. Discriminate it at the
 * catch site with `instanceof` against a generated error-domain enum rather
 * than referencing this class directly.
 *
 * @internal Thrown by generated bindings; not part of the public API.
 */
export class NativeError extends Error {
    /** Quark of the GLib error domain the failure belongs to. */
    readonly domain: number;
    /** Domain-specific error code. */
    readonly code: number;

    /**
     * @param gerror - The populated `GError` wrapper from a throwing callable.
     */
    constructor(gerror: GError) {
        super(gerror.message ?? "Unknown error");

        this.name = "NativeError";
        this.domain = gerror.domain;
        this.code = gerror.code;

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
 * An error-domain enum: a frozen member map that also acts as the right-hand
 * side of an `instanceof` check.
 *
 * `error instanceof SomeErrorDomain` is true when `error` was thrown from the
 * matching GLib error domain, letting callers discriminate failures without
 * referencing the internal error class.
 *
 * @typeParam T - The enum's member-name to numeric-value map.
 */
export type ErrorDomain<T extends Record<string, number>> = Readonly<T> & {
    readonly [Symbol.hasInstance]: (
        value: unknown,
    ) => value is Error & { readonly domain: number; readonly code: number };
};

/**
 * Builds an error-domain enum whose `instanceof` checks match errors thrown
 * from the given GLib error domain.
 *
 * The domain quark is resolved lazily on first `instanceof` check, since the
 * generated `quark_from_string` binding may be declared after the enum in its
 * module.
 *
 * @param resolveDomain - Resolves the quark of the GLib error domain.
 * @param members - The enum's member-name to numeric-value map.
 * @returns A frozen enum object usable as an `instanceof` right-hand side.
 *
 * @internal Invoked by generated bindings.
 */
export function makeErrorDomain<const T extends Record<string, number>>(
    resolveDomain: () => number,
    members: T,
): ErrorDomain<T> {
    let domain: number | undefined;
    const hasInstance = (value: unknown): boolean => {
        domain ??= resolveDomain();
        return value instanceof NativeError && value.domain === domain;
    };
    const enumObject: Record<string, unknown> = { ...members };
    Object.defineProperty(enumObject, Symbol.hasInstance, { value: hasInstance });
    return Object.freeze(enumObject) as ErrorDomain<T>;
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
