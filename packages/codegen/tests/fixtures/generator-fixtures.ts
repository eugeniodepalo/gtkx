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
 * Context shared by every Gtk class/interface/function generator test:
 * a mock repository, an FfiMapper for it, a fresh file builder, and the
 * standard Gtk generator options.
 *
 * If a Gtk namespace is not already present in `namespaces`, an empty one is
 * inserted so downstream lookups succeed.
 */
export function setupGtkFfiContext(namespaces: Map<string, GirNamespace> = new Map()): {
    namespaces: Map<string, GirNamespace>;
    repo: GirRepository;
    ffiMapper: FfiMapper;
    file: ReturnType<typeof fileBuilder>;
    options: GeneratorOptionsLike;
} {
    if (!namespaces.has("Gtk")) {
        namespaces.set("Gtk", createNormalizedNamespace({ name: "Gtk" }));
    }
    const repo = createMockRepository(namespaces);
    const ffiMapper = new FfiMapper(repo as ConstructorParameters<typeof FfiMapper>[0], "Gtk");
    const file = fileBuilder();
    return { namespaces, repo, ffiMapper, file, options: GTK_GENERATOR_OPTIONS };
}
