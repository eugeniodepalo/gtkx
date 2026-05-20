import { describe, expect, it } from "vitest";
import { Writer } from "../../../../src/builders/text-writer.js";
import { ConstructorBuilder } from "../../../../src/ffi/generators/class/constructor-builder.js";
import { setupGtkFfiContext } from "../../../fixtures/generator-fixtures.js";
import {
    createNormalizedClass,
    createNormalizedConstructor,
    type createNormalizedNamespace,
    createNormalizedParameter,
    createNormalizedType,
    gtkButtonNewConstructors,
    qualifiedName,
} from "../../../fixtures/gir-fixtures.js";

function createTestSetup(
    classOverrides: Partial<Parameters<typeof createNormalizedClass>[0]> = {},
    namespaces: Map<string, ReturnType<typeof createNormalizedNamespace>> = new Map(),
) {
    const { repo, ffiMapper, file: imports, options } = setupGtkFfiContext(namespaces);
    const cls = createNormalizedClass({
        name: "Button",
        qualifiedName: qualifiedName("Gtk", "Button"),
        parent: null,
        constructors: [],
        ...classOverrides,
    });
    const builder = new ConstructorBuilder({ cls, ffiMapper, imports, repository: repo, options });
    return { cls, builder, imports, ffiMapper };
}

describe("ConstructorBuilder / constructor", () => {
    it("creates builder with class and dependencies", () => {
        const { builder } = createTestSetup();
        expect(builder).toBeInstanceOf(ConstructorBuilder);
    });
});

describe("ConstructorBuilder / metaPlan (1)", () => {
    it("returns a props type alias for every class", () => {
        const { builder } = createTestSetup({ constructors: [] });

        const { metaPlan } = builder.build();

        expect(metaPlan.propsTypeName).toBe("ButtonProps");
        expect(metaPlan.propsTypeBody).toBe("{}");
    });

    it("omits the construction-meta writer when no glibGetType is present", () => {
        const { builder } = createTestSetup({
            constructors: [],
            glibGetType: undefined,
            glibTypeName: undefined,
        });

        const { metaPlan } = builder.build();

        expect(metaPlan.constructionMetaWriter).toBeNull();
    });

    it("emits a construction-meta writer when glibGetType + glibTypeName are present", () => {
        const { builder } = createTestSetup({
            constructors: [],
            glibGetType: "gtk_button_get_type",
            glibTypeName: "GtkButton",
        });

        const { metaPlan } = builder.build();

        expect(metaPlan.constructionMetaWriter).not.toBeNull();
        const w = new Writer();
        metaPlan.constructionMetaWriter?.(w);
        const code = w.toString();
        expect(code).toContain("registerConstructionMeta(Button");
        expect(code).toContain(`kind: "gobject"`);
    });
});

describe("ConstructorBuilder / metaPlan (2)", () => {
    it("includes the intern fallback expression for classes without a real _get_type fn", () => {
        const { builder } = createTestSetup({
            constructors: [],
            glibGetType: "intern",
            glibTypeName: "GtkSomethingInternal",
        });

        const { metaPlan } = builder.build();

        const w = new Writer();
        metaPlan.constructionMetaWriter?.(w);
        const code = w.toString();
        expect(code).toContain(`g_type_from_name`);
        expect(code).toContain(`"GtkSomethingInternal"`);
    });
});

describe("ConstructorBuilder / factoryMethods (1)", () => {
    it("returns no factory methods when the class has no constructors", () => {
        const { builder } = createTestSetup({ constructors: [] });

        const { factoryMethods } = builder.build();

        expect(factoryMethods).toHaveLength(0);
    });

    it("emits every GIR constructor as a static factory method", () => {
        const { builder } = createTestSetup({ constructors: gtkButtonNewConstructors() });

        const { factoryMethods } = builder.build();

        expect(factoryMethods.map((m) => m.name).sort()).toEqual(["new", "newWithLabel"]);
    });
});

describe("ConstructorBuilder / factoryMethods (2)", () => {
    it("marks every factory method as static", () => {
        const { builder } = createTestSetup({
            constructors: [
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

        const { factoryMethods } = builder.build();

        for (const m of factoryMethods) {
            expect(m.isStatic).toBe(true);
        }
    });

    it("declares the class name as the factory return type", () => {
        const { builder } = createTestSetup({
            constructors: [
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

        const { factoryMethods } = builder.build();

        expect(factoryMethods[0]?.returnType).toBe("Button");
    });
});

describe("ConstructorBuilder / factoryMethods (3)", () => {
    it("does not exclude the GIR `new` constructor from factory emission", () => {
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

        const { factoryMethods } = builder.build();

        expect(factoryMethods).toHaveLength(1);
        expect(factoryMethods[0]?.name).toBe("new");
    });

    it("skips constructors that conflict with the parent's factory methods", () => {
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
        builder.setParentFactoryMethodNames(new Set(["new"]));

        const { factoryMethods } = builder.build();

        expect(factoryMethods).toHaveLength(0);
    });
});
