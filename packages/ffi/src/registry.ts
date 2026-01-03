import { typeFromName, typeName, typeParent } from "./generated/gobject/functions.js";
import type { NativeClass } from "./native/object.js";

const registry = new Map<string, NativeClass>();

/**
 * Registers a native class for type resolution.
 *
 * Called automatically by generated bindings. Can be used to register
 * custom subclasses.
 *
 * @param cls - The native class to register
 *
 * @example
 * ```tsx
 * import { registerNativeClass } from "@gtkx/ffi";
 *
 * class MyCustomWidget extends Gtk.Widget {
 *   static readonly glibTypeName = "MyCustomWidget";
 *   // ...
 * }
 * registerNativeClass(MyCustomWidget);
 * ```
 */
export function registerNativeClass(cls: NativeClass): void {
    registry.set(cls.glibTypeName, cls);
}

/**
 * Gets a registered class by its GLib type name.
 *
 * @param glibTypeName - The GLib type name (e.g., "GtkButton")
 * @returns The registered class, or null if not found
 */
export function getNativeClass(glibTypeName: string): NativeClass | null {
    return registry.get(glibTypeName) ?? null;
}

/**
 * Finds a native class by walking the type hierarchy.
 *
 * If the exact type is not registered, walks up the parent chain
 * until a registered type is found.
 *
 * @param glibTypeName - The GLib type name to start from
 * @returns The closest registered parent class, or null
 */
export const findNativeClass = (glibTypeName: string): NativeClass | null => {
    let currentTypeName: string | null = glibTypeName;

    while (currentTypeName) {
        const cls = getNativeClass(currentTypeName);
        if (cls) return cls;

        const gtype = typeFromName(currentTypeName);
        if (gtype === 0) break;

        const parentGtype = typeParent(gtype);
        if (parentGtype === 0) break;

        currentTypeName = typeName(parentGtype);
    }

    return null;
};
