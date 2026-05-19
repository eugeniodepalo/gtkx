import { describe, expect, it } from "vitest";
import { fileBuilder } from "../../../../src/builders/file-builder.js";
import { classDecl } from "../../../../src/builders/index.js";
import { stringify } from "../../../../src/builders/stringify.js";
import {
    type InterfacePropertySource,
    PropertyAccessorBuilder,
} from "../../../../src/ffi/generators/class/property-accessor-builder.js";
import type { GirMethod, GirProperty, GirRepository } from "../../../../src/gir/index.js";
import { FfiMapper } from "../../../../src/type-system/ffi-mapper.js";
import {
    createNormalizedClass,
    createNormalizedEnumeration,
    createNormalizedField,
    createNormalizedMethod,
    createNormalizedNamespace,
    createNormalizedParameter,
    createNormalizedProperty,
    createNormalizedRecord,
    createNormalizedType,
    qualifiedName,
} from "../../../fixtures/gir-fixtures.js";
import { createMockRepository } from "../../../fixtures/mock-repository.js";

const OPTIONS = {
    namespace: "Gtk",
    sharedLibrary: "libgtk-4.so.1",
    glibLibrary: "libglib-2.0.so.0",
    gobjectLibrary: "libgobject-2.0.so.0",
};

function buildGtkNamespace() {
    const ns = createNormalizedNamespace({ name: "Gtk" });
    ns.classes.set(
        "Widget",
        createNormalizedClass({ name: "Widget", qualifiedName: qualifiedName("Gtk", "Widget"), parent: null }),
    );
    ns.enumerations.set("Orientation", createNormalizedEnumeration({ name: "Orientation" }));
    ns.bitfields.set("StateFlags", createNormalizedEnumeration({ name: "StateFlags" }));
    ns.records.set(
        "Border",
        createNormalizedRecord({
            name: "Border",
            qualifiedName: qualifiedName("Gtk", "Border"),
            glibTypeName: "GtkBorder",
            glibGetType: "gtk_border_get_type",
        }),
    );
    return ns;
}

function createSetup(
    classOverrides: Partial<Parameters<typeof createNormalizedClass>[0]> = {},
    customize?: (ns: ReturnType<typeof buildGtkNamespace>) => void,
) {
    const ns = buildGtkNamespace();
    customize?.(ns);
    const cls = createNormalizedClass({
        name: "Button",
        qualifiedName: qualifiedName("Gtk", "Button"),
        parent: null,
        ...classOverrides,
    });
    ns.classes.set("Button", cls);
    const repo = createMockRepository(new Map([["Gtk", ns]]));
    const ffiMapper = new FfiMapper(repo as ConstructorParameters<typeof FfiMapper>[0], "Gtk");
    const file = fileBuilder();
    const builder = new PropertyAccessorBuilder(
        cls,
        ffiMapper,
        file,
        repo as unknown as GirRepository,
        OPTIONS,
        new Set(["Button"]),
    );
    return { builder, cls, file };
}

function createInterfaceSetup(
    properties: readonly GirProperty[],
    methods: readonly GirMethod[] = [],
): { builder: PropertyAccessorBuilder; file: ReturnType<typeof fileBuilder> } {
    const ns = buildGtkNamespace();
    const repo = createMockRepository(new Map([["Gtk", ns]]));
    const ffiMapper = new FfiMapper(repo as ConstructorParameters<typeof FfiMapper>[0], "Gtk");
    const file = fileBuilder();
    const methodsByCIdentifier = new Map<string, GirMethod>();
    for (const method of methods) {
        methodsByCIdentifier.set(method.cIdentifier, method);
        methodsByCIdentifier.set(method.name, method);
    }
    const source: InterfacePropertySource = {
        ownerName: "Orientable",
        properties,
        methodsByCIdentifier,
        virtualMethodNames: new Set<string>(),
    };
    const builder = new PropertyAccessorBuilder(
        null,
        ffiMapper,
        file,
        repo as unknown as GirRepository,
        OPTIONS,
        new Set(["Orientable"]),
        source,
    );
    return { builder, file };
}

