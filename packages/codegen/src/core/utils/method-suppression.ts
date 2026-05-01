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
]);

/**
 * Returns true if the GIR method identified by `cIdentifier` should be
 * skipped during method emission for the class identified by `qualifiedName`.
 *
 * @param qualifiedName - The qualified GIR class name (e.g. "GObject.Object")
 * @param cIdentifier - The method's C identifier (e.g. "g_object_set_property")
 */
export const isMethodSuppressed = (qualifiedName: string, cIdentifier: string): boolean =>
    SUPPRESSED_METHODS_BY_CLASS.get(qualifiedName)?.has(cIdentifier) ?? false;
