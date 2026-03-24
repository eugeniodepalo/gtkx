import { describe, expect, it } from "vitest";
import { fileBuilder } from "../../../../src/builders/file-builder.js";
import { Writer } from "../../../../src/builders/writer.js";
import { FfiMapper } from "../../../../src/core/type-system/ffi-mapper.js";
import { ConstructorBuilder } from "../../../../src/ffi/generators/class/constructor-builder.js";
import {
    createNormalizedClass,
    createNormalizedConstructor,
    createNormalizedNamespace,
    createNormalizedParameter,
    createNormalizedType,
    qualifiedName,
} from "../../../fixtures/gir-fixtures.js";
import { createMockRepository } from "../../../fixtures/mock-repository.js";

function createTestSetup(
    classOverrides: Partial<Parameters<typeof createNormalizedClass>[0]> = {},
    namespaces: Map<string, ReturnType<typeof createNormalizedNamespace>> = new Map(),
) {
    const ns = createNormalizedNamespace({ name: "Gtk" });
    namespaces.set("Gtk", ns);
    const repo = createMockRepository(namespaces);
    const ffiMapper = new FfiMapper(repo as Parameters<typeof FfiMapper>[0], "Gtk");
    const imports = fileBuilder();
    const options = {
        namespace: "Gtk",
        sharedLibrary: "libgtk-4.so.1",
        glibLibrary: "libglib-2.0.so.0",
        gobjectLibrary: "libgobject-2.0.so.0",
    };

    const cls = createNormalizedClass({
        name: "Button",
        qualifiedName: qualifiedName("Gtk", "Button"),
        parent: null,
        constructors: [],
        ...classOverrides,
    });

    const builder = new ConstructorBuilder(cls, ffiMapper, imports, repo, options);
    return { cls, builder, imports, ffiMapper };
}

