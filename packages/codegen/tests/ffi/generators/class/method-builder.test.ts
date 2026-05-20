import { describe, expect, it } from "vitest";
import { MethodBuilder } from "../../../../src/ffi/generators/class/method-builder.js";
import { fundamentalSelfType, SELF_TYPE_GOBJECT } from "../../../../src/type-system/ffi-types.js";
import { setupGtkFfiContext } from "../../../fixtures/generator-fixtures.js";
import {
    createNormalizedMethod,
    type createNormalizedNamespace,
    createNormalizedParameter,
    createNormalizedType,
} from "../../../fixtures/gir-fixtures.js";

function createTestSetup(namespaces: Map<string, ReturnType<typeof createNormalizedNamespace>> = new Map()) {
    const { ffiMapper, file, options } = setupGtkFfiContext(namespaces);
    const methodRenames = new Map<string, string>();
    const builder = new MethodBuilder({ ffiMapper, imports: file, methodRenames, options });
    return { builder, ffiMapper, methodRenames };
}

describe("MethodBuilder / constructor", () => {
    it("creates builder with dependencies", () => {
        const { builder } = createTestSetup();
        expect(builder).toBeInstanceOf(MethodBuilder);
    });
});

describe("MethodBuilder / buildStructures (1)", () => {
    it("returns empty array when no methods", () => {
        const { builder } = createTestSetup();

        const structures = builder.buildStructures([], SELF_TYPE_GOBJECT);

        expect(structures).toHaveLength(0);
    });

    it("builds structure for single method", () => {
        const { builder } = createTestSetup();
        const methods = [
            createNormalizedMethod({
                name: "get_label",
                cIdentifier: "gtk_button_get_label",
                returnType: createNormalizedType({ name: "utf8" }),
            }),
        ];

        const structures = builder.buildStructures(methods, SELF_TYPE_GOBJECT);

        expect(structures).toHaveLength(1);
        expect(structures[0]?.name).toBe("getLabel");
    });
});

describe("MethodBuilder / buildStructures (2)", () => {
    it("builds structures for multiple methods", () => {
        const { builder } = createTestSetup();
        const methods = [
            createNormalizedMethod({
                name: "get_label",
                cIdentifier: "gtk_button_get_label",
                returnType: createNormalizedType({ name: "utf8" }),
            }),
            createNormalizedMethod({
                name: "set_label",
                cIdentifier: "gtk_button_set_label",
                returnType: createNormalizedType({ name: "none" }),
                parameters: [
                    createNormalizedParameter({
                        name: "label",
                        type: createNormalizedType({ name: "utf8" }),
                    }),
                ],
            }),
        ];

        const structures = builder.buildStructures(methods, SELF_TYPE_GOBJECT);

        expect(structures).toHaveLength(2);
        expect(structures[0]?.name).toBe("getLabel");
        expect(structures[1]?.name).toBe("setLabel");
    });

    it("converts method names to camelCase", () => {
        const { builder } = createTestSetup();
        const methods = [
            createNormalizedMethod({
                name: "get_some_long_property",
                cIdentifier: "gtk_button_get_some_long_property",
                returnType: createNormalizedType({ name: "gint" }),
            }),
        ];

        const structures = builder.buildStructures(methods, SELF_TYPE_GOBJECT);

        expect(structures[0]?.name).toBe("getSomeLongProperty");
    });
});

describe("MethodBuilder / buildStructures (3)", () => {
    it("includes parameters in method structure", () => {
        const { builder } = createTestSetup();
        const methods = [
            createNormalizedMethod({
                name: "set_values",
                cIdentifier: "gtk_button_set_values",
                returnType: createNormalizedType({ name: "none" }),
                parameters: [
                    createNormalizedParameter({
                        name: "x",
                        type: createNormalizedType({ name: "gint" }),
                    }),
                    createNormalizedParameter({
                        name: "y",
                        type: createNormalizedType({ name: "gint" }),
                    }),
                ],
            }),
        ];

        const structures = builder.buildStructures(methods, SELF_TYPE_GOBJECT);

        expect(structures[0]?.parameters).toHaveLength(2);
    });

    it("includes return type for non-void methods", () => {
        const { builder } = createTestSetup();
        const methods = [
            createNormalizedMethod({
                name: "get_count",
                cIdentifier: "gtk_button_get_count",
                returnType: createNormalizedType({ name: "gint" }),
            }),
        ];

        const structures = builder.buildStructures(methods, SELF_TYPE_GOBJECT);

        expect(structures[0]?.returnType).toBe("number");
    });
});

describe("MethodBuilder / buildStructures (4)", () => {
    it("omits return type for void methods", () => {
        const { builder } = createTestSetup();
        const methods = [
            createNormalizedMethod({
                name: "do_something",
                cIdentifier: "gtk_button_do_something",
                returnType: createNormalizedType({ name: "none" }),
            }),
        ];

        const structures = builder.buildStructures(methods, SELF_TYPE_GOBJECT);

        expect(structures[0]?.returnType).toBeUndefined();
    });
});

