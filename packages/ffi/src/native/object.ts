import { getObjectId, type ObjectId } from "@gtkx/native";
import { typeNameFromInstance } from "../generated/gobject/functions.js";
import { TypeInstance } from "../generated/gobject/type-instance.js";
import { findNativeClass } from "../registry.js";
import type { NativeClass, NativeObject } from "./base.js";

export function getNativeObject<T extends NativeObject>(id: null | undefined, targetType?: NativeClass<T>): null;
export function getNativeObject<T extends NativeObject>(id: ObjectId, targetType: NativeClass<T>): T;
export function getNativeObject<T extends NativeObject>(
    id: ObjectId | null | undefined,
    targetType: NativeClass<T>,
): T | null;
export function getNativeObject(id: ObjectId): NativeObject;
export function getNativeObject(id: ObjectId | null | undefined): NativeObject | null;
export function getNativeObject<T extends NativeObject = NativeObject>(
    id: ObjectId | null | undefined,
    targetType?: NativeClass<T>,
): T | null {
    if (id === null || id === undefined) {
        return null;
    }

    if (targetType) {
        const instance = Object.create(targetType.prototype) as T;
        instance.id = id;
        return instance;
    }

    const typeInstance = Object.create(TypeInstance.prototype) as TypeInstance;
    typeInstance.id = id;
    const runtimeTypeName = typeNameFromInstance(typeInstance);
    const cls = findNativeClass(runtimeTypeName);

    if (!cls) {
        throw new Error(`Expected registered GLib type, got '${runtimeTypeName}'`);
    }

    const instance = Object.create(cls.prototype) as T;
    instance.id = id;
    return instance;
}

export const isObjectEqual = (obj: NativeObject, other: NativeObject): boolean => {
    return getObjectId(obj.id) === getObjectId(other.id);
};

export { isInstantiating, type NativeClass, NativeObject, setInstantiating } from "./base.js";