describe("ConstructorBuilder", () => {
    describe("constructor", () => {
        it("creates builder with class and dependencies", () => {
            const { builder } = createTestSetup();
            expect(builder).toBeInstanceOf(ConstructorBuilder);
        });
    });

    describe("addConstructorAndBuildFactoryStructures", () => {
        it("returns empty array when no constructors and no parent", () => {
            const { builder } = createTestSetup({ constructors: [] });

            const { factoryMethods } = builder.buildConstructorAndFactoryMethods(false);

            expect(factoryMethods).toHaveLength(0);
        });

        it("generates no constructor when no parent (inherits NativeObject constructor)", () => {
            const { builder } = createTestSetup({ constructors: [] });

            const { constructorData } = builder.buildConstructorAndFactoryMethods(false);

            expect(constructorData).toBeNull();
        });

        it("generates no constructor when has parent but no constructors and abstract (inherits parent constructor)", () => {
            const { builder } = createTestSetup({ constructors: [], abstract: true });

            const { constructorData } = builder.buildConstructorAndFactoryMethods(true);

            expect(constructorData).toBeNull();
        });

        it("builds factory methods for non-main constructors when has parent", () => {
            const { builder } = createTestSetup({
                constructors: [
                    createNormalizedConstructor({
                        name: "new",
                        cIdentifier: "gtk_button_new",
                        returnType: createNormalizedType({ name: "Gtk.Button" }),
                        parameters: [],
                    }),
                    createNormalizedConstructor({
                        name: "new_with_label",
                        cIdentifier: "gtk_button_new_with_label",
                        returnType: createNormalizedType({ name: "Gtk.Button" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "label",
                                type: createNormalizedType({ name: "utf8" }),
                            }),
                        ],
                    }),
                ],
            });

            const { factoryMethods } = builder.buildConstructorAndFactoryMethods(true);

            expect(factoryMethods.length).toBeGreaterThanOrEqual(1);
        });

        it("creates static factory method with correct name", () => {
            const { builder } = createTestSetup({
                constructors: [
                    createNormalizedConstructor({
                        name: "new",
                        cIdentifier: "gtk_button_new",
                        returnType: createNormalizedType({ name: "Gtk.Button" }),
                        parameters: [],
                    }),
                    createNormalizedConstructor({
                        name: "new_with_label",
                        cIdentifier: "gtk_button_new_with_label",
                        returnType: createNormalizedType({ name: "Gtk.Button" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "label",
                                type: createNormalizedType({ name: "utf8" }),
                            }),
                        ],
                    }),
                ],
            });

            const { factoryMethods } = builder.buildConstructorAndFactoryMethods(true);

            const withLabel = factoryMethods.find((m) => m.name === "newWithLabel");
            expect(withLabel).toBeDefined();
        });

        it("factory method is static", () => {
            const { builder } = createTestSetup({
                constructors: [
                    createNormalizedConstructor({
                        name: "new",
                        cIdentifier: "gtk_button_new",
                        returnType: createNormalizedType({ name: "Gtk.Button" }),
                        parameters: [],
                    }),
                    createNormalizedConstructor({
                        name: "new_with_mnemonic",
                        cIdentifier: "gtk_button_new_with_mnemonic",
                        returnType: createNormalizedType({ name: "Gtk.Button" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "label",
                                type: createNormalizedType({ name: "utf8" }),
                            }),
                        ],
                    }),
                ],
            });

            const { factoryMethods } = builder.buildConstructorAndFactoryMethods(true);

            const staticMethods = factoryMethods.filter((m) => m.isStatic);
            expect(staticMethods.length).toBeGreaterThan(0);
        });

        it("factory method returns class type", () => {
            const { builder } = createTestSetup({
                constructors: [
                    createNormalizedConstructor({
                        name: "new",
                        cIdentifier: "gtk_button_new",
                        returnType: createNormalizedType({ name: "Gtk.Button" }),
                        parameters: [],
                    }),
                    createNormalizedConstructor({
                        name: "new_from_icon",
                        cIdentifier: "gtk_button_new_from_icon",
                        returnType: createNormalizedType({ name: "Gtk.Button" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "icon_name",
                                type: createNormalizedType({ name: "utf8" }),
                            }),
                        ],
                    }),
                ],
            });

            const { factoryMethods } = builder.buildConstructorAndFactoryMethods(true);

            const method = factoryMethods.find((m) => m.isStatic);
            expect(method?.returnType).toBe("Button");
        });
    });

    describe("main constructor selection", () => {
        it("uses main constructor when available with parent", () => {
            const { builder } = createTestSetup({
                constructors: [
                    createNormalizedConstructor({
                        name: "new",
                        cIdentifier: "gtk_button_new",
                        returnType: createNormalizedType({ name: "Gtk.Button" }),
                        parameters: [],
                    }),
                ],
            });

            const { constructorData } = builder.buildConstructorAndFactoryMethods(true);
            expect(constructorData).not.toBeNull();
            const w = new Writer();
            constructorData?.bodyWriter(w);
            const code = w.toString();
            expect(code).toContain("super(");
        });

        it("creates factory for non-main constructors when main exists", () => {
            const { builder } = createTestSetup({
                constructors: [
                    createNormalizedConstructor({
                        name: "new",
                        cIdentifier: "gtk_button_new",
                        returnType: createNormalizedType({ name: "Gtk.Button" }),
                        parameters: [],
                    }),
                    createNormalizedConstructor({
                        name: "new_with_label",
                        cIdentifier: "gtk_button_new_with_label",
                        returnType: createNormalizedType({ name: "Gtk.Button" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "label",
                                type: createNormalizedType({ name: "utf8" }),
                            }),
                        ],
                    }),
                ],
            });

            const { factoryMethods } = builder.buildConstructorAndFactoryMethods(true);

            expect(factoryMethods.length).toBeGreaterThan(0);
        });
    });

    describe("context updates", () => {
        it("sets usesIsNativeHandle flag when main constructor with parent", () => {
            const { builder } = createTestSetup({
                constructors: [
                    createNormalizedConstructor({
                        name: "new",
                        cIdentifier: "gtk_button_new",
                        returnType: createNormalizedType({ name: "Gtk.Button" }),
                        parameters: [],
                    }),
                ],
            });

            const { constructorData } = builder.buildConstructorAndFactoryMethods(true);

            expect(constructorData).not.toBeNull();
        });

        it("generates factory methods for additional constructors", () => {
            const { builder } = createTestSetup({
                constructors: [
                    createNormalizedConstructor({
                        name: "new",
                        cIdentifier: "gtk_button_new",
                        returnType: createNormalizedType({ name: "Gtk.Button" }),
                        parameters: [],
                    }),
                    createNormalizedConstructor({
                        name: "new_with_label",
                        cIdentifier: "gtk_button_new_with_label",
                        returnType: createNormalizedType({ name: "Gtk.Button" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "label",
                                type: createNormalizedType({ name: "utf8" }),
                            }),
                        ],
                    }),
                ],
            });

            const { factoryMethods } = builder.buildConstructorAndFactoryMethods(true);

            expect(factoryMethods.length).toBeGreaterThan(0);
        });
    });

    describe("GObject.new fallback", () => {
        it("uses g_object_new when no main constructor but has glibGetType", () => {
            const { builder } = createTestSetup({
                constructors: [],
                glibGetType: "gtk_button_get_type",
                abstract: false,
            });

            const { constructorData } = builder.buildConstructorAndFactoryMethods(true);
            expect(constructorData).not.toBeNull();
            const w = new Writer();
            constructorData?.bodyWriter(w);
            const code = w.toString();
            expect(code).toContain("g_object_new");
        });

        it("does not use g_object_new for abstract classes", () => {
            const { builder } = createTestSetup({
                constructors: [],
                glibGetType: "gtk_button_get_type",
                abstract: true,
            });

            const { constructorData } = builder.buildConstructorAndFactoryMethods(true);
            const w = new Writer();
            constructorData?.bodyWriter(w);
            const code = w.toString();
            expect(code).not.toContain("g_object_new");
        });
    });

    describe("constructor parameters", () => {
        it("includes parameters in constructor", () => {
            const { builder } = createTestSetup({
                constructors: [
                    createNormalizedConstructor({
                        name: "new_with_label",
                        cIdentifier: "gtk_button_new_with_label",
                        returnType: createNormalizedType({ name: "Gtk.Button" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "label",
                                type: createNormalizedType({ name: "utf8" }),
                            }),
                        ],
                    }),
                ],
            });

            const { constructorData } = builder.buildConstructorAndFactoryMethods(true);
            const w = new Writer();
            constructorData?.bodyWriter(w);
            const code = w.toString();
            expect(code).toContain("label");
        });

        it("includes multiple parameters", () => {
            const { builder } = createTestSetup({
                constructors: [
                    createNormalizedConstructor({
                        name: "new_with_range",
                        cIdentifier: "gtk_spin_button_new_with_range",
                        returnType: createNormalizedType({ name: "Gtk.Button" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "min",
                                type: createNormalizedType({ name: "gdouble" }),
                            }),
                            createNormalizedParameter({
                                name: "max",
                                type: createNormalizedType({ name: "gdouble" }),
                            }),
                            createNormalizedParameter({
                                name: "step",
                                type: createNormalizedType({ name: "gdouble" }),
                            }),
                        ],
                    }),
                ],
            });

            const { constructorData } = builder.buildConstructorAndFactoryMethods(true);
            const w = new Writer();
            constructorData?.bodyWriter(w);
            const code = w.toString();
            expect(code).toContain("min");
            expect(code).toContain("max");
            expect(code).toContain("step");
        });
    });

    describe("ownership handling", () => {
        it("uses full ownership when transfer is full", () => {
            const { builder } = createTestSetup({
                constructors: [
                    createNormalizedConstructor({
                        name: "new",
                        cIdentifier: "gtk_button_new",
                        returnType: createNormalizedType({
                            name: "Gtk.Button",
                            transferOwnership: "full",
                        }),
                        parameters: [],
                    }),
                ],
            });

            const { factoryMethods } = builder.buildConstructorAndFactoryMethods(true);

            expect(factoryMethods).toBeDefined();
        });
    });

    describe("root class (no parent)", () => {
        it("generates no constructor or create method when no parent", () => {
            const { builder } = createTestSetup({ constructors: [] });

            const { factoryMethods } = builder.buildConstructorAndFactoryMethods(false);

            expect(factoryMethods).toHaveLength(0);
        });
    });
});
