import {
    type NativeHandle,
    registerClass as nativeRegisterClass,
    type RegisterClassNativeOptions,
    type RegisterClassPropertyDefinition,
    type RegisterClassSignalDefinition,
    type RegisterClassVfuncDefinition,
} from "@gtkx/native";
import type { ParamSpec } from "./generated/gobject/param-spec.js";
import { type NativeClass, NativeObject } from "./object.js";
import { registerNativeClass } from "./registry.js";

/**
 * Property installed on a custom subclass via {@link registerClass}.
 *
 * The `ParamSpec` is constructed up-front by the caller using any
 * `paramSpec*` binding (`paramSpecBoolean`, `paramSpecInt`, etc.) and then
 * forwarded to native, which calls `g_object_class_install_property` during
 * class initialization. Property ids are assigned 1-based from the array order.
 */
export type RegisterClassProperty = {
    /** `ParamSpec` describing the property. */
    readonly pspec: ParamSpec;
};

/**
 * Signal definition installed on a custom subclass via {@link registerClass}.
 *
 * Wraps `g_signal_newv`. When a `defaultHandler` is provided it is invoked as
 * the default class closure on every emission; the supplied
 * `defaultHandlerArgTypes` and `defaultHandlerReturnType` describe how to
 * marshal `GValue` arguments to and from JavaScript.
 */
export type RegisterClassSignal = RegisterClassSignalDefinition;

/**
 * Virtual function override installed on a custom subclass via
 * {@link registerClass}.
 *
 * Every field except `fn` is supplied by codegen via the per-namespace
 * class-struct registries (e.g. `GObjectClass.setProperty` from
 * `@gtkx/ffi/generated/gobject/object-class`); spreading that descriptor
 * into the call site fills in the byte offset, FFI argument types, return
 * type, and diagnostic names so users only provide the implementation.
 *
 * `byteOffset` is the offset (in bytes) of the vfunc slot inside the class
 * struct, relative to the class struct base. The `kind: "class"` tag
 * prevents an interface vfunc descriptor (`kind: "interface"`) from being
 * passed to `RegisterClassOptions.vfuncs`, since interface vfunc offsets
 * are relative to the interface struct, not the class struct.
 */
export type RegisterClassVfunc = {
    /** Discriminator marking this descriptor as a class vfunc. */
    readonly kind: "class";
    /** Owning class name, for documentation and diagnostics (e.g. `"GObjectClass"`). */
    readonly className: string;
    /** Vfunc slot name, for documentation and diagnostics (e.g. `"finalize"`). */
    readonly vfuncName: string;
    /** Byte offset of the vfunc slot within the class struct. */
    readonly byteOffset: number;
    /** FFI argument types matching the vfunc signature. */
    readonly argTypes: RegisterClassVfuncDefinition["argTypes"];
    /** FFI return type matching the vfunc signature. */
    readonly returnType: RegisterClassVfuncDefinition["returnType"];
    /** Implementation invoked on each vfunc call. */
    readonly fn: RegisterClassVfuncDefinition["fn"];
};

/**
 * Generated descriptor of a class vfunc slot, i.e. {@link RegisterClassVfunc}
 * minus the user-supplied implementation. Codegen emits one of these per
 * vfunc on each class-struct registry (e.g. `GObjectClass.setProperty`)
 * so users construct the full {@link RegisterClassVfunc} by spreading the
 * descriptor and adding `fn`.
 */
export type RegisterClassVfuncDescriptor = Omit<RegisterClassVfunc, "fn">;

/**
 * Virtual function override installed on a custom subclass's interface
 * vtable via {@link registerClass}. Identical shape to {@link RegisterClassVfunc}
 * except for the `kind: "interface"` discriminator, which keeps the type
 * system from accepting an interface descriptor in `RegisterClassOptions.vfuncs`.
 */
export type RegisterClassInterfaceVfunc = {
    /** Discriminator marking this descriptor as an interface vfunc. */
    readonly kind: "interface";
    /** Owning interface struct name, for documentation and diagnostics (e.g. `"GIconIface"`). */
    readonly className: string;
    /** Vfunc slot name, for documentation and diagnostics (e.g. `"hash"`). */
    readonly vfuncName: string;
    /** Byte offset of the vfunc slot within the interface struct. */
    readonly byteOffset: number;
    /** FFI argument types matching the vfunc signature. */
    readonly argTypes: RegisterClassVfuncDefinition["argTypes"];
    /** FFI return type matching the vfunc signature. */
    readonly returnType: RegisterClassVfuncDefinition["returnType"];
    /** Implementation invoked on each vfunc call. */
    readonly fn: RegisterClassVfuncDefinition["fn"];
};

