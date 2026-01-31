import { getNativeId, type NativeHandle } from "@gtkx/native";
import type { NativeObject } from "./base.js";

const wrapperRegistry = new Map<number, WeakRef<NativeObject>>();

const cleanupRegistry = new FinalizationRegistry<number>((pointerId) => {
    wrapperRegistry.delete(pointerId);
});

export function registerWrapper(obj: NativeObject): void {
    const pointerId = getNativeId(obj.handle);
    wrapperRegistry.set(pointerId, new WeakRef(obj));
    cleanupRegistry.register(obj, pointerId, obj);
}

export function lookupWrapper(handle: NativeHandle): NativeObject | null {
    const pointerId = getNativeId(handle);
    const ref = wrapperRegistry.get(pointerId);

    if (!ref) return null;

    const obj = ref.deref();
    if (!obj) {
        wrapperRegistry.delete(pointerId);
        return null;
    }

    return obj;
}
