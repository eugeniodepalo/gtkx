import { registerClass as nativeRegisterClass } from "@gtkx/native";
import { typeFromName } from "./generated/gobject/functions.js";
import { type NativeClass, NativeObject } from "./object.js";
import { registerNativeClass } from "./registry.js";

/**
 * Options accepted by {@link registerClass}.
 */
export type RegisterClassOptions = {
    /**
     * The `GType` name to register under. Must be globally unique. Defaults
     * to `klass.glibTypeName` (when set as an own property on the class) and
     * finally `klass.name`.
     */
    readonly gtypeName?: string;
};

type ClassWithGetGType = NativeClass & { readonly getGType?: () => number };

/**
 * Registers a JavaScript subclass of a `NativeObject` as a real `GType`
 * derived from its parent.
 *
 * The new type is created via `g_type_register_static`, sized to match the
 * parent's class and instance struct layouts. The class is also added to
 * the FFI runtime registry so any handle whose runtime type is the new
 * `GType` resolves back to this JavaScript class.
 *
 * Virtual function overrides are not installed by this helper.
 *
 * @param klass - A class that extends a registered `NativeObject` subclass
 * @param options - Optional overrides for the registration
 * @returns The same `klass`, for chaining
 *
 * @example
 * ```tsx
 * class MyCustomButton extends Gtk.Button {}
 * registerClass(MyCustomButton);
 * const button = new MyCustomButton();
 * ```
 */
export function registerClass<T extends NativeClass>(klass: T, options: RegisterClassOptions = {}): T {
    if (!(klass.prototype instanceof NativeObject)) {
        throw new TypeError(`registerClass: ${klass.name} must extend a NativeObject subclass`);
    }

    const parent = Object.getPrototypeOf(klass.prototype).constructor as ClassWithGetGType | undefined;
    const parentGlibTypeName = parent?.glibTypeName;
    if (!parentGlibTypeName) {
        throw new Error(`registerClass: ${klass.name} has no registered GType parent`);
    }

    if (typeof parent?.getGType === "function") {
        parent.getGType();
    }

    const parentGtype = typeFromName(parentGlibTypeName);
    if (parentGtype === 0) {
        throw new Error(`registerClass: parent GType '${parentGlibTypeName}' is not registered with GLib`);
    }

    const ownGlibTypeName = Object.hasOwn(klass, "glibTypeName") ? klass.glibTypeName : undefined;
    const name = options.gtypeName ?? ownGlibTypeName ?? klass.name;
    if (!name) {
        throw new Error("registerClass: cannot derive a GType name (anonymous class with no gtypeName option)");
    }

    nativeRegisterClass(name, parentGtype);

    if (klass.glibTypeName !== name) {
        Object.defineProperty(klass, "glibTypeName", {
            configurable: true,
            value: name,
            writable: false,
        });
    }

    registerNativeClass(klass);

    return klass;
}
