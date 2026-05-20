import { fileBuilder } from "../../src/builders/file-builder.js";
import type { GirNamespace, GirRepository } from "../../src/gir/index.js";
import { FfiMapper } from "../../src/type-system/ffi-mapper.js";
import { createNormalizedNamespace } from "./gir-fixtures.js";
import { createMockRepository } from "./mock-repository.js";

export interface GeneratorOptionsLike {
    namespace: string;
    sharedLibrary: string;
    glibLibrary: string;
    gobjectLibrary: string;
}

/**
 * Generator options shared across every test that instantiates a Gtk-namespaced
 * builder or generator.
 */
export const GTK_GENERATOR_OPTIONS: GeneratorOptionsLike = {
    namespace: "Gtk",
    sharedLibrary: "libgtk-4.so.1",
    glibLibrary: "libglib-2.0.so.0",
    gobjectLibrary: "libgobject-2.0.so.0",
};

/**
 * Generator options for a non-Gtk namespace (e.g. GObject, GLib, Gio).
 */
export function buildGeneratorOptions(namespace: string): GeneratorOptionsLike {
    return {
        namespace,
        sharedLibrary: namespace === "GObject" ? "libgobject-2.0.so.0" : "libgtk-4.so.1",
        glibLibrary: "libglib-2.0.so.0",
        gobjectLibrary: "libgobject-2.0.so.0",
    };
}

/**
 * Result of {@link setupFfiContext}: the namespace map, mock repository,
 * `FfiMapper`, a fresh file builder, and the generator options for
 * `namespace`.
 */
export interface FfiContextSetup {
    namespaces: Map<string, GirNamespace>;
    repo: GirRepository;
    ffiMapper: FfiMapper;
    file: ReturnType<typeof fileBuilder>;
    options: GeneratorOptionsLike;
}

/**
 * Context shared by every class/interface/function generator test in a single
 * namespace: a mock repository spanning `namespaces`, an FfiMapper bound to
 * `namespace`, a fresh file builder, and the corresponding generator options.
 *
 * If `namespace` is not present in `namespaces`, an empty one is inserted so
 * downstream lookups succeed.
 */
export function setupFfiContext(namespace: string, namespaces: Map<string, GirNamespace> = new Map()): FfiContextSetup {
    if (!namespaces.has(namespace)) {
        namespaces.set(namespace, createNormalizedNamespace({ name: namespace }));
    }
    const repo = createMockRepository(namespaces);
    const ffiMapper = new FfiMapper(repo as ConstructorParameters<typeof FfiMapper>[0], namespace);
    const file = fileBuilder();
    return { namespaces, repo, ffiMapper, file, options: buildGeneratorOptions(namespace) };
}

/**
 * Convenience specialization of {@link setupFfiContext} bound to the Gtk
 * namespace, the dominant namespace under test.
 */
export function setupGtkFfiContext(namespaces: Map<string, GirNamespace> = new Map()): FfiContextSetup {
    return setupFfiContext("Gtk", namespaces);
}
