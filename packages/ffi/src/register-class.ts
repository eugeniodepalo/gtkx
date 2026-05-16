import {
    registerClass as nativeRegisterClass,
    type RegisterClassNativeOptions,
    type RegisterClassVfuncDefinition,
} from "@gtkx/native";
import { CONSTRUCTION_META } from "./construction-meta.js";
import type { GType } from "./generated/gobject/gobject.js";
import { typeInterfaces } from "./gtype.js";
import { getClassStruct, type NativeClass } from "./handles.js";
import { getClassGType, registerNativeClass } from "./registry.js";

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
 * `registerClass` discovers methods whose camelCase names match vfuncs of an
 * interface the registered class inherits from its parent.
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
 * Options accepted by {@link registerClass}.
 */
export type RegisterClassOptions = {
    /**
     * The `GType` name to register under. Must be globally unique. Defaults
     * to `klass.name`.
     */
    readonly gtypeName?: string;
};

type VfuncFn = RegisterClassVfuncDefinition["fn"];

type DiscoveredClassVfunc = RegisterClassVfuncDescriptor & {
    readonly methodName: string;
    readonly fn: VfuncFn;
};

type DiscoveredInterfaceVfunc = RegisterClassInterfaceVfuncDescriptor & {
    readonly methodName: string;
    readonly fn: VfuncFn;
};

type InterfaceVfuncBinding = {
    readonly gtype: number;
    readonly vfuncs: readonly DiscoveredInterfaceVfunc[];
};

/**
 * Registers a JavaScript subclass of a generated native class as a real
 * `GType` derived from the parent class's `GType`.
 *
 * The parent class's `GType` is resolved automatically from the prototype
 * chain. Virtual function overrides are auto-discovered: every own method on
 * the subclass whose camelCase name matches a vfunc on an ancestor's class
 * struct, or a vfunc of an interface the parent already implements, is
 * registered as the override implementation. A class vfunc takes precedence
 * when a method name matches both. Mirrors node-gtk's `registerClass`.
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
    const claimedMethodNames = new Set(classVfuncs.map((vfunc) => vfunc.methodName));
    const interfaceBindings = discoverInheritedInterfaceVfuncs(klass, parentGType, claimedMethodNames);

    const nativeOptions = toNativeOptions(classVfuncs, interfaceBindings);
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

function discoverClassVfuncs(klass: NativeClass): DiscoveredClassVfunc[] {
    const proto = (klass as { prototype: Record<string, VfuncFn> }).prototype;
    const result: DiscoveredClassVfunc[] = [];
    for (const methodName of ownInstanceMethodNames(klass)) {
        const descriptor = findClassVfuncDescriptor(klass, methodName);
        if (!descriptor) continue;
        result.push({ ...descriptor, methodName, fn: proto[methodName] as VfuncFn });
    }
    return result;
}

/**
 * Discovers vfunc overrides for interfaces the new class inherits from its
 * parent. Each interface the parent type conforms to is checked for own
 * methods on `klass` whose camelCase name matches one of its vfuncs. Method
 * names already claimed by a class vfunc are skipped, so a class vtable slot
 * always wins over an interface slot of the same name.
 */
function discoverInheritedInterfaceVfuncs(
    klass: NativeClass,
    parentGType: GType,
    claimedMethodNames: ReadonlySet<string>,
): InterfaceVfuncBinding[] {
    const bindings: InterfaceVfuncBinding[] = [];
    for (const interfaceGType of typeInterfaces(parentGType)) {
        const vfuncs = discoverInterfaceVfuncs(klass, interfaceGType, claimedMethodNames);
        if (vfuncs.length > 0) {
            bindings.push({ gtype: interfaceGType as unknown as number, vfuncs });
        }
    }
    return bindings;
}

function discoverInterfaceVfuncs(
    klass: NativeClass,
    interfaceGType: GType,
    claimedMethodNames: ReadonlySet<string>,
): DiscoveredInterfaceVfunc[] {
    const struct = findInterfaceClassStruct(interfaceGType);
    if (!struct) return [];
    const proto = (klass as { prototype: Record<string, VfuncFn> }).prototype;
    const result: DiscoveredInterfaceVfunc[] = [];
    for (const methodName of ownInstanceMethodNames(klass)) {
        if (claimedMethodNames.has(methodName)) continue;
        const descriptor = struct[methodName];
        if (!descriptor || (descriptor as { kind?: string }).kind !== "interface") continue;
        result.push({
            ...(descriptor as RegisterClassInterfaceVfuncDescriptor),
            methodName,
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
    classVfuncs: readonly DiscoveredClassVfunc[],
    interfaceBindings: readonly InterfaceVfuncBinding[],
): RegisterClassNativeOptions | undefined {
    const hasInterfaces = interfaceBindings.length > 0;
    const hasClassVfuncs = classVfuncs.length > 0;
    if (!hasClassVfuncs && !hasInterfaces) {
        return undefined;
    }
    return {
        vfuncs: hasClassVfuncs ? classVfuncs : undefined,
        interfaceVfuncs: hasInterfaces ? interfaceBindings : undefined,
    };
}
