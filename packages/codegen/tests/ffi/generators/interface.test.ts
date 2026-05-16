import { describe, expect, it } from "vitest";
import { fileBuilder } from "../../../src/builders/file-builder.js";
import { stringify } from "../../../src/builders/stringify.js";
import { FfiMapper } from "../../../src/core/type-system/ffi-mapper.js";
import { InterfaceGenerator } from "../../../src/ffi/generators/interface.js";
import {
    createNormalizedInterface,
    createNormalizedMethod,
    createNormalizedNamespace,
    createNormalizedParameter,
    createNormalizedProperty,
    createNormalizedType,
} from "../../fixtures/gir-fixtures.js";
import { createMockRepository } from "../../fixtures/mock-repository.js";

function createTestSetup(namespaces: Map<string, ReturnType<typeof createNormalizedNamespace>> = new Map()) {
    const ns = createNormalizedNamespace({ name: "Gtk" });
    namespaces.set("Gtk", ns);
    const repo = createMockRepository(namespaces);
    const ffiMapper = new FfiMapper(repo as Parameters<typeof FfiMapper>[0], "Gtk");
    const file = fileBuilder();
    const options = {
        namespace: "Gtk",
        sharedLibrary: "libgtk-4.so.1",
        glibLibrary: "libglib-2.0.so.0",
        gobjectLibrary: "libgobject-2.0.so.0",
    };
    const generator = new InterfaceGenerator(ffiMapper, file, repo as Parameters<typeof FfiMapper>[0], options);
    return { generator, file, repo };
}