describe("MethodBuilder / method filtering", () => {
    it("filters out duplicate methods with same cIdentifier", () => {
        const { builder } = createTestSetup();
        const methods = [
            createNormalizedMethod({
                name: "get_value",
                cIdentifier: "gtk_button_get_value",
                returnType: createNormalizedType({ name: "gint" }),
            }),
            createNormalizedMethod({
                name: "get_value",
                cIdentifier: "gtk_button_get_value",
                returnType: createNormalizedType({ name: "gint" }),
            }),
        ];

        const structures = builder.buildStructures(methods, SELF_TYPE_GOBJECT);

        expect(structures).toHaveLength(1);
    });

    it("emits a stub for methods whose parameters are GLib.Closure (untyped, unsafe)", () => {
        const { builder } = createTestSetup();
        const methods = [
            createNormalizedMethod({
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
            createNormalizedMethod({
                name: "normal",
                cIdentifier: "gtk_button_normal",
                returnType: createNormalizedType({ name: "none" }),
            }),
        ];

        const structures = builder.buildStructures(methods, SELF_TYPE_GOBJECT);

        expect(structures).toHaveLength(2);
        expect(structures.map((s) => s.name).sort()).toEqual(["normal", "withClosure"]);
    });
});

describe("MethodBuilder / async methods (1)", () => {
    it("emits async and finish methods as plain methods without special handling", () => {
        const { builder } = createTestSetup();
        const methods = [
            createNormalizedMethod({
                name: "load_async",
                cIdentifier: "gtk_button_load_async",
                returnType: createNormalizedType({ name: "none" }),
                finishFunc: "load_finish",
            }),
            createNormalizedMethod({
                name: "load_finish",
                cIdentifier: "gtk_button_load_finish",
                returnType: createNormalizedType({ name: "utf8" }),
            }),
            createNormalizedMethod({
                name: "get_label",
                cIdentifier: "gtk_button_get_label",
                returnType: createNormalizedType({ name: "utf8" }),
            }),
        ];

        const structures = builder.buildStructures(methods, SELF_TYPE_GOBJECT);

        const names = structures.map((s) => s.name);
        expect(names).toContain("loadAsync");
        expect(names).toContain("loadFinish");
        expect(names).toContain("getLabel");
    });
});

describe("MethodBuilder / async methods (2)", () => {
    it("does not generate Promise wrappers for async pairs", () => {
        const { builder } = createTestSetup();
        const methods = [
            createNormalizedMethod({
                name: "save_async",
                cIdentifier: "gtk_button_save_async",
                returnType: createNormalizedType({ name: "none" }),
                finishFunc: "save_finish",
            }),
            createNormalizedMethod({
                name: "save_finish",
                cIdentifier: "gtk_button_save_finish",
                returnType: createNormalizedType({ name: "gboolean" }),
            }),
        ];

        const structures = builder.buildStructures(methods, SELF_TYPE_GOBJECT);

        for (const structure of structures) {
            expect(structure.returnType ?? "").not.toContain("Promise");
        }
    });
});

describe("MethodBuilder / hasUnsupportedCallbacks", () => {
    it("returns false when no callbacks", () => {
        const { builder } = createTestSetup();
        const parameters = [
            createNormalizedParameter({
                name: "value",
                type: createNormalizedType({ name: "gint" }),
            }),
        ];

        const result = builder.hasUnsupportedCallbacks(parameters);

        expect(result).toBe(false);
    });

    it("returns true for GLib.Closure (untyped variadic, unsafe)", () => {
        const { builder } = createTestSetup();
        const parameters = [
            createNormalizedParameter({
                name: "callback",
                type: createNormalizedType({ name: "GLib.Closure" }),
            }),
        ];

        const result = builder.hasUnsupportedCallbacks(parameters);

        expect(result).toBe(true);
    });

    it("returns true for raw pointer parameters (gpointer)", () => {
        const { builder } = createTestSetup();
        const parameters = [
            createNormalizedParameter({
                name: "data",
                type: createNormalizedType({ name: "gpointer" }),
            }),
        ];

        const result = builder.hasUnsupportedCallbacks(parameters);

        expect(result).toBe(true);
    });
});

describe("MethodBuilder / isParamSpec handling", () => {
    it("uses GObject self type for regular classes", () => {
        const { builder } = createTestSetup();
        const methods = [
            createNormalizedMethod({
                name: "get_value",
                cIdentifier: "gtk_button_get_value",
                returnType: createNormalizedType({ name: "gint" }),
            }),
        ];

        const structures = builder.buildStructures(methods, SELF_TYPE_GOBJECT);

        expect(structures).toHaveLength(1);
    });

    it("uses GParam self type for ParamSpec classes", () => {
        const { builder } = createTestSetup();
        const methods = [
            createNormalizedMethod({
                name: "get_value",
                cIdentifier: "g_param_spec_get_value",
                returnType: createNormalizedType({ name: "gint" }),
            }),
        ];

        const structures = builder.buildStructures(
            methods,
            fundamentalSelfType({
                library: "libgobject-2.0.so.0",
                refFn: "g_param_spec_ref",
                unrefFn: "g_param_spec_unref",
            }),
        );

        expect(structures).toHaveLength(1);
    });
});

describe("MethodBuilder / method renames", () => {
    it("uses dynamic rename from context when available", () => {
        const { builder, methodRenames } = createTestSetup();
        methodRenames.set("gtk_button_get_name", "getBuildableName");
        const methods = [
            createNormalizedMethod({
                name: "get_name",
                cIdentifier: "gtk_button_get_name",
                returnType: createNormalizedType({ name: "utf8" }),
            }),
        ];

        const structures = builder.buildStructures(methods, SELF_TYPE_GOBJECT);

        expect(structures[0]?.name).toBe("getBuildableName");
    });
});