function renderAccessors(builder: PropertyAccessorBuilder): string {
    const cls = classDecl("Subject", { exported: true });
    for (const { accessor } of builder.buildAccessors()) {
        cls.addAccessor(accessor);
    }
    const file = fileBuilder();
    file.add(cls);
    return stringify(file);
}

describe("PropertyAccessorBuilder", () => {
    describe("buildAccessors with a class source", () => {
        it("emits a synthetic get/set accessor for a writable string property", () => {
            const { builder } = createSetup({
                properties: [
                    createNormalizedProperty({
                        name: "label",
                        type: createNormalizedType({ name: "utf8" }),
                        getter: undefined,
                        setter: undefined,
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain("get label(): string {");
            expect(code).toContain('return this.getProperty("label");');
            expect(code).toContain("set label(value: string) {");
            expect(code).toContain('this.setProperty("label", value);');
        });

        it("emits a getter-only accessor for a construct-only property", () => {
            const { builder } = createSetup({
                properties: [
                    createNormalizedProperty({
                        name: "name",
                        type: createNormalizedType({ name: "utf8" }),
                        constructOnly: true,
                        getter: undefined,
                        setter: undefined,
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain("get name(): string {");
            expect(code).not.toContain("set name(");
        });

        it("emits no setter for a read-only property", () => {
            const { builder } = createSetup({
                properties: [
                    createNormalizedProperty({
                        name: "computed",
                        type: createNormalizedType({ name: "utf8" }),
                        writable: false,
                        getter: undefined,
                        setter: undefined,
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain("get computed(): string {");
            expect(code).not.toContain("set computed(");
        });

        it("delegates the getter to an explicit GIR getter method", () => {
            const { builder } = createSetup({
                methods: [
                    createNormalizedMethod({
                        name: "get_text",
                        cIdentifier: "gtk_button_get_text",
                        returnType: createNormalizedType({ name: "utf8" }),
                    }),
                ],
                properties: [
                    createNormalizedProperty({
                        name: "label",
                        type: createNormalizedType({ name: "utf8" }),
                        getter: "gtk_button_get_text",
                        setter: undefined,
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain("return this.getText();");
        });

        it("delegates the setter to an explicit GIR setter method", () => {
            const { builder } = createSetup({
                methods: [
                    createNormalizedMethod({
                        name: "assign_text",
                        cIdentifier: "gtk_button_assign_text",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "text",
                                type: createNormalizedType({ name: "utf8" }),
                            }),
                        ],
                    }),
                ],
                properties: [
                    createNormalizedProperty({
                        name: "label",
                        type: createNormalizedType({ name: "utf8" }),
                        getter: undefined,
                        setter: "gtk_button_assign_text",
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain("this.assignText(value);");
        });

        it("widens the getter return type to include null for a null-default property", () => {
            const { builder } = createSetup({
                properties: [
                    createNormalizedProperty({
                        name: "label",
                        type: createNormalizedType({ name: "utf8" }),
                        defaultValue: { kind: "null" },
                        getter: undefined,
                        setter: undefined,
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain("get label(): string | null {");
        });

        it("emits a synthetic accessor for an enum-typed property", () => {
            const { builder } = createSetup({
                properties: [
                    createNormalizedProperty({
                        name: "orientation",
                        type: createNormalizedType({ name: "Orientation" }),
                        getter: undefined,
                        setter: undefined,
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain("get orientation()");
            expect(code).toContain('return this.getProperty("orientation");');
            expect(code).toContain('this.setProperty("orientation", value);');
        });

        it("emits a synthetic accessor for a flags-typed property", () => {
            const { builder } = createSetup({
                properties: [
                    createNormalizedProperty({
                        name: "state-flags",
                        type: createNormalizedType({ name: "StateFlags" }),
                        getter: undefined,
                        setter: undefined,
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain("get stateFlags()");
            expect(code).toContain('return this.getProperty("state-flags");');
        });

        it("emits a synthetic accessor for a class-typed property", () => {
            const { builder } = createSetup({
                properties: [
                    createNormalizedProperty({
                        name: "child",
                        type: createNormalizedType({ name: "Widget" }),
                        getter: undefined,
                        setter: undefined,
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain("get child()");
            expect(code).toContain('return this.getProperty("child");');
            expect(code).toContain('this.setProperty("child", value);');
        });

        it("widens a boxed-record getter return type to include null", () => {
            const { builder } = createSetup({
                properties: [
                    createNormalizedProperty({
                        name: "border",
                        type: createNormalizedType({ name: "Border" }),
                        getter: undefined,
                        setter: undefined,
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toMatch(/get border\(\): [^\n]*\| null/);
        });

        it("emits a synthetic accessor for a boxed record property", () => {
            const { builder } = createSetup({
                properties: [
                    createNormalizedProperty({
                        name: "border",
                        type: createNormalizedType({ name: "Border" }),
                        getter: undefined,
                        setter: undefined,
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain("get border()");
            expect(code).toContain('return this.getProperty("border");');
        });

        it("emits a generic unknown getter for a property with an unmappable type", () => {
            const { builder } = createSetup({
                properties: [
                    createNormalizedProperty({
                        name: "user-data",
                        type: createNormalizedType({ name: "SomethingUnknown" }),
                        getter: undefined,
                        setter: undefined,
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain("get userData(): unknown {");
            expect(code).toContain('return this.getProperty("user-data");');
            expect(code).not.toContain("set userData(");
        });

        it("returns no accessors for a class with no properties", () => {
            const { builder } = createSetup({ properties: [] });

            expect(builder.buildAccessors()).toHaveLength(0);
        });
    });

    describe("buildAccessors with an interface source", () => {
        it("emits a synthetic accessor for an interface property", () => {
            const { builder } = createInterfaceSetup([
                createNormalizedProperty({
                    name: "orientation",
                    type: createNormalizedType({ name: "Orientation" }),
                    getter: undefined,
                    setter: undefined,
                }),
            ]);

            const code = renderAccessors(builder);

            expect(code).toContain("get orientation()");
            expect(code).toContain('return this.getProperty("orientation");');
        });

        it("delegates to an interface getter method resolved by C identifier", () => {
            const { builder } = createInterfaceSetup(
                [
                    createNormalizedProperty({
                        name: "label",
                        type: createNormalizedType({ name: "utf8" }),
                        getter: "gtk_orientable_get_text",
                        setter: undefined,
                    }),
                ],
                [
                    createNormalizedMethod({
                        name: "get_text",
                        cIdentifier: "gtk_orientable_get_text",
                        returnType: createNormalizedType({ name: "utf8" }),
                    }),
                ],
            );

            const code = renderAccessors(builder);

            expect(code).toContain("return this.getText();");
        });

        it("returns no accessors for an interface source with no properties", () => {
            const { builder } = createInterfaceSetup([]);

            expect(builder.buildAccessors()).toHaveLength(0);
        });
    });

    describe("delegate resolution edge cases", () => {
        it("falls back to a synthetic getter when the getter method has parameters", () => {
            const { builder } = createSetup({
                methods: [
                    createNormalizedMethod({
                        name: "get_text",
                        cIdentifier: "gtk_button_get_text",
                        returnType: createNormalizedType({ name: "utf8" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "extra",
                                type: createNormalizedType({ name: "gint" }),
                            }),
                        ],
                    }),
                ],
                properties: [
                    createNormalizedProperty({
                        name: "label",
                        type: createNormalizedType({ name: "utf8" }),
                        getter: "gtk_button_get_text",
                        setter: undefined,
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain('return this.getProperty("label");');
            expect(code).not.toContain("this.getText()");
        });

        it("falls back to a synthetic getter when the getter method returns void", () => {
            const { builder } = createSetup({
                methods: [
                    createNormalizedMethod({
                        name: "get_text",
                        cIdentifier: "gtk_button_get_text",
                        returnType: createNormalizedType({ name: "none" }),
                    }),
                ],
                properties: [
                    createNormalizedProperty({
                        name: "label",
                        type: createNormalizedType({ name: "utf8" }),
                        getter: "gtk_button_get_text",
                        setter: undefined,
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain('return this.getProperty("label");');
        });

        it("falls back to a synthetic getter when the getter return type differs from the property type", () => {
            const { builder } = createSetup({
                methods: [
                    createNormalizedMethod({
                        name: "get_count",
                        cIdentifier: "gtk_button_get_count",
                        returnType: createNormalizedType({ name: "gint" }),
                    }),
                ],
                properties: [
                    createNormalizedProperty({
                        name: "label",
                        type: createNormalizedType({ name: "utf8" }),
                        getter: "gtk_button_get_count",
                        setter: undefined,
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain('return this.getProperty("label");');
        });

        it("falls back to a synthetic setter when the setter method has the wrong arity", () => {
            const { builder } = createSetup({
                methods: [
                    createNormalizedMethod({
                        name: "assign_text",
                        cIdentifier: "gtk_button_assign_text",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "text",
                                type: createNormalizedType({ name: "utf8" }),
                            }),
                            createNormalizedParameter({
                                name: "extra",
                                type: createNormalizedType({ name: "gint" }),
                            }),
                        ],
                    }),
                ],
                properties: [
                    createNormalizedProperty({
                        name: "label",
                        type: createNormalizedType({ name: "utf8" }),
                        getter: undefined,
                        setter: "gtk_button_assign_text",
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain('this.setProperty("label", value);');
            expect(code).not.toContain("assignText");
        });

        it("widens the getter return type to null when the delegate getter method is nullable", () => {
            const { builder } = createSetup({
                methods: [
                    createNormalizedMethod({
                        name: "get_text",
                        cIdentifier: "gtk_button_get_text",
                        returnType: createNormalizedType({ name: "utf8", nullable: true }),
                    }),
                ],
                properties: [
                    createNormalizedProperty({
                        name: "label",
                        type: createNormalizedType({ name: "utf8" }),
                        getter: "gtk_button_get_text",
                        setter: undefined,
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain("get label(): string | null {");
        });

        it("emits a generic accessor for a write-only property", () => {
            const { builder } = createSetup({
                properties: [
                    createNormalizedProperty({
                        name: "secret",
                        type: createNormalizedType({ name: "utf8" }),
                        readable: false,
                        writable: true,
                        getter: undefined,
                        setter: undefined,
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain("get secret(): unknown {");
        });

        it("falls back to a synthetic setter when the delegate setter parameter type is unsafe", () => {
            const { builder } = createSetup({
                methods: [
                    createNormalizedMethod({
                        name: "assign_cb",
                        cIdentifier: "gtk_button_assign_cb",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "cb",
                                type: createNormalizedType({ name: "GLib.Closure" }),
                            }),
                        ],
                    }),
                ],
                properties: [
                    createNormalizedProperty({
                        name: "label",
                        type: createNormalizedType({ name: "utf8" }),
                        getter: undefined,
                        setter: "gtk_button_assign_cb",
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain('this.setProperty("label", value);');
            expect(code).not.toContain("assignCb");
        });

        it("ignores a delegate getter whose camelCase name equals the property name", () => {
            const { builder } = createSetup({
                methods: [
                    createNormalizedMethod({
                        name: "label",
                        cIdentifier: "gtk_button_label",
                        returnType: createNormalizedType({ name: "utf8" }),
                    }),
                ],
                properties: [
                    createNormalizedProperty({
                        name: "label",
                        type: createNormalizedType({ name: "utf8" }),
                        getter: "gtk_button_label",
                        setter: undefined,
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain('return this.getProperty("label");');
        });

        it("derives the setter parameter type from a non-nullable delegate setter parameter", () => {
            const { builder } = createSetup({
                methods: [
                    createNormalizedMethod({
                        name: "assign_count",
                        cIdentifier: "gtk_button_assign_count",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "count",
                                type: createNormalizedType({ name: "gint" }),
                            }),
                        ],
                    }),
                ],
                properties: [
                    createNormalizedProperty({
                        name: "label",
                        type: createNormalizedType({ name: "utf8" }),
                        getter: undefined,
                        setter: "gtk_button_assign_count",
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain("set label(value: number) {");
        });

        it("derives the setter parameter type from a nullable delegate setter parameter", () => {
            const { builder } = createSetup({
                methods: [
                    createNormalizedMethod({
                        name: "assign_text",
                        cIdentifier: "gtk_button_assign_text",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "text",
                                type: createNormalizedType({ name: "utf8", nullable: true }),
                                nullable: true,
                            }),
                        ],
                    }),
                ],
                properties: [
                    createNormalizedProperty({
                        name: "label",
                        type: createNormalizedType({ name: "utf8" }),
                        getter: undefined,
                        setter: "gtk_button_assign_text",
                    }),
                ],
            });

            const code = renderAccessors(builder);

            expect(code).toContain("set label(value: string | null) {");
            expect(code).toContain("this.assignText(value);");
        });
    });

    describe("fundamental and boxed property types", () => {
        it("emits a synthetic accessor for a GVariant-style fundamental class property", () => {
            const { builder } = createSetup(
                {
                    properties: [
                        createNormalizedProperty({
                            name: "value",
                            type: createNormalizedType({ name: "VariantHolder" }),
                            getter: undefined,
                            setter: undefined,
                        }),
                    ],
                },
                (ns) => {
                    ns.classes.set(
                        "VariantHolder",
                        createNormalizedClass({
                            name: "VariantHolder",
                            qualifiedName: qualifiedName("Gtk", "VariantHolder"),
                            parent: null,
                            fundamental: true,
                            refFunc: "g_variant_ref_sink",
                            unrefFunc: "g_variant_unref",
                        }),
                    );
                },
            );

            const code = renderAccessors(builder);

            expect(code).toContain("get value()");
            expect(code).toContain('return this.getProperty("value");');
        });

        it("emits a synthetic accessor for a GParamSpec-style fundamental class property", () => {
            const { builder } = createSetup(
                {
                    properties: [
                        createNormalizedProperty({
                            name: "spec",
                            type: createNormalizedType({ name: "ParamHolder" }),
                            getter: undefined,
                            setter: undefined,
                        }),
                    ],
                },
                (ns) => {
                    ns.classes.set(
                        "ParamHolder",
                        createNormalizedClass({
                            name: "ParamHolder",
                            qualifiedName: qualifiedName("Gtk", "ParamHolder"),
                            parent: null,
                            fundamental: true,
                            refFunc: "g_param_spec_ref_sink",
                            unrefFunc: "g_param_spec_unref",
                        }),
                    );
                },
            );

            const code = renderAccessors(builder);

            expect(code).toContain("get spec()");
            expect(code).toContain('return this.getProperty("spec");');
        });

        it("emits a synthetic accessor for a boxed-style fundamental class property", () => {
            const { builder } = createSetup(
                {
                    properties: [
                        createNormalizedProperty({
                            name: "expr",
                            type: createNormalizedType({ name: "Expression" }),
                            getter: undefined,
                            setter: undefined,
                        }),
                    ],
                },
                (ns) => {
                    ns.classes.set(
                        "Expression",
                        createNormalizedClass({
                            name: "Expression",
                            qualifiedName: qualifiedName("Gtk", "Expression"),
                            parent: null,
                            fundamental: true,
                            refFunc: "gtk_expression_ref",
                            unrefFunc: "gtk_expression_unref",
                            glibTypeName: "GtkExpression",
                        }),
                    );
                },
            );

            const code = renderAccessors(builder);

            expect(code).toContain("get expr()");
            expect(code).toContain('return this.getProperty("expr");');
            expect(code).toContain('this.setProperty("expr", value);');
        });

        it("emits a synthetic accessor for a fundamental record property", () => {
            const { builder } = createSetup(
                {
                    properties: [
                        createNormalizedProperty({
                            name: "node",
                            type: createNormalizedType({ name: "RenderNode" }),
                            getter: undefined,
                            setter: undefined,
                        }),
                    ],
                },
                (ns) => {
                    ns.records.set(
                        "RenderNode",
                        createNormalizedRecord({
                            name: "RenderNode",
                            qualifiedName: qualifiedName("Gtk", "RenderNode"),
                            isUnion: false,
                            glibTypeName: "GtkRenderNode",
                            glibGetType: "gtk_render_node_get_type",
                            copyFunction: "gtk_render_node_ref",
                            freeFunction: "gtk_render_node_unref",
                            fields: [
                                createNormalizedField({ name: "kind", type: createNormalizedType({ name: "gint" }) }),
                            ],
                        }),
                    );
                },
            );

            const code = renderAccessors(builder);

            expect(code).toContain("get node()");
            expect(code).toContain('return this.getProperty("node");');
        });
    });
});