describe("InterfaceGenerator", () => {
    describe("constructor", () => {
        it("creates generator with dependencies", () => {
            const { generator } = createTestSetup();
            expect(generator).toBeInstanceOf(InterfaceGenerator);
        });
    });

    describe("generateToSourceFile", () => {
        it("returns true when generating interface", () => {
            const { generator } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                methods: [],
            });

            const result = generator.generate(iface);

            expect(result).toBe(true);
        });

        it("generates class with PascalCase name", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                methods: [],
            });

            generator.generate(iface);

            const code = stringify(file);
            expect(code).toContain("export class Buildable");
        });

        it("extends NativeObject", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                methods: [],
            });

            generator.generate(iface);

            const code = stringify(file);
            expect(code).toContain("extends GObject.Object");
        });

        it("emits exported get-type FFI binding when glibGetType is present", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                glibTypeName: "GtkBuildable",
                glibGetType: "gtk_buildable_get_type",
                methods: [],
            });

            generator.generate(iface);

            const code = stringify(file);
            expect(code).toContain("export const gtk_buildable_get_type");
            expect(code).toContain('"gtk_buildable_get_type"');
        });

        it("registers the interface class for runtime type resolution when glibGetType is present", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                glibTypeName: "GtkBuildable",
                glibGetType: "gtk_buildable_get_type",
                methods: [],
            });

            generator.generate(iface);

            const code = stringify(file);
            expect(code).toContain("registerNativeInterface(Buildable, gtk_buildable_get_type())");
        });

        it("does not register the interface class when glibGetType is absent", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                glibTypeName: "GtkBuildable",
                methods: [],
            });

            generator.generate(iface);

            const code = stringify(file);
            expect(code).not.toContain("registerNativeInterface");
        });

        it("does not emit objectType property", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                glibTypeName: "GtkBuildable",
                methods: [],
            });

            generator.generate(iface);

            const code = stringify(file);
            expect(code).not.toContain("objectType");
        });

        it("generates methods for interface", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Orientable",
                methods: [
                    createNormalizedMethod({
                        name: "get_orientation",
                        cIdentifier: "gtk_orientable_get_orientation",
                        returnType: createNormalizedType({ name: "gint" }),
                    }),
                ],
            });

            generator.generate(iface);

            const code = stringify(file);
            expect(code).toContain("getOrientation");
        });

        it("generates multiple methods", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Orientable",
                methods: [
                    createNormalizedMethod({
                        name: "get_orientation",
                        cIdentifier: "gtk_orientable_get_orientation",
                        returnType: createNormalizedType({ name: "gint" }),
                    }),
                    createNormalizedMethod({
                        name: "set_orientation",
                        cIdentifier: "gtk_orientable_set_orientation",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "orientation",
                                type: createNormalizedType({ name: "gint" }),
                            }),
                        ],
                    }),
                ],
            });

            generator.generate(iface);

            const code = stringify(file);
            expect(code).toContain("getOrientation");
            expect(code).toContain("setOrientation");
        });

        it("preserves documentation", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                doc: "Interface for buildable widgets",
                methods: [],
            });

            generator.generate(iface);

            const code = stringify(file);
            expect(code).toContain("Interface for buildable widgets");
        });
    });

    describe("context updates", () => {
        it("sets usesGObjectNamespace flag for non-GObject namespace", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                methods: [],
            });

            generator.generate(iface);
            const code = stringify(file);

            expect(code).toContain("GObject");
        });

        it("adds fn import when interface has methods", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Orientable",
                methods: [
                    createNormalizedMethod({
                        name: "get_value",
                        cIdentifier: "gtk_orientable_get_value",
                        returnType: createNormalizedType({ name: "gint" }),
                    }),
                ],
            });

            generator.generate(iface);
            const code = stringify(file);

            expect(code).toContain("import { t }");
            expect(code).toContain("const gtk_orientable_get_value = t.fn(");
        });

        it("adds Ref import when method has out parameter", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                methods: [
                    createNormalizedMethod({
                        name: "get_value",
                        cIdentifier: "gtk_buildable_get_value",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "out_value",
                                type: createNormalizedType({ name: "gint" }),
                                direction: "out",
                            }),
                        ],
                    }),
                ],
            });

            generator.generate(iface);
            const code = stringify(file);

            expect(code).toContain("Ref");
        });
    });

    describe("method filtering", () => {
        it("emits a throwing stub for methods whose parameters are GLib.Closure (untyped, unsafe)", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                methods: [
                    createNormalizedMethod({
                        name: "with_closure",
                        cIdentifier: "gtk_buildable_with_closure",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "callback",
                                type: createNormalizedType({ name: "GLib.Closure" }),
                            }),
                        ],
                    }),
                    createNormalizedMethod({
                        name: "normal",
                        cIdentifier: "gtk_buildable_normal",
                        returnType: createNormalizedType({ name: "none" }),
                    }),
                ],
            });

            generator.generate(iface);

            const code = stringify(file);
            expect(code).toContain("normal");
            expect(code).toContain("withClosure");
            expect(code).toContain("throwUnsupported");
        });

        it("filters out duplicate methods with same cIdentifier", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                methods: [
                    createNormalizedMethod({
                        name: "get_name",
                        cIdentifier: "gtk_buildable_get_name",
                        returnType: createNormalizedType({ name: "utf8" }),
                    }),
                    createNormalizedMethod({
                        name: "get_name",
                        cIdentifier: "gtk_buildable_get_name",
                        returnType: createNormalizedType({ name: "utf8" }),
                    }),
                ],
            });

            generator.generate(iface);

            const code = stringify(file);
            const matches = code.match(/getName\(/g) ?? [];
            expect(matches.length).toBe(1);
        });
    });

    describe("method structure", () => {
        it("converts method names to camelCase", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                methods: [
                    createNormalizedMethod({
                        name: "get_build_name",
                        cIdentifier: "gtk_buildable_get_build_name",
                        returnType: createNormalizedType({ name: "utf8" }),
                    }),
                ],
            });

            generator.generate(iface);

            const code = stringify(file);
            expect(code).toContain("getBuildName");
        });

        it("includes parameters in method signature", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                methods: [
                    createNormalizedMethod({
                        name: "set_name",
                        cIdentifier: "gtk_buildable_set_name",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "name",
                                type: createNormalizedType({ name: "utf8" }),
                            }),
                        ],
                    }),
                ],
            });

            generator.generate(iface);

            const code = stringify(file);
            expect(code).toContain("name: string");
        });

        it("includes return type for non-void methods", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                methods: [
                    createNormalizedMethod({
                        name: "get_id",
                        cIdentifier: "gtk_buildable_get_id",
                        returnType: createNormalizedType({ name: "gint" }),
                    }),
                ],
            });

            generator.generate(iface);

            const code = stringify(file);
            expect(code).toContain(": number");
        });
    });

    describe("property accessors", () => {
        it("emits ES6 get/set accessors in the interface body", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                methods: [],
                properties: [
                    createNormalizedProperty({
                        name: "build-name",
                        type: createNormalizedType({ name: "utf8" }),
                        getter: undefined,
                        setter: undefined,
                    }),
                ],
            });

            generator.generate(iface);

            const code = stringify(file);
            expect(code).toContain("get buildName(): string {");
            expect(code).toContain('return this.getProperty("build-name");');
            expect(code).toContain("set buildName(value: string) {");
            expect(code).toContain('this.setProperty("build-name", value);');
        });

        it("does not emit Object.defineProperty for interface properties", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                methods: [],
                properties: [
                    createNormalizedProperty({
                        name: "build-name",
                        type: createNormalizedType({ name: "utf8" }),
                        getter: undefined,
                        setter: undefined,
                    }),
                ],
            });

            generator.generate(iface);

            const code = stringify(file);
            expect(code).not.toContain("Object.defineProperty");
        });

        it("emits a getter-only accessor for construct-only properties", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Buildable",
                methods: [],
                properties: [
                    createNormalizedProperty({
                        name: "build-id",
                        type: createNormalizedType({ name: "utf8" }),
                        constructOnly: true,
                        getter: undefined,
                        setter: undefined,
                    }),
                ],
            });

            generator.generate(iface);

            const code = stringify(file);
            expect(code).toContain("get buildId(): string {");
            expect(code).not.toContain("set buildId(");
        });
    });

    describe("integration", () => {
        it("generates complete interface class", () => {
            const { generator, file } = createTestSetup();
            const iface = createNormalizedInterface({
                name: "Orientable",
                glibTypeName: "GtkOrientable",
                doc: "Interface for orientable widgets",
                methods: [
                    createNormalizedMethod({
                        name: "get_orientation",
                        cIdentifier: "gtk_orientable_get_orientation",
                        returnType: createNormalizedType({ name: "gint" }),
                        doc: "Gets the orientation",
                    }),
                    createNormalizedMethod({
                        name: "set_orientation",
                        cIdentifier: "gtk_orientable_set_orientation",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "orientation",
                                type: createNormalizedType({ name: "gint" }),
                            }),
                        ],
                    }),
                ],
            });

            generator.generate(iface);

            const code = stringify(file);
            expect(code).toContain("export class Orientable extends GObject.Object");
            expect(code).toContain("getOrientation");
            expect(code).toContain("setOrientation");
        });
    });
});
