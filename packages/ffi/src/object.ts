import type { NativeHandle } from "@gtkx/native";

export type { NativeHandle } from "@gtkx/native";

/**
 * Base class for all GLib/GTK native objects managed by the FFI layer.
 *
 * Every generated binding (GObject, boxed type, interface, etc.) extends
 * this class, which holds the raw native handle used for FFI calls.
 */
export abstract class NativeObject {
    // biome-ignore lint/complexity/useLiteralKeys: bracket syntax required to declare the `constructor` field type without overriding the actual constructor signature
    declare ["constructor"]: NativeClass;
    handle: NativeHandle;

    constructor(handle: NativeHandle) {
        this.handle = handle;
    }
}

/**
 * Constructor type for a {@link NativeObject} subclass.
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for contravariant constructor type compatibility
export type NativeClass<T extends NativeObject = NativeObject> = new (...args: any[]) => T;
