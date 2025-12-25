import { getObjectId } from "@gtkx/native";
import { typeCheckInstanceIsA, typeFromName, typeNameFromInstance } from "../generated/gobject/functions.js";
import { findNativeClass } from "../registry.js";
import type { NativeClass, NativeObject } from "./base.js";

/**
 * Wraps a native object id in a class instance without calling the constructor.
 *
 * When called without a targetType, uses GLib's type system to determine the
 * actual runtime type and wraps with the correct class prototype.
 *
 * When called with a targetType:
 * - For interfaces: checks if the object implements the interface, returns null if not
 * - For boxed types and GObjects: creates an instance with the target prototype
 *
 * @param id - The native object id to wrap
 * @param targetType - Optional target type class
 * @returns A new instance with the id attached, or null for failed interface checks
 * @throws Error if no registered class is found (when no targetType provided)
 */
export function getNativeObject<T extends NativeObject = NativeObject>(
    id: unknown,
    targetType?: NativeClass<T>,
): T | null {
    if (id === null || id === undefined) {
        return null;
    }

    if (targetType) {
        if (targetType.objectType === "interface") {
            const targetGType = typeFromName(targetType.glibTypeName);
            if (targetGType === 0) return null;

            const objId = getObjectId(id);
            if (!typeCheckInstanceIsA(objId, targetGType)) return null;
        }

        const instance = Object.create(targetType.prototype) as T;
        instance.id = id;
        return instance;
    }

    const objectId = getObjectId(id);
    const runtimeTypeName = typeNameFromInstance(objectId);
    const cls = findNativeClass(runtimeTypeName);

    if (!cls) {
        throw new Error(`Expected registered GLib type, got '${runtimeTypeName}'`);
    }

    const instance = Object.create(cls.prototype) as T;
    instance.id = id;
    return instance;
}

export { isInstantiating, type NativeClass, NativeObject, setInstantiating } from "./base.js";
