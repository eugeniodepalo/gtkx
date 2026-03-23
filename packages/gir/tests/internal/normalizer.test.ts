import { describe, expect, it } from "vitest";
import { GirNormalizer } from "../../src/internal/normalizer.js";
import type { RawNamespace } from "../../src/internal/raw-types.js";

const createRawNamespace = (overrides: Partial<RawNamespace> = {}): RawNamespace => ({
    name: "Test",
    version: "1.0",
    sharedLibrary: "libtest.so",
    cPrefix: "Test",
    classes: [],
    interfaces: [],
    records: [],
    enumerations: [],
    bitfields: [],
    callbacks: [],
    functions: [],
    constants: [],
    aliases: [],
    doc: undefined,
    ...overrides,
});

describe("GirNormalizer", () => {
    it("preserves namespace metadata", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "Gtk",
            version: "4.0",
            sharedLibrary: "libgtk-4.so.1",
            cPrefix: "Gtk",
        });
        const result = normalizer.normalize(new Map([["Gtk", raw]]));
        const ns = result.get("Gtk");

        expect(ns?.name).toBe("Gtk");
        expect(ns?.version).toBe("4.0");
        expect(ns?.sharedLibrary).toBe("libgtk-4.so.1");
        expect(ns?.cPrefix).toBe("Gtk");
    });

    it("qualifies class names", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "Gtk",
            classes: [
                {
                    name: "Widget",
                    cType: "GtkWidget",
                    implements: [],
                    methods: [],
                    constructors: [],
                    functions: [],
                    properties: [],
                    signals: [],
                },
            ],
        });
        const result = normalizer.normalize(new Map([["Gtk", raw]]));
        const cls = result.get("Gtk")?.classes.get("Widget");

        expect(cls?.qualifiedName).toBe("Gtk.Widget");
    });

    it("qualifies cross-namespace type references", () => {
        const normalizer = new GirNormalizer();
        const gobjectRaw = createRawNamespace({
            name: "GObject",
            classes: [
                {
                    name: "Object",
                    cType: "GObject",
                    implements: [],
                    methods: [],
                    constructors: [],
                    functions: [],
                    properties: [],
                    signals: [],
                },
            ],
        });
        const gtkRaw = createRawNamespace({
            name: "Gtk",
            classes: [
                {
                    name: "Widget",
                    cType: "GtkWidget",
                    parent: "GObject.Object",
                    implements: [],
                    methods: [],
                    constructors: [],
                    functions: [],
                    properties: [],
                    signals: [],
                },
            ],
        });

        const namespaces = new Map([
            ["GObject", gobjectRaw],
            ["Gtk", gtkRaw],
        ]);
        const result = normalizer.normalize(namespaces);
        const widget = result.get("Gtk")?.classes.get("Widget");

        expect(widget?.parent).toBe("GObject.Object");
    });

    it("qualifies unqualified type names from current namespace", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "Gtk",
            classes: [
                {
                    name: "Widget",
                    cType: "GtkWidget",
                    implements: [],
                    methods: [],
                    constructors: [],
                    functions: [],
                    properties: [],
                    signals: [],
                },
                {
                    name: "Button",
                    cType: "GtkButton",
                    parent: "Widget",
                    implements: [],
                    methods: [],
                    constructors: [],
                    functions: [],
                    properties: [],
                    signals: [],
                },
            ],
        });

        const result = normalizer.normalize(new Map([["Gtk", raw]]));
        const button = result.get("Gtk")?.classes.get("Button");

        expect(button?.parent).toBe("Gtk.Widget");
    });

    it("qualifies unresolvable types with current namespace", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "Test",
            classes: [
                {
                    name: "Foo",
                    cType: "TestFoo",
                    implements: [],
                    methods: [
                        {
                            name: "get_bar",
                            cIdentifier: "test_foo_get_bar",
                            returnType: { name: "NonExistentType" },
                            parameters: [],
                        },
                    ],
                    constructors: [],
                    functions: [],
                    properties: [],
                    signals: [],
                },
            ],
        });

        const result = normalizer.normalize(new Map([["Test", raw]]));
        const method = result.get("Test")?.classes.get("Foo")?.methods[0];
        expect(method?.returnType.name).toBe("Test.NonExistentType");
    });

    it("leaves intrinsic types unqualified", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "Test",
            functions: [
                {
                    name: "get_value",
                    cIdentifier: "test_get_value",
                    returnType: { name: "gint" },
                    parameters: [
                        {
                            name: "name",
                            type: { name: "utf8" },
                        },
                    ],
                },
            ],
        });

        const result = normalizer.normalize(new Map([["Test", raw]]));
        const func = result.get("Test")?.functions.get("get_value");

        expect(func?.returnType.name).toBe("gint");
        expect(func?.parameters[0]?.type.name).toBe("utf8");
    });
});
