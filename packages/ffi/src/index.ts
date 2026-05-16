export { Arg, type FfiValue, getInstanceGType, NativeHandle, Type } from "@gtkx/native";
export * from "./construction-meta.js";
export type { GTypeStamped, NativeClass } from "./handles.js";
export { getParentClass } from "./handles.js";
export type { ArrayKind, ArrayOptions, Ownership, TrampolineOptions, TrampolineScope } from "./helpers.js";
export { alloc, call, freeze, getNativeId, read, t, unfreeze, write } from "./helpers.js";
export * from "./lifecycle.js";
export { getNativeInterface, instanceIsA } from "./native.js";
export * from "./register-class.js";
export {
    findNativeClass,
    findNativeClassForInterface,
    findNativeObject,
    getClassGType,
    getInterfaceGType,
    getNativeClass,
    getNativeObject,
    getNativeObjectAsInterface,
    registerNativeClass,
    registerNativeInterface,
    registerNativeObject,
} from "./registry.js";
import "./cairo/index.js";
import "./gobject/object.js";
import "./gobject/value.js";
