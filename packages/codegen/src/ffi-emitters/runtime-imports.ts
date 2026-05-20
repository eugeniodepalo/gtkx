/**
 * Runtime barrel import specifier and the set of `@gtkx/ffi` runtime modules
 * it consolidates.
 *
 * Generated FFI bindings depend on a fixed set of hand-written runtime
 * modules. Rather than emitting one import line per module, value imports of
 * those modules are redirected onto a single barrel module so every generated
 * file carries exactly one runtime import line. The specifiers are expressed
 * relative to a generated file at `generated/<namespace>/<namespace>.js`.
 */

/** Import specifier of the runtime barrel, relative to a generated file. */
export const RUNTIME_SPECIFIER = "../../runtime.js";

/**
 * Module specifiers whose value imports {@link RUNTIME_SPECIFIER} re-exports.
 *
 * Every name a generated file imports from one of these modules is also
 * exported by the runtime barrel, so redirecting the import is transparent.
 *
 * `../../object.js` is intentionally excluded: it transitively imports back
 * into the barrel via `./gobject/gvalue.js`, so consolidating it would force
 * the barrel into a load-order-sensitive shape. Generated files import
 * `constructNativeObject` directly from `../../object.js` instead, keeping
 * the barrel fully acyclic.
 */
export const CONSOLIDATED_RUNTIME_SPECIFIERS: ReadonlySet<string> = new Set([
    "../../class-struct-pointer.js",
    "../../construction-meta.js",
    "../../handles.js",
    "../../native.js",
    "../../register-class.js",
    "../../registry.js",
    "@gtkx/native",
]);
