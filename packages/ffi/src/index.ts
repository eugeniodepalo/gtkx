export { Arg, type FfiValue, getInstanceGType, NativeHandle, Type } from "@gtkx/native";
export * from "./construction-meta.js";
export type { ArrayKind, ArrayOptions, Ownership, TrampolineOptions, TrampolineScope } from "./helpers.js";
export { alloc, call, freeze, getNativeId, read, t, unfreeze, write } from "./helpers.js";
export * from "./lifecycle.js";
export { getNativeInterface, instanceIsA } from "./native.js";
export * from "./register-class.js";
export {
    findNativeClass,
    findNativeObject,
    getClassGType,
    getNativeClass,
    getNativeObject,
    getNativeObjectAsInterface,
    registerNativeClass,
    registerNativeObject,
} from "./registry.js";
import "./cairo/index.js";
import "./gobject/object.js";
import "./gobject/value.js";
