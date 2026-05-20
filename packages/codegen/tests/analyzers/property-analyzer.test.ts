import { describe, expect, it } from "vitest";
import { PropertyAnalyzer } from "../../src/analyzers/property-analyzer.js";
import { FfiMapper } from "../../src/type-system/ffi-mapper.js";
import {
    createNormalizedClass,
    createNormalizedConstructor,
    createNormalizedEnumeration,
    createNormalizedInterface,
    createNormalizedMethod,
    createNormalizedNamespace,
    createNormalizedParameter,
    createNormalizedProperty,
    createNormalizedType,
    createWidgetClass,
    gtkNamespaceWith,
    NULL_REPO,
    qualifiedName,
    singleClassRepo,
} from "../fixtures/gir-fixtures.js";
import { createMockRepository } from "../fixtures/mock-repository.js";

function createTestSetup(namespaces: Map<string, ReturnType<typeof createNormalizedNamespace>>) {
    const repo = createMockRepository(namespaces);
    const mapper = new FfiMapper(repo as ConstructorParameters<typeof FfiMapper>[0], "Gtk");
    const analyzer = new PropertyAnalyzer(repo as ConstructorParameters<typeof PropertyAnalyzer>[0], mapper);
    return { repo, mapper, analyzer };
}

describe("PropertyAnalyzer / analyzeWidgetProperties (1)", () => {
    it("returns empty array for class with no properties", () => {
        const cls = createNormalizedClass({ properties: [] });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result).toHaveLength(0);
    });

    it("analyzes property with basic types", () => {
        const cls = createNormalizedClass({
            name: "Button",
            parent: null,
            properties: [createNormalizedProperty({ name: "label", type: createNormalizedType({ name: "utf8" }) })],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            name: "label",
            camelName: "label",
            type: "string",
            isWritable: true,
        });
    });
});

