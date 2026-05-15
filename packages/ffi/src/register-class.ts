import {
    registerClass as nativeRegisterClass,
    type RegisterClassNativeOptions,
    type RegisterClassPropertyDefinition,
    type RegisterClassSignalDefinition,
    type RegisterClassVfuncDefinition,
} from "@gtkx/native";
import { CONSTRUCTION_META } from "./construction-meta.js";
import type { GType, ParamSpec } from "./generated/gobject/gobject.js";
import { getClassStruct, type NativeClass, tryGetHandle } from "./handles.js";
import { getClassGType, registerNativeClass } from "./registry.js";

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
export type RegisterClassSignal = Omit<RegisterClassSignalDefinition, "returnGType" | "paramGTypes"> & {
    /** `GType` of the value returned by the signal (use `Type.NONE` for void). */
    readonly returnGType: GType;
    /** `GType`s of the signal's parameters in order. */
    readonly paramGTypes: readonly GType[];
};

/**
 * Generated descriptor of a class vfunc slot. Codegen emits one per vfunc
 * on each class-struct registry (e.g. `GObjectClass.setProperty`). Users
 * never construct these manually — they are resolved automatically when
 * `registerClass` discovers methods on a subclass whose camelCase name
 * matches a vfunc declared on an ancestor class struct.
 */
export type RegisterClassVfuncDescriptor = {
    readonly kind: "class";
    readonly className: string;
    readonly vfuncName: string;
    readonly byteOffset: number;
    readonly argTypes: RegisterClassVfuncDefinition["argTypes"];
    readonly returnType: RegisterClassVfuncDefinition["returnType"];
};

/**
 * Generated descriptor of an interface vfunc slot. Codegen emits one per
 * vfunc on each interface-struct registry (e.g. `GIconIface.hash`). Users
 * never construct these manually — they are resolved automatically when
 * `registerClass` discovers methods whose camelCase names match interface
 * vfuncs on classes flagged via {@link RegisterClassInterface}.
 */
export type RegisterClassInterfaceVfuncDescriptor = {
    readonly kind: "interface";
    readonly className: string;
    readonly vfuncName: string;
    readonly byteOffset: number;
    readonly argTypes: RegisterClassVfuncDefinition["argTypes"];
    readonly returnType: RegisterClassVfuncDefinition["returnType"];
};

/**
 * Interface implementation installed on a custom subclass via
 * {@link registerClass}. Each interface entry produces one
 * `g_type_add_interface_static` call against the new GType. Vfunc overrides
 * for the interface are auto-discovered: any own method on `klass` whose
 * camelCase name matches an interface vfunc on `gtype`'s class struct is
 * registered automatically.
 */
export type RegisterClassInterface = {
    /** GType of the interface to implement. */
    readonly gtype: GType;
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
    /** Interfaces implemented by the new class. */
    readonly interfaces?: readonly RegisterClassInterface[];
};

type VfuncFn = RegisterClassVfuncDefinition["fn"];

/**
 * Registers a JavaScript subclass of a generated native class as a real
 * `GType` derived from the parent class's `GType`.
 *
 * The parent class's `GType` is resolved automatically from the prototype
 * chain. Virtual function overrides are auto-discovered: every own method
 * on the subclass whose camelCase name matches a vfunc on an ancestor's
 * class struct is registered as the override implementation. Mirrors
 * node-gtk's `registerClass`.
 *
 * @example
 * ```tsx
 * class MyButton extends Gtk.Button {
 *     activate() {
 *         // Overrides the GtkButtonClass.activate vfunc automatically.
 *     }
 * }
 * registerClass(MyButton);
 * ```
 */
export function registerClass<T extends NativeClass>(klass: T, options: RegisterClassOptions = {}): T {
    if (!hasRegisteredAncestor(klass)) {
        throw new TypeError(`registerClass: ${klass.name} must extend a registered native class`);
    }

    const parentGType = resolveParentGType(klass);
    if ((parentGType as unknown as number) === 0) {
        throw new Error(`registerClass: ${klass.name} parent GType is invalid (G_TYPE_INVALID)`);
    }

    const name = options.gtypeName ?? klass.name;
    if (!name) {
        throw new Error("registerClass: cannot derive a GType name (anonymous class with no gtypeName option)");
    }

    const classVfuncs = discoverClassVfuncs(klass);
    const interfaces = options.interfaces ?? [];
    const interfaceBindings = interfaces.map((iface) => ({
        gtype: iface.gtype as unknown as number,
        vfuncs: discoverInterfaceVfuncs(klass, iface.gtype),
    }));

    const nativeOptions = toNativeOptions(options, classVfuncs, interfaceBindings);
    const newGtype = nativeRegisterClass(name, parentGType as unknown as number, nativeOptions) as unknown as GType;
    registerNativeClass(klass, newGtype);

    return klass;
}

function hasRegisteredAncestor(klass: NativeClass): boolean {
    let current: NativeClass | null = klass;
    while (current && current !== (Function.prototype as unknown as NativeClass)) {
        if (CONSTRUCTION_META.has(current)) return true;
        current = Object.getPrototypeOf(current) as NativeClass | null;
    }
    return false;
}

