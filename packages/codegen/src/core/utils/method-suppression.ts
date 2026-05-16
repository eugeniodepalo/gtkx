/**
 * Per-class registry of GIR methods that should NOT be emitted as instance
 * methods on the generated FFI class.
 *
 * Methods listed here have hand-written, higher-level overrides in the FFI
 * runtime layer (`packages/ffi/src/...`). The underlying C functions remain
 * accessible through the module-level `fn(...)` constants emitted alongside
 * the generated class — only the auto-generated method wrappers are skipped.
 *
 * The map key is the qualified GIR class name (e.g. `"GObject.Object"`); the
 * value is the set of C identifiers (e.g. `"g_object_set_property"`) to skip.
 */
const SUPPRESSED_METHODS_BY_CLASS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
    ["GObject.Object", new Set(["g_object_get_property", "g_object_set_property"])],
    ["GObject.Value", new Set(["g_value_get_boxed"])],
]);

/**
 * Returns true if the GIR method identified by `cIdentifier` should be
 * skipped during method emission for the class identified by `qualifiedName`.
 *
 * The generated runtime omits these wrappers because a hand-written override
 * supplies the method; the `.d.ts` contract still declares the member, and the
 * conformance gate checks the contract against the shipping `@gtkx/ffi/<ns>`
 * surface, which layers the override over the generated module.
 *
 * @param qualifiedName - The qualified GIR class name (e.g. "GObject.Object")
 * @param cIdentifier - The method's C identifier (e.g. "g_object_set_property")
 */
export const isMethodSuppressed = (qualifiedName: string, cIdentifier: string): boolean =>
    SUPPRESSED_METHODS_BY_CLASS.get(qualifiedName)?.has(cIdentifier) ?? false;

/**
 * Per-class registry of camelCased GIR method names whose ts-for-gir contract
 * declaration is removed because a hand-written FFI runtime override supplies
 * the method under the same name but with a signature that diverges from the
 * GIR shape.
 *
 * Unlike a suppressed method whose override preserves the GIR call shape — and
 * whose contract declaration is therefore kept — a divergent override would
 * collide with the ts-for-gir declaration when the two merge. The generated
 * declaration is dropped so the override's `declare module` declaration is the
 * single, authoritative one; the member still ships on `@gtkx/ffi/<ns>`.
 *
 * The outer key is the lowercase namespace identifier; the inner key is the
 * class or interface name; the value is the set of camelCased method names.
 */
export const DIVERGENT_OVERRIDE_METHODS_BY_NAMESPACE: ReadonlyMap<
    string,
    ReadonlyMap<string, ReadonlySet<string>>
> = new Map([["gobject", new Map([["Value", new Set(["getBoxed"])]])]]);
