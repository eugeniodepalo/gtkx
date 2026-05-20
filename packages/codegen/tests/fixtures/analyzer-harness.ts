import type { GirNamespace, GirRepository } from "../../src/gir/index.js";
import { FfiMapper } from "../../src/type-system/ffi-mapper.js";
import { createMockRepository } from "./mock-repository.js";

/**
 * Constructs an analyzer instance over `namespaces`, wiring it through a
 * shared `FfiMapper` bound to `namespace`. Returns the analyzer alongside
 * the underlying mock repository and mapper so tests can poke at intermediate
 * state when needed.
 *
 * @param AnalyzerCtor - Constructor of the analyzer under test; receives the
 *     mock repository and a Gtk-bound `FfiMapper`.
 * @param namespaces - Namespace map to wire into the mock repository.
 * @param namespace - The namespace the `FfiMapper` is bound to (defaults to `Gtk`).
 */
export function createAnalyzerSetup<A, R>(
    AnalyzerCtor: new (repo: R, mapper: FfiMapper) => A,
    namespaces: Map<string, GirNamespace>,
    namespace = "Gtk",
): { repo: GirRepository; mapper: FfiMapper; analyzer: A } {
    const repo = createMockRepository(namespaces);
    const mapper = new FfiMapper(repo as ConstructorParameters<typeof FfiMapper>[0], namespace);
    const analyzer = new AnalyzerCtor(repo as unknown as R, mapper);
    return { repo, mapper, analyzer };
}