/**
 * Generated descriptor of an interface vfunc slot, i.e.
 * {@link RegisterClassInterfaceVfunc} minus the user-supplied implementation.
 * Codegen emits one of these per vfunc on each interface-struct registry
 * (e.g. `GIconIface.hash`) so users construct the full
 * {@link RegisterClassInterfaceVfunc} by spreading the descriptor and adding `fn`.
 */
export type RegisterClassInterfaceVfuncDescriptor = Omit<RegisterClassInterfaceVfunc, "fn">;

/**
 * Interface implementation installed on a custom subclass via
 * {@link registerClass}. Each interface entry produces one
 * `g_type_add_interface_static` call against the new GType, attaching the
 * supplied vfunc trampolines into the interface vtable.
 */
export type RegisterClassInterface = {
    /** GType of the interface to implement. */
    readonly gtype: number;
    /** Vfunc overrides for the interface's vtable. */
    readonly vfuncs: readonly RegisterClassInterfaceVfunc[];
};

/**
 * Options accepted by {@link registerClass}.
 */
export type RegisterClassOptions = {
    /**
     * The `GType` name to register under. Must be globally unique. Defaults
     * to `klass.name`.
     */
    readonly gtypeName?: string;
    /** Properties installed on the new class. */
    readonly properties?: readonly RegisterClassProperty[];
    /** Signals defined on the new class. */
    readonly signals?: readonly RegisterClassSignal[];
    /** Virtual function overrides installed into the new class struct. */
    readonly vfuncs?: readonly RegisterClassVfunc[];
    /** Interfaces implemented by the new class, with their vfunc overrides. */
    readonly interfaces?: readonly RegisterClassInterface[];
};

/**
 * Registers a JavaScript subclass of a `NativeObject` as a real `GType`
 * derived from a parent `GType` supplied by the caller.
 *
 * The new type is created via `g_type_register_static`, sized to match the
 * parent's class and instance struct layouts. Any supplied properties,
 * signals, and vfunc overrides are installed atomically during class
 * initialization. The class is added to the FFI runtime registry so any
 * handle whose runtime type is the new `GType` resolves back to this
 * JavaScript class.
 *
 * @param klass - A class that extends a registered `NativeObject` subclass
 * @param parentGType - The parent's `GType` identifier (use the parent module's
 *     exported `*_get_type()` function)
 * @param options - Optional overrides for the registration
 * @returns The same `klass`, for chaining
 *
 * @example
 * ```tsx
 * import { gtk_button_get_type } from "@gtkx/ffi/generated/gtk/button.js";
 *
 * class MyCustomButton extends Gtk.Button {}
 * registerClass(MyCustomButton, gtk_button_get_type());
 * const button = new MyCustomButton();
 * ```
 */
export function registerClass<T extends NativeClass>(
    klass: T,
    parentGType: number,
    options: RegisterClassOptions = {},
): T {
    if (!(klass.prototype instanceof NativeObject)) {
        throw new TypeError(`registerClass: ${klass.name} must extend a NativeObject subclass`);
    }
    if (parentGType === 0) {
        throw new Error(`registerClass: ${klass.name} parent GType is invalid (G_TYPE_INVALID)`);
    }

    const name = options.gtypeName ?? klass.name;
    if (!name) {
        throw new Error("registerClass: cannot derive a GType name (anonymous class with no gtypeName option)");
    }

    const newGtype = nativeRegisterClass(name, parentGType, toNativeOptions(options));
    registerNativeClass(klass, newGtype);

    return klass;
}

function toNativeOptions(options: RegisterClassOptions): RegisterClassNativeOptions | undefined {
    const { properties, signals, vfuncs, interfaces } = options;
    if (!properties && !signals && !vfuncs && !interfaces) {
        return undefined;
    }
    signals?.forEach(validateSignal);
    return {
        properties: properties?.map(toNativeProperty),
        signals,
        vfuncs,
        interfaces: interfaces?.map((iface) => ({ gtype: iface.gtype, vfuncs: iface.vfuncs })),
    };
}

function toNativeProperty(property: RegisterClassProperty): RegisterClassPropertyDefinition {
    const handle = (property.pspec as { handle?: NativeHandle }).handle;
    if (!handle) {
        throw new Error("registerClass: property pspec must be a NativeObject wrapping a GParamSpec");
    }
    return { pspec: handle };
}

function validateSignal(signal: RegisterClassSignal): void {
    if (signal.defaultHandler && (!signal.defaultHandlerArgTypes || !signal.defaultHandlerReturnType)) {
        throw new Error(
            `registerClass: signal '${signal.name}' has a defaultHandler but is missing defaultHandlerArgTypes or defaultHandlerReturnType`,
        );
    }
}
