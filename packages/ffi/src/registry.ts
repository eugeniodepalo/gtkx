import { getInstanceGType, getNativeId, type NativeHandle } from "@gtkx/native";
import type { GType } from "./generated/gobject/gobject.js";
import { typeParent } from "./generated/gobject/gobject.js";
import {
    type NativeClass,
    type NativeObject,
    setClassGTypeLookup,
    setInstanceRegistrar,
    wrapHandle,
} from "./object.js";

const classRegistry = new Map<number, NativeClass>();
const gtypeByClass = new WeakMap<NativeClass, number>();

/**
 * Registers a native class for type resolution.
 *
 * Called automatically by generated bindings. Can be used to register
 * custom subclasses.
 *
 * @param cls - The native class to register
 * @param gtype - The GLib type identifier for the class
 *
 * @example
 * ```tsx
 * import { registerNativeClass } from "@gtkx/ffi";
 * import { my_custom_widget_get_type } from "./my-custom-widget-gtype.js";
 *
 * class MyCustomWidget extends Gtk.Widget {}
 * registerNativeClass(MyCustomWidget, my_custom_widget_get_type());
 * ```
 */
export function registerNativeClass(cls: NativeClass, gtype: GType): void {
    if (gtype !== 0) {
        classRegistry.set(gtype, cls);
        gtypeByClass.set(cls, gtype);
    }
}

/**
 * Returns the GLib type identifier registered for `cls`, or the invalid
 * GType (`0`) when the class has not been registered (e.g. boxed value types).
 */
export function getClassGType(cls: NativeClass): GType {
    return gtypeByClass.get(cls) ?? 0;
}

/**
 * Gets a registered class by its GLib type identifier.
 *
 * @param gtype - The GLib type identifier
 * @returns The registered class, or null if not found
 */
export function getNativeClass(gtype: GType): NativeClass | null {
    return classRegistry.get(gtype) ?? null;
}

/**
 * Finds a native class by walking the type hierarchy.
 *
 * If the exact type is not registered, walks up the parent chain
 * until a registered type is found (unless walkHierarchy is false).
 *
 * @param gtype - The GLib type identifier to start from
 * @param walkHierarchy - Whether to walk up the parent chain (default: true)
 * @returns The closest registered parent class, or null
 */
export const findNativeClass = (gtype: GType, walkHierarchy = true): NativeClass | null => {
    const cls = getNativeClass(gtype);
    if (cls) return cls;

    if (!walkHierarchy) return null;

    let currentGtype = gtype;
    while (currentGtype !== 0) {
        const parentGtype = typeParent(currentGtype);
        if (parentGtype === 0) break;
        const parentCls = getNativeClass(parentGtype);
        if (parentCls) return parentCls;
        currentGtype = parentGtype;
    }

    return null;
};

const objectRegistry = new Map<number, WeakRef<NativeObject>>();

const cleanupObjectRegistry = new FinalizationRegistry<number>((pointerId) => {
    objectRegistry.delete(pointerId);
});

/**
 * Registers a native object in the identity registry.
 *
 * Ensures that the same native pointer always resolves to the same
 * JavaScript wrapper, preserving object identity (`===`). The reference
 * is weak, so objects can still be garbage collected.
 *
 * @param obj - The native object wrapper to register
 */
export function registerNativeObject(obj: NativeObject): void {
    const pointerId = getNativeId(obj.handle);
    objectRegistry.set(pointerId, new WeakRef(obj));
    cleanupObjectRegistry.register(obj, pointerId, obj);
}

setInstanceRegistrar(registerNativeObject);
setClassGTypeLookup(getClassGType);

/**
 * Finds an existing JavaScript wrapper for a native pointer.
 *
 * Looks up the identity registry to find a previously registered wrapper
 * for the given native handle. Returns null if no wrapper exists or if
 * the wrapper has been garbage collected.
 *
 * @param handle - The native handle to look up
 * @returns The existing wrapper, or null if not found
 */
export function findNativeObject(handle: NativeHandle): NativeObject | null {
    const pointerId = getNativeId(handle);
    const ref = objectRegistry.get(pointerId);

    if (!ref) return null;

    const obj = ref.deref();
    if (!obj) {
        objectRegistry.delete(pointerId);
        return null;
    }

    return obj;
}

/**
 * Creates a JavaScript wrapper for a native handle.
 *
 * When a target class is supplied, instantiates that class directly with
 * no identity tracking — used for value-style types (boxed, struct,
 * fundamental, opaque class structures) where each handle is owned per
 * wrapper. When no target class is supplied, resolves the runtime GLib
 * type and reuses the registered wrapper instance, preserving object
 * identity (`===`) for shared GObject pointers.
 *
 * @example
 * ```tsx
 * // Automatic type resolution (identity-tracked GObject)
 * const widget = getNativeObject(widgetHandle);
 *
 * // Explicit type (boxed value, no identity tracking)
 * const rgba = getNativeObject(rgbaHandle, Gdk.RGBA);
 * ```
 */
export function getNativeObject<T extends NativeObject>(handle: NativeHandle, targetType: NativeClass<T>): T;
export function getNativeObject<T extends NativeObject>(
    handle: NativeHandle | null | undefined,
    targetType: NativeClass<T>,
): T | null;
export function getNativeObject(handle: null | undefined): null;
export function getNativeObject(handle: NativeHandle): NativeObject;
export function getNativeObject(handle: NativeHandle | null | undefined): NativeObject | null;
export function getNativeObject(
    handle: NativeHandle | null | undefined,
    targetType?: NativeClass,
): NativeObject | null {
    if (handle === null || handle === undefined) {
        return null;
    }

    if (targetType) {
        return wrapHandle(targetType, handle);
    }

    const existing = findNativeObject(handle);
    if (existing) return existing;

    const runtimeGtype = getInstanceGType(handle);
    if (runtimeGtype === 0) {
        throw new Error("Cannot resolve runtime GLib type from handle");
    }
    const cls = findNativeClass(runtimeGtype);
    if (!cls) {
        throw new Error(`Expected registered GLib type, got gtype ${String(runtimeGtype)}`);
    }

    const instance = wrapHandle(cls, handle);
    registerNativeObject(instance);
    return instance;
}

/**
 * Creates a JavaScript wrapper for a native handle known to implement
 * a specific GObject interface.
 *
 * Resolves the runtime GLib type and instantiates the matching registered
 * class when present, falling back to the supplied interface class when
 * no concrete implementation is registered. The result is always assignable
 * to the interface type, so callers can invoke interface methods on it.
 *
 * @typeParam T - The handle type (null, undefined, or NativeHandle)
 * @typeParam TClass - The interface class type
 * @param handle - The native handle (or null/undefined)
 * @param interfaceClass - The interface class to fall back to
 * @returns A wrapper instance, or null if handle is null/undefined
 */
export function getNativeObjectAsInterface<T extends NativeHandle | null | undefined, TClass extends NativeClass>(
    handle: T,
    interfaceClass: TClass,
): T extends null | undefined ? null : InstanceType<TClass> {
    type Result = T extends null | undefined ? null : InstanceType<TClass>;

    if (handle === null || handle === undefined) return null as Result;

    const existing = findNativeObject(handle);
    if (existing) return existing as Result;

    const runtimeGtype = getInstanceGType(handle);
    if (runtimeGtype === 0) {
        throw new Error("Cannot resolve runtime GLib type from handle");
    }
    const cls = findNativeClass(runtimeGtype, false) ?? interfaceClass;
    const instance = wrapHandle(cls, handle);
    registerNativeObject(instance);
    return instance as Result;
}