describe("PropertyAnalyzer / analyzeWidgetProperties (2)", () => {
    it("converts property name to camelCase", () => {
        const cls = createNormalizedClass({
            name: "Button",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "icon-name",
                    type: createNormalizedType({ name: "utf8" }),
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result[0]?.camelName).toBe("iconName");
    });
});

describe("PropertyAnalyzer / analyzeWidgetProperties (3)", () => {
    it("marks property as required when in constructor", () => {
        const cls = createNormalizedClass({
            name: "Box",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "orientation",
                    type: createNormalizedType({ name: "gint" }),
                }),
                createNormalizedProperty({
                    name: "spacing",
                    type: createNormalizedType({ name: "gint" }),
                }),
            ],
            constructors: [
                createNormalizedConstructor({
                    name: "new",
                    parameters: [
                        createNormalizedParameter({
                            name: "orientation",
                            type: createNormalizedType({ name: "gint" }),
                            nullable: false,
                            optional: false,
                        }),
                        createNormalizedParameter({
                            name: "spacing",
                            type: createNormalizedType({ name: "gint" }),
                            nullable: false,
                            optional: false,
                        }),
                    ],
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result.find((p) => p.name === "orientation")?.isRequired).toBe(true);
        expect(result.find((p) => p.name === "spacing")?.isRequired).toBe(true);
    });
});

describe("PropertyAnalyzer / analyzeWidgetProperties (4)", () => {
    it("marks property as not required when nullable in constructor", () => {
        const cls = createNormalizedClass({
            name: "Button",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "label",
                    type: createNormalizedType({ name: "utf8" }),
                }),
            ],
            constructors: [
                createNormalizedConstructor({
                    name: "new",
                    parameters: [
                        createNormalizedParameter({
                            name: "label",
                            type: createNormalizedType({ name: "utf8" }),
                            nullable: true,
                        }),
                    ],
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result[0]?.isRequired).toBe(false);
    });
});

describe("PropertyAnalyzer / analyzeWidgetProperties (5)", () => {
    it("marks read-only property correctly", () => {
        const cls = createNormalizedClass({
            name: "Widget",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "allocated-width",
                    type: createNormalizedType({ name: "gint" }),
                    writable: false,
                    readable: true,
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result[0]?.isWritable).toBe(false);
    });

    it("excludes hidden properties", () => {
        const cls = createNormalizedClass({
            name: "Widget",
            parent: null,
            properties: [
                createNormalizedProperty({ name: "visible" }),
                createNormalizedProperty({ name: "sensitive" }),
                createNormalizedProperty({ name: "internal-prop" }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const hiddenProps = new Set(["internalProp"]);
        const result = analyzer.analyzeWidgetProperties(cls, hiddenProps);

        expect(result).toHaveLength(2);
        expect(result.map((p) => p.name)).not.toContain("internal-prop");
    });
});

describe("PropertyAnalyzer / analyzeWidgetProperties (6)", () => {
    it("excludes properties inherited from parent class", () => {
        const widgetClass = createWidgetClass({}, NULL_REPO);
        const buttonClass = createNormalizedClass(
            {
                name: "Button",
                qualifiedName: qualifiedName("Gtk", "Button"),
                parent: qualifiedName("Gtk", "Widget"),
                properties: [
                    createNormalizedProperty({ name: "label" }),
                    createNormalizedProperty({ name: "icon-name" }),
                ],
            },
            singleClassRepo(widgetClass),
        );

        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([
                ["Widget", widgetClass],
                ["Button", buttonClass],
            ]),
        });
        const { analyzer } = createTestSetup(new Map([["Gtk", ns]]));

        const result = analyzer.analyzeWidgetProperties(buttonClass);

        expect(result.map((p) => p.name)).toContain("label");
        expect(result.map((p) => p.name)).toContain("icon-name");
        expect(result.map((p) => p.name)).not.toContain("visible");
        expect(result.map((p) => p.name)).not.toContain("sensitive");
    });
});

describe("PropertyAnalyzer / analyzeWidgetProperties (7)", () => {
    it("includes properties from directly implemented interfaces", () => {
        const orientable = createNormalizedInterface({
            name: "Orientable",
            qualifiedName: qualifiedName("Gtk", "Orientable"),
            properties: [
                createNormalizedProperty({
                    name: "orientation",
                    type: createNormalizedType({ name: "gint" }),
                }),
            ],
        });
        const boxClass = createNormalizedClass({
            name: "Box",
            parent: null,
            implements: [qualifiedName("Gtk", "Orientable")],
            properties: [createNormalizedProperty({ name: "spacing" })],
        });

        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([["Box", boxClass]]),
            interfaces: new Map([["Orientable", orientable]]),
        });
        const { analyzer } = createTestSetup(new Map([["Gtk", ns]]));

        const result = analyzer.analyzeWidgetProperties(boxClass);

        expect(result.map((p) => p.name)).toContain("orientation");
        expect(result.map((p) => p.name)).toContain("spacing");
    });
});

describe("PropertyAnalyzer / analyzeWidgetProperties (8)", () => {
    it("preserves getter and setter names when method lookup fails", () => {
        const cls = createNormalizedClass({
            name: "Button",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "label",
                    getter: "get_label",
                    setter: "set_label",
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result[0]?.getter).toBe("get_label");
        expect(result[0]?.setter).toBe("set_label");
    });
});

describe("PropertyAnalyzer / analyzeWidgetProperties (9)", () => {
    it("resolves C identifier accessors to method names", () => {
        const cls = createNormalizedClass({
            name: "Image",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "file",
                    getter: "gtk_image_get_file",
                    setter: "gtk_image_set_from_file",
                }),
            ],
            methods: [
                createNormalizedMethod({
                    name: "get_file",
                    cIdentifier: "gtk_image_get_file",
                    returnType: createNormalizedType({ name: "utf8", nullable: true }),
                }),
                createNormalizedMethod({
                    name: "set_from_file",
                    cIdentifier: "gtk_image_set_from_file",
                    parameters: [
                        createNormalizedParameter({
                            name: "filename",
                            type: createNormalizedType({ name: "utf8", nullable: true }),
                        }),
                    ],
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result[0]?.getter).toBe("get_file");
        expect(result[0]?.setter).toBe("set_from_file");
    });
});

describe("PropertyAnalyzer / analyzeWidgetProperties (10)", () => {
    it("tracks referenced external namespaces", () => {
        const gdkTexture = createNormalizedClass({
            name: "Texture",
            qualifiedName: qualifiedName("Gdk", "Texture"),
        });
        const gdkNs = createNormalizedNamespace({
            name: "Gdk",
            classes: new Map([["Texture", gdkTexture]]),
        });

        const imageClass = createNormalizedClass({
            name: "Image",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "paintable",
                    type: createNormalizedType({ name: "Gdk.Texture" }),
                }),
            ],
        });
        const gtkNs = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([["Image", imageClass]]),
        });

        const repo = createMockRepository(
            new Map([
                ["Gtk", gtkNs],
                ["Gdk", gdkNs],
            ]),
        );
        const mapper = new FfiMapper(repo as ConstructorParameters<typeof FfiMapper>[0], "Gtk");
        const analyzer = new PropertyAnalyzer(repo as ConstructorParameters<typeof PropertyAnalyzer>[0], mapper);

        const result = analyzer.analyzeWidgetProperties(imageClass);

        expect(result[0]?.referencedNamespaces).toContain("Gdk");
    });
});

describe("PropertyAnalyzer / analyzeWidgetProperties (11)", () => {
    it("excludes application parameter from required check", () => {
        const cls = createNormalizedClass({
            name: "ApplicationWindow",
            parent: null,
            properties: [createNormalizedProperty({ name: "title" })],
            constructors: [
                createNormalizedConstructor({
                    name: "new",
                    parameters: [
                        createNormalizedParameter({
                            name: "application",
                            type: createNormalizedType({ name: "Gio.Application" }),
                            nullable: false,
                            optional: false,
                        }),
                    ],
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result.find((p) => p.name === "title")?.isRequired).toBe(false);
    });
});

describe("PropertyAnalyzer / analyzeWidgetProperties (12)", () => {
    it("preserves documentation", () => {
        const cls = createNormalizedClass({
            name: "Button",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "label",
                    doc: "The text shown in the button.",
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result[0]?.doc).toBe("The text shown in the button.");
    });
});

describe("PropertyAnalyzer / analyzeWidgetProperties (13)", () => {
    it("qualifies external types in property type", () => {
        const gdkRectangle = createNormalizedClass({
            name: "Rectangle",
            qualifiedName: qualifiedName("Gdk", "Rectangle"),
        });
        const gdkNs = createNormalizedNamespace({
            name: "Gdk",
            classes: new Map([["Rectangle", gdkRectangle]]),
        });

        const widgetClass = createNormalizedClass({
            name: "Widget",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "clip",
                    type: createNormalizedType({ name: "Gdk.Rectangle" }),
                }),
            ],
        });
        const gtkNs = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([["Widget", widgetClass]]),
        });

        const repo = createMockRepository(
            new Map([
                ["Gtk", gtkNs],
                ["Gdk", gdkNs],
            ]),
        );
        const mapper = new FfiMapper(repo as ConstructorParameters<typeof FfiMapper>[0], "Gtk");
        const analyzer = new PropertyAnalyzer(repo as ConstructorParameters<typeof PropertyAnalyzer>[0], mapper);

        const result = analyzer.analyzeWidgetProperties(widgetClass);

        expect(result[0]?.type).toBe("Gdk.Rectangle");
    });
});

describe("PropertyAnalyzer - Extended Coverage / construct-only properties", () => {
    it("does not generate synthetic setter for construct-only property", () => {
        const cls = createNormalizedClass({
            name: "ApplicationWindow",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "application",
                    type: createNormalizedType({ name: "gpointer" }),
                    writable: true,
                    constructOnly: true,
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result[0]?.hasSyntheticSetter).toBe(false);
    });

    it("generates synthetic setter for writable non-construct-only property", () => {
        const cls = createNormalizedClass({
            name: "Button",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "label",
                    type: createNormalizedType({ name: "utf8" }),
                    writable: true,
                    constructOnly: false,
                    setter: undefined,
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result[0]?.hasSyntheticSetter).toBe(true);
        expect(result[0]?.setter).toBe("setLabel");
    });
});

describe("PropertyAnalyzer - Extended Coverage / synthetic setter generation for different types (1)", () => {
    it("generates synthetic setter for enum property", () => {
        const enumType = createNormalizedEnumeration({ name: "Orientation" });
        const cls = createNormalizedClass({
            name: "Box",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "orientation",
                    type: createNormalizedType({ name: "Orientation" }),
                    writable: true,
                    setter: undefined,
                }),
            ],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            enumerations: new Map([["Orientation", enumType]]),
            classes: new Map([["Box", cls]]),
        });
        const { analyzer } = createTestSetup(new Map([["Gtk", ns]]));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result[0]?.hasSyntheticSetter).toBe(true);
    });
});

