import { describe, expect, it } from "vitest";
import { StaticFunctionBuilder } from "../../../../src/ffi/generators/class/static-function-builder.js";
import { FfiMapper } from "../../../../src/type-system/ffi-mapper.js";
import { setupGtkFfiContext } from "../../../fixtures/generator-fixtures.js";
import {
    createNormalizedClass,
    createNormalizedFunction,
    createNormalizedNamespace,
    createNormalizedParameter,
    createNormalizedType,
    qualifiedName,
} from "../../../fixtures/gir-fixtures.js";

function createTestSetup(
    classOverrides: Partial<Parameters<typeof createNormalizedClass>[0]> = {},
    namespaces: Map<string, ReturnType<typeof createNormalizedNamespace>> = new Map(),
) {
    const cls = createNormalizedClass({
        name: "Button",
        qualifiedName: qualifiedName("Gtk", "Button"),
        parent: null,
        staticFunctions: [],
        ...classOverrides,
    });
    namespaces.set("Gtk", createNormalizedNamespace({ name: "Gtk", classes: new Map([["Button", cls]]) }));
    const { ffiMapper, file, options } = setupGtkFfiContext(namespaces);
    const builder = new StaticFunctionBuilder({ cls, ffiMapper, imports: file, options });
    return { cls, builder, ffiMapper };
}

describe("StaticFunctionBuilder / constructor", () => {
    it("creates builder with class and dependencies", () => {
        const { builder } = createTestSetup();
        expect(builder).toBeInstanceOf(StaticFunctionBuilder);
    });
});

describe("StaticFunctionBuilder / buildStructures (1)", () => {
    it("returns empty array when no static functions", () => {
        const { builder } = createTestSetup({ staticFunctions: [] });

        const structures = builder.buildStructures();

        expect(structures).toHaveLength(0);
    });

    it("builds structure for single static function", () => {
        const { builder } = createTestSetup({
            staticFunctions: [
                createNormalizedFunction({
                    name: "get_default",
                    cIdentifier: "gtk_button_get_default",
                    returnType: createNormalizedType({ name: "Gtk.Button" }),
                    parameters: [],
                }),
            ],
        });

        const structures = builder.buildStructures();

        expect(structures).toHaveLength(1);
        expect(structures[0]?.name).toBe("getDefault");
        expect(structures[0]?.isStatic).toBe(true);
    });
});

describe("StaticFunctionBuilder / buildStructures (2)", () => {
    it("builds structures for multiple static functions", () => {
        const { builder } = createTestSetup({
            staticFunctions: [
                createNormalizedFunction({
                    name: "func_one",
                    cIdentifier: "gtk_button_func_one",
                    returnType: createNormalizedType({ name: "none" }),
                }),
                createNormalizedFunction({
                    name: "func_two",
                    cIdentifier: "gtk_button_func_two",
                    returnType: createNormalizedType({ name: "none" }),
                }),
            ],
        });

        const structures = builder.buildStructures();

        expect(structures).toHaveLength(2);
        expect(structures[0]?.name).toBe("funcOne");
        expect(structures[1]?.name).toBe("funcTwo");
    });

    it("converts function names to camelCase", () => {
        const { builder } = createTestSetup({
            staticFunctions: [
                createNormalizedFunction({
                    name: "some_long_function_name",
                    cIdentifier: "gtk_button_some_long_function_name",
                    returnType: createNormalizedType({ name: "none" }),
                }),
            ],
        });

        const structures = builder.buildStructures();

        expect(structures[0]?.name).toBe("someLongFunctionName");
    });
});

describe("StaticFunctionBuilder / buildStructures (3)", () => {
    it("includes parameters in structure", () => {
        const { builder } = createTestSetup({
            staticFunctions: [
                createNormalizedFunction({
                    name: "with_params",
                    cIdentifier: "gtk_button_with_params",
                    returnType: createNormalizedType({ name: "none" }),
                    parameters: [
                        createNormalizedParameter({
                            name: "label",
                            type: createNormalizedType({ name: "utf8" }),
                        }),
                        createNormalizedParameter({
                            name: "count",
                            type: createNormalizedType({ name: "gint" }),
                        }),
                    ],
                }),
            ],
        });

        const structures = builder.buildStructures();

        expect(structures[0]?.parameters).toHaveLength(2);
        expect(structures[0]?.parameters?.[0]?.name).toBe("label");
        expect(structures[0]?.parameters?.[1]?.name).toBe("count");
    });

    it("includes return type when not void", () => {
        const { builder } = createTestSetup({
            staticFunctions: [
                createNormalizedFunction({
                    name: "get_count",
                    cIdentifier: "gtk_button_get_count",
                    returnType: createNormalizedType({ name: "gint" }),
                }),
            ],
        });

        const structures = builder.buildStructures();

        expect(structures[0]?.returnType).toBe("number");
    });
});

describe("StaticFunctionBuilder / buildStructures (4)", () => {
    it("omits return type for void functions", () => {
        const { builder } = createTestSetup({
            staticFunctions: [
                createNormalizedFunction({
                    name: "do_something",
                    cIdentifier: "gtk_button_do_something",
                    returnType: createNormalizedType({ name: "none" }),
                }),
            ],
        });

        const structures = builder.buildStructures();

        expect(structures[0]?.returnType).toBeUndefined();
    });

    it("emits a stub for functions whose parameters are GLib.Closure (untyped, unsafe)", () => {
        const { builder } = createTestSetup({
            staticFunctions: [
                createNormalizedFunction({
                    name: "with_closure",
                    cIdentifier: "gtk_button_with_closure",
                    returnType: createNormalizedType({ name: "none" }),
                    parameters: [
                        createNormalizedParameter({
                            name: "callback",
                            type: createNormalizedType({ name: "GLib.Closure" }),
                        }),
                    ],
                }),
                createNormalizedFunction({
                    name: "normal",
                    cIdentifier: "gtk_button_normal",
                    returnType: createNormalizedType({ name: "none" }),
                }),
            ],
        });

        const structures = builder.buildStructures();

        expect(structures).toHaveLength(2);
        expect(structures.map((s) => s.name).sort()).toEqual(["normal", "withClosure"]);
    });
});

describe("StaticFunctionBuilder / buildStructures (5)", () => {
    it("uses normalized class name for return type mapping", () => {
        const { builder } = createTestSetup({
            name: "Button",
            staticFunctions: [
                createNormalizedFunction({
                    name: "new",
                    cIdentifier: "gtk_button_new",
                    returnType: createNormalizedType({ name: "Gtk.Button" }),
                }),
            ],
        });

        const structures = builder.buildStructures();

        expect(structures[0]?.returnType).toBe("Button");
    });
});

describe("StaticFunctionBuilder / context integration", () => {
    it("creates context and writers correctly during setup", () => {
        const { builder, ffiMapper } = createTestSetup({
            staticFunctions: [
                createNormalizedFunction({
                    name: "get_value",
                    cIdentifier: "gtk_button_get_value",
                    returnType: createNormalizedType({ name: "gint" }),
                }),
            ],
        });

        expect(builder).toBeDefined();
        expect(ffiMapper).toBeInstanceOf(FfiMapper);
    });
});
