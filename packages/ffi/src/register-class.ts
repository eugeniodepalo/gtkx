import {
    type NativeHandle,
    registerClass as nativeRegisterClass,
    type RegisterClassNativeOptions,
    type RegisterClassPropertyDefinition,
    type RegisterClassSignalDefinition,
    type RegisterClassVfuncDefinition,
} from "@gtkx/native";
import { typeFromName } from "./generated/gobject/functions.js";
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
 * struct, relative to the class struct base. `className` and `vfuncName`
 * are recorded only for diagnostic purposes.
 */
export type RegisterClassVfunc = {
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
 * Generated descriptor of a vfunc slot, i.e. {@link RegisterClassVfunc}
 * minus the user-supplied implementation. Codegen emits one of these per
 * vfunc on each class struct registry (e.g. `GObjectClass.setProperty`)
 * so users construct the full {@link RegisterClassVfunc} by spreading the
 * descriptor and adding `fn`.
 */
export type RegisterClassVfuncDescriptor = Omit<RegisterClassVfunc, "fn">;

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
    /** Properties installed on the new class. */
    readonly properties?: readonly RegisterClassProperty[];
    /** Signals defined on the new class. */
    readonly signals?: readonly RegisterClassSignal[];
    /** Virtual function overrides installed into the new class struct. */
    readonly vfuncs?: readonly RegisterClassVfunc[];
};

type ClassWithGetGType = NativeClass & { readonly getGType?: () => number };

/**
 * Registers a JavaScript subclass of a `NativeObject` as a real `GType`
 * derived from its parent.
 *
 * The new type is created via `g_type_register_static`, sized to match the
 * parent's class and instance struct layouts. Any supplied properties,
 * signals, and vfunc overrides are installed atomically during class
 * initialization. The class is added to the FFI runtime registry so any
 * handle whose runtime type is the new `GType` resolves back to this
 * JavaScript class.
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

    nativeRegisterClass(name, parentGtype, toNativeOptions(options));

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

function toNativeOptions(options: RegisterClassOptions): RegisterClassNativeOptions | undefined {
    const { properties, signals, vfuncs } = options;
    if (!properties && !signals && !vfuncs) {
        return undefined;
    }
    signals?.forEach(validateSignal);
    return {
        properties: properties?.map(toNativeProperty),
        signals,
        vfuncs,
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