describe("PropertyAnalyzer - Extended Coverage / synthetic setter generation for different types (2)", () => {
    it("generates synthetic setter for flags property", () => {
        const flags = createNormalizedEnumeration({ name: "StateFlags" });
        const cls = createNormalizedClass({
            name: "Widget",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "state-flags",
                    type: createNormalizedType({ name: "StateFlags" }),
                    writable: true,
                    setter: undefined,
                }),
            ],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            bitfields: new Map([["StateFlags", flags]]),
            classes: new Map([["Widget", cls]]),
        });
        const { analyzer } = createTestSetup(new Map([["Gtk", ns]]));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result[0]?.hasSyntheticSetter).toBe(true);
    });
});

describe("PropertyAnalyzer - Extended Coverage / synthetic setter generation for different types (3)", () => {
    it("generates synthetic setter for class property", () => {
        const buttonClass = createNormalizedClass({
            name: "Button",
            qualifiedName: qualifiedName("Gtk", "Button"),
        });
        const containerClass = createNormalizedClass({
            name: "Container",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "child",
                    type: createNormalizedType({ name: "Button" }),
                    writable: true,
                    setter: undefined,
                }),
            ],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([
                ["Button", buttonClass],
                ["Container", containerClass],
            ]),
        });
        const { analyzer } = createTestSetup(new Map([["Gtk", ns]]));

        const result = analyzer.analyzeWidgetProperties(containerClass);

        expect(result[0]?.hasSyntheticSetter).toBe(true);
    });
});

