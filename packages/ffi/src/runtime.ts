/**
 * Consolidated runtime surface for generated FFI bindings.
 *
 * Every generated `.js` file imports exclusively from this module. It
 * aggregates the hand-written runtime that generated code depends on, both
 * at module-load time (type registration, construction metadata) and at call
 * time (handle resolution, object wrapping, error handling). Routing all
 * generated imports through one specifier keeps the generated import header
 * to a single line and decouples generated code from the internal module
 * layout of `@gtkx/ffi`.
 *
 * Re-export ordering is load-bearing. The acyclic runtime modules are
 * re-exported first so every symbol a generated module calls at load time
 * (`t.fn`, `registerNativeClass`, `registerConstructionMeta`,
 * `registerInterfaceClassStruct`) is fully initialized before any generated
 * module body runs. `./object.js` is re-exported last: it reaches the
 * generated `gobject` bindings through `./gobject/gvalue.js`, closing an
 * import cycle back onto this barrel. Its `constructNativeObject` export is
 * only ever called after module load, so the late re-export is safe.
 */

// biome-ignore-all assist/source/organizeImports: re-export order is load-bearing for module init.

export { createRef } from "@gtkx/native";
export { promisify } from "./async.js";
export type { BoxedFieldMeta, ConstructionMeta, GObjectPropMeta } from "./construction-meta.js";
export { registerConstructionMeta } from "./construction-meta.js";
export type { NativeClass, NativeHandle } from "./handles.js";
export { getClassStruct, getHandle, setClassStruct, setHandle, tryGetHandle } from "./handles.js";
export type { ArrayKind, ArrayOptions, Ownership, TrampolineOptions, TrampolineScope } from "./helpers.js";
export { alloc, call, freeze, getNativeId, read, t, unfreeze, write } from "./helpers.js";
export type { ClassStructTarget } from "./class-struct-pointer.js";
export { resolveClassStructPointer } from "./class-struct-pointer.js";
export { checkError, makeErrorDomain, NativeError, throwUnsupported } from "./native.js";
export { registerInterfaceClassStruct } from "./register-class.js";
export {
    getNativeObject,
    getNativeObjectAsInterface,
    registerNativeClass,
    registerNativeInterface,
} from "./registry.js";
export type { SignalDescriptor, SignalGObject, SignalGValue, SignalHandler } from "./signals.js";
export { connectSignal, emitSignal, registerSignalMeta } from "./signals.js";
export { constructNativeObject } from "./object.js";