function resolveParentGType(klass: NativeClass): GType {
    let current = Object.getPrototypeOf(klass) as NativeClass | null;
    while (current && current !== (Function.prototype as unknown as NativeClass)) {
        const gtype = getClassGType(current);
        if ((gtype as unknown as number) !== 0) return gtype;
        current = Object.getPrototypeOf(current) as NativeClass | null;
    }
    return 0 as unknown as GType;
}

const SKIP_PROTOTYPE_NAMES = new Set(["constructor", "_init"]);

function ownInstanceMethodNames(klass: NativeClass): string[] {
    const proto = (klass as { prototype?: object }).prototype;
    if (!proto) return [];
    return Object.getOwnPropertyNames(proto).filter((name) => {
        if (SKIP_PROTOTYPE_NAMES.has(name)) return false;
        return typeof (proto as Record<string, unknown>)[name] === "function";
    });
}

function discoverClassVfuncs(klass: NativeClass): Array<RegisterClassVfuncDescriptor & { fn: VfuncFn }> {
    const proto = (klass as { prototype: Record<string, VfuncFn> }).prototype;
    const result: Array<RegisterClassVfuncDescriptor & { fn: VfuncFn }> = [];
    for (const methodName of ownInstanceMethodNames(klass)) {
        const descriptor = findClassVfuncDescriptor(klass, methodName);
        if (!descriptor) continue;
        result.push({ ...descriptor, fn: proto[methodName] as VfuncFn });
    }
    return result;
}

function discoverInterfaceVfuncs(
    klass: NativeClass,
    interfaceGType: GType,
): Array<RegisterClassInterfaceVfuncDescriptor & { fn: VfuncFn }> {
    const struct = findInterfaceClassStruct(interfaceGType);
    if (!struct) return [];
    const proto = (klass as { prototype: Record<string, VfuncFn> }).prototype;
    const result: Array<RegisterClassInterfaceVfuncDescriptor & { fn: VfuncFn }> = [];
    for (const methodName of ownInstanceMethodNames(klass)) {
        const descriptor = struct[methodName];
        if (!descriptor || (descriptor as { kind?: string }).kind !== "interface") continue;
        result.push({
            ...(descriptor as RegisterClassInterfaceVfuncDescriptor),
            fn: proto[methodName] as VfuncFn,
        });
    }
    return result;
}

function findClassVfuncDescriptor(klass: NativeClass, methodName: string): RegisterClassVfuncDescriptor | null {
    let current: NativeClass | null = Object.getPrototypeOf(klass) as NativeClass | null;
    while (current && current !== (Function.prototype as unknown as NativeClass)) {
        const struct = getClassStruct(current);
        if (struct) {
            const entry = struct[methodName];
            if (entry && (entry as { kind?: string }).kind === "class") {
                return entry as RegisterClassVfuncDescriptor;
            }
        }
        current = Object.getPrototypeOf(current) as NativeClass | null;
    }
    return null;
}

const interfaceClassStructByGType = new Map<number, Readonly<Record<string, unknown>>>();

function findInterfaceClassStruct(gtype: GType): Readonly<Record<string, unknown>> | null {
    return interfaceClassStructByGType.get(gtype as unknown as number) ?? null;
}

/**
 * Registers a runtime mapping from an interface `GType` to its generated
 * class-struct descriptor map so that {@link registerClass} can auto-discover
 * interface vfunc overrides on a subclass. Codegen calls this once per
 * interface at module load.
 *
 * @internal
 */
export function registerInterfaceClassStruct(gtype: GType, struct: Readonly<Record<string, unknown>>): void {
    const id = gtype as unknown as number;
    if (id === 0) return;
    interfaceClassStructByGType.set(id, struct);
}

function toNativeOptions(
    options: RegisterClassOptions,
    classVfuncs: Array<RegisterClassVfuncDescriptor & { fn: VfuncFn }>,
    interfaceBindings: ReadonlyArray<{
        gtype: number;
        vfuncs: ReadonlyArray<RegisterClassInterfaceVfuncDescriptor & { fn: VfuncFn }>;
    }>,
): RegisterClassNativeOptions | undefined {
    const { properties, signals } = options;
    const hasInterfaces = interfaceBindings.length > 0;
    const hasClassVfuncs = classVfuncs.length > 0;
    if (!properties && !signals && !hasClassVfuncs && !hasInterfaces) {
        return undefined;
    }
    signals?.forEach(validateSignal);
    return {
        properties: properties?.map(toNativeProperty),
        signals: signals?.map(toNativeSignal),
        vfuncs: hasClassVfuncs ? classVfuncs : undefined,
        interfaces: hasInterfaces ? interfaceBindings : undefined,
    };
}

function toNativeSignal(signal: RegisterClassSignal): RegisterClassSignalDefinition {
    return {
        ...signal,
        returnGType: signal.returnGType as unknown as number,
        paramGTypes: signal.paramGTypes.map((gtype) => gtype as unknown as number),
    };
}

function toNativeProperty(property: RegisterClassProperty): RegisterClassPropertyDefinition {
    const handle = tryGetHandle(property.pspec);
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