describe("PropertyAnalyzer - Extended Coverage / synthetic setter generation for different types (4)", () => {
    it("generates synthetic setter for numeric primitives", () => {
        const cls = createNormalizedClass({
            name: "Scale",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "value",
                    type: createNormalizedType({ name: "gdouble" }),
                    writable: true,
                    setter: undefined,
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result[0]?.hasSyntheticSetter).toBe(true);
    });
});

describe("PropertyAnalyzer - Extended Coverage / synthetic setter generation for different types (5)", () => {
    it("does not generate synthetic setter when explicit setter exists", () => {
        const cls = createNormalizedClass({
            name: "Entry",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "text",
                    type: createNormalizedType({ name: "utf8" }),
                    writable: true,
                    setter: "set_text",
                }),
            ],
            methods: [
                createNormalizedMethod({
                    name: "set_text",
                    cIdentifier: "gtk_entry_set_text",
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result[0]?.hasSyntheticSetter).toBe(false);
        expect(result[0]?.setter).toBe("set_text");
    });
});

describe("PropertyAnalyzer - Extended Coverage / nullability inference (1)", () => {
    it("infers nullability from setter parameter", () => {
        const cls = createNormalizedClass({
            name: "Image",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "file",
                    type: createNormalizedType({ name: "utf8", nullable: false }),
                    setter: "gtk_image_set_file",
                    getter: "get_file",
                }),
            ],
            methods: [
                createNormalizedMethod({
                    name: "set_file",
                    cIdentifier: "gtk_image_set_file",
                    parameters: [createNormalizedParameter({ name: "file", nullable: true })],
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result[0]?.isNullable).toBe(true);
    });
});

describe("PropertyAnalyzer - Extended Coverage / nullability inference (2)", () => {
    it("does not infer nullability from getter return type", () => {
        const cls = createNormalizedClass({
            name: "Image",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "file",
                    type: createNormalizedType({ name: "utf8", nullable: false }),
                    setter: "gtk_image_set_file",
                    getter: "get_file",
                }),
            ],
            methods: [
                createNormalizedMethod({
                    name: "get_file",
                    cIdentifier: "gtk_image_get_file",
                    returnType: createNormalizedType({ name: "utf8", nullable: true }),
                }),
                createNormalizedMethod({
                    name: "set_file",
                    cIdentifier: "gtk_image_set_file",
                    parameters: [createNormalizedParameter({ name: "file", nullable: false })],
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result[0]?.isNullable).toBe(false);
    });
});

describe("PropertyAnalyzer - Extended Coverage / nullability inference (3)", () => {
    it("uses property type nullability when setter not present", () => {
        const cls = createNormalizedClass({
            name: "Button",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "icon-name",
                    type: createNormalizedType({ name: "utf8", nullable: true }),
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result[0]?.isNullable).toBe(true);
    });
});

describe("PropertyAnalyzer - Extended Coverage / nullability inference (4)", () => {
    it("marks property as non-nullable when both type and setter are non-nullable", () => {
        const cls = createNormalizedClass({
            name: "Button",
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "label",
                    type: createNormalizedType({ name: "utf8", nullable: false }),
                    setter: "gtk_button_set_label",
                    getter: "get_label",
                }),
            ],
            methods: [
                createNormalizedMethod({
                    name: "set_label",
                    cIdentifier: "gtk_button_set_label",
                    parameters: [createNormalizedParameter({ name: "label", nullable: false })],
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetProperties(cls);

        expect(result[0]?.isNullable).toBe(false);
    });
});

describe("PropertyAnalyzer - Extended Coverage / property defaults", () => {
    it("marks property as not required when it has a default value", () => {
        const widgetClass = createNormalizedClass({
            name: "Widget",
            qualifiedName: qualifiedName("Gtk", "Widget"),
            parent: null,
            properties: [
                createNormalizedProperty({
                    name: "visible",
                    type: createNormalizedType({ name: "gboolean" }),
                    defaultValue: { kind: "boolean", value: true },
                }),
            ],
            constructors: [
                createNormalizedConstructor({
                    name: "new",
                    parameters: [
                        createNormalizedParameter({
                            name: "visible",
                            type: createNormalizedType({ name: "gboolean" }),
                            nullable: false,
                            optional: false,
                        }),
                    ],
                }),
            ],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([["Widget", widgetClass]]),
        });
        const { analyzer } = createTestSetup(new Map([["Gtk", ns]]));

        const result = analyzer.analyzeWidgetProperties(widgetClass);

        expect(result.find((p) => p.name === "visible")?.isRequired).toBe(false);
    });
});
