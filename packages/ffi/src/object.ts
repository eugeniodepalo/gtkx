import type { NativeHandle } from "@gtkx/native";

/**
 * Base class for all GTK/GLib object wrappers.
 *
 * Provides common functionality for native object representation including
 * type metadata and equality comparison.
 *
 * @see {@link getNativeObject} for creating wrapper instances
 */
export abstract class NativeObject {
    /** The GLib type name (e.g., "GtkButton", "AdwHeaderBar") */
    static readonly glibTypeName: string;

    /** The type category: gobject, interface, boxed, struct, or fundamental */
    static readonly objectType: "gobject" | "interface" | "boxed" | "struct" | "fundamental";

    /** The underlying native handle */
    handle: NativeHandle;

    // biome-ignore lint/suspicious/noExplicitAny: Required for NativeClass type compatibility
    constructor(..._args: any[]) {
        this.handle = undefined as unknown as NativeHandle;
    }
}

/**
 * Constructor type for native object wrapper classes.
 *
 * @typeParam T - The wrapped object type
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for contravariant behavior
export type NativeClass<T extends NativeObject = NativeObject> = typeof NativeObject & (new (...args: any[]) => T);

export type { NativeHandle };
