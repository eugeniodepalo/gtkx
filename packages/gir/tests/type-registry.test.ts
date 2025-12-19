import { describe, expect, it } from "vitest";
import type { GirNamespace } from "../src/index.js";
import { TypeRegistry } from "../src/index.js";

describe("TypeRegistry", () => {
    it("registers and resolves class types", () => {
        const registry = new TypeRegistry();
        registry.registerNativeClass("Gtk", "Widget");

        const result = registry.resolve("Gtk.Widget");

        expect(result).toBeDefined();
        expect(result?.kind).toBe("class");
        expect(result?.name).toBe("Widget");
        expect(result?.namespace).toBe("Gtk");
        expect(result?.transformedName).toBe("Widget");
    });

    it("registers and resolves interface types", () => {
        const registry = new TypeRegistry();
        registry.registerInterface("Gtk", "Buildable");

        const result = registry.resolve("Gtk.Buildable");

        expect(result).toBeDefined();
        expect(result?.kind).toBe("interface");
        expect(result?.name).toBe("Buildable");
        expect(result?.namespace).toBe("Gtk");
        expect(result?.transformedName).toBe("Buildable");
    });

    it("registers and resolves enum types", () => {
        const registry = new TypeRegistry();
        registry.registerEnum("Gtk", "Orientation");

        const result = registry.resolve("Gtk.Orientation");

        expect(result).toBeDefined();
        expect(result?.kind).toBe("enum");
        expect(result?.name).toBe("Orientation");
        expect(result?.namespace).toBe("Gtk");
        expect(result?.transformedName).toBe("Orientation");
    });

    it("registers and resolves record types", () => {
        const registry = new TypeRegistry();
        registry.registerRecord("Gdk", "Rectangle", "GdkRectangle");

        const result = registry.resolve("Gdk.Rectangle");

        expect(result).toBeDefined();
        expect(result?.kind).toBe("record");
        expect(result?.name).toBe("Rectangle");
        expect(result?.namespace).toBe("Gdk");
        expect(result?.transformedName).toBe("Rectangle");
        expect(result?.glibTypeName).toBe("GdkRectangle");
    });

    it("registers and resolves callback types", () => {
        const registry = new TypeRegistry();
        registry.registerCallback("Gio", "AsyncReadyCallback");

        const result = registry.resolve("Gio.AsyncReadyCallback");

        expect(result).toBeDefined();
        expect(result?.kind).toBe("callback");
        expect(result?.name).toBe("AsyncReadyCallback");
        expect(result?.namespace).toBe("Gio");
        expect(result?.transformedName).toBe("AsyncReadyCallback");
    });

    it("returns undefined for unregistered types", () => {
        const registry = new TypeRegistry();

        const result = registry.resolve("Gtk.NonExistent");

        expect(result).toBeUndefined();
    });

    describe("type name normalization", () => {
        it("renames Error to GError", () => {
            const registry = new TypeRegistry();
            registry.registerNativeClass("GLib", "Error");

            const result = registry.resolve("GLib.Error");

            expect(result?.transformedName).toBe("GError");
        });

        it("prefixes Object in GObject namespace", () => {
            const registry = new TypeRegistry();
            registry.registerNativeClass("GObject", "Object");

            const result = registry.resolve("GObject.Object");

            expect(result?.transformedName).toBe("GObject");
        });

        it("prefixes Object in other namespaces with namespace name", () => {
            const registry = new TypeRegistry();
            registry.registerNativeClass("Pango", "Object");

            const result = registry.resolve("Pango.Object");

            expect(result?.transformedName).toBe("PangoObject");
        });

        it("converts snake_case names to PascalCase", () => {
            const registry = new TypeRegistry();
            registry.registerNativeClass("Gtk", "text_view");

            const result = registry.resolve("Gtk.text_view");

            expect(result?.transformedName).toBe("TextView");
        });
    });

    describe("resolveInNamespace", () => {
        it("resolves qualified names directly", () => {
            const registry = new TypeRegistry();
            registry.registerNativeClass("Gtk", "Widget");

            const result = registry.resolveInNamespace("Gtk.Widget", "Gdk");

            expect(result).toBeDefined();
            expect(result?.name).toBe("Widget");
        });

        it("resolves unqualified names in current namespace first", () => {
            const registry = new TypeRegistry();
            registry.registerNativeClass("Gtk", "Button");
            registry.registerNativeClass("Custom", "Button");

            const result = registry.resolveInNamespace("Button", "Gtk");

            expect(result).toBeDefined();
            expect(result?.namespace).toBe("Gtk");
        });

        it("searches all namespaces if not in current namespace", () => {
            const registry = new TypeRegistry();
            registry.registerNativeClass("Gtk", "Widget");

            const result = registry.resolveInNamespace("Widget", "Gdk");

            expect(result).toBeDefined();
            expect(result?.namespace).toBe("Gtk");
        });

        it("matches by transformed name", () => {
            const registry = new TypeRegistry();
            registry.registerNativeClass("Gtk", "text_view");

            const result = registry.resolveInNamespace("TextView", "Gdk");

            expect(result).toBeDefined();
            expect(result?.name).toBe("text_view");
            expect(result?.transformedName).toBe("TextView");
        });

        it("returns undefined if not found anywhere", () => {
            const registry = new TypeRegistry();
            registry.registerNativeClass("Gtk", "Widget");

            const result = registry.resolveInNamespace("NonExistent", "Gtk");

            expect(result).toBeUndefined();
        });
    });

    describe("fromNamespaces", () => {
        it("creates registry from namespace array", () => {
            const namespaces: GirNamespace[] = [
                {
                    name: "Gtk",
                    version: "4.0",
                    sharedLibrary: "libgtk-4.so",
                    cPrefix: "Gtk",
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
                    interfaces: [
                        {
                            name: "Buildable",
                            cType: "GtkBuildable",
                            methods: [],
                            properties: [],
                            signals: [],
                        },
                    ],
                    enumerations: [
                        {
                            name: "Orientation",
                            cType: "GtkOrientation",
                            members: [],
                        },
                    ],
                    bitfields: [
                        {
                            name: "StateFlags",
                            cType: "GtkStateFlags",
                            members: [],
                        },
                    ],
                    records: [
                        {
                            name: "Rectangle",
                            cType: "GtkRectangle",
                            glibTypeName: "GtkRectangle",
                            fields: [],
                            methods: [],
                            constructors: [],
                            functions: [],
                        },
                    ],
                    callbacks: [
                        {
                            name: "TickCallback",
                            cType: "GtkTickCallback",
                            returnType: { name: "gboolean" },
                            parameters: [],
                        },
                    ],
                    functions: [],
                    constants: [],
                },
            ];

            const registry = TypeRegistry.fromNamespaces(namespaces);

            expect(registry.resolve("Gtk.Widget")).toBeDefined();
            expect(registry.resolve("Gtk.Widget")?.kind).toBe("class");

            expect(registry.resolve("Gtk.Buildable")).toBeDefined();
            expect(registry.resolve("Gtk.Buildable")?.kind).toBe("interface");

            expect(registry.resolve("Gtk.Orientation")).toBeDefined();
            expect(registry.resolve("Gtk.Orientation")?.kind).toBe("enum");

            expect(registry.resolve("Gtk.StateFlags")).toBeDefined();
            expect(registry.resolve("Gtk.StateFlags")?.kind).toBe("enum");

            expect(registry.resolve("Gtk.Rectangle")).toBeDefined();
            expect(registry.resolve("Gtk.Rectangle")?.kind).toBe("record");
            expect(registry.resolve("Gtk.Rectangle")?.glibTypeName).toBe("GtkRectangle");

            expect(registry.resolve("Gtk.TickCallback")).toBeDefined();
            expect(registry.resolve("Gtk.TickCallback")?.kind).toBe("callback");
        });

        it("skips disguised records", () => {
            const namespaces: GirNamespace[] = [
                {
                    name: "Gtk",
                    version: "4.0",
                    sharedLibrary: "",
                    cPrefix: "",
                    classes: [],
                    interfaces: [],
                    enumerations: [],
                    bitfields: [],
                    records: [
                        {
                            name: "PrivateStruct",
                            cType: "GtkPrivateStruct",
                            glibTypeName: "GtkPrivateStruct",
                            disguised: true,
                            fields: [],
                            methods: [],
                            constructors: [],
                            functions: [],
                        },
                    ],
                    callbacks: [],
                    functions: [],
                    constants: [],
                },
            ];

            const registry = TypeRegistry.fromNamespaces(namespaces);

            expect(registry.resolve("Gtk.PrivateStruct")).toBeUndefined();
        });

        it("skips records without glibTypeName", () => {
            const namespaces: GirNamespace[] = [
                {
                    name: "Gtk",
                    version: "4.0",
                    sharedLibrary: "",
                    cPrefix: "",
                    classes: [],
                    interfaces: [],
                    enumerations: [],
                    bitfields: [],
                    records: [
                        {
                            name: "InternalStruct",
                            cType: "GtkInternalStruct",
                            fields: [],
                            methods: [],
                            constructors: [],
                            functions: [],
                        },
                    ],
                    callbacks: [],
                    functions: [],
                    constants: [],
                },
            ];

            const registry = TypeRegistry.fromNamespaces(namespaces);

            expect(registry.resolve("Gtk.InternalStruct")).toBeUndefined();
        });

        it("handles multiple namespaces", () => {
            const namespaces: GirNamespace[] = [
                {
                    name: "Gtk",
                    version: "4.0",
                    sharedLibrary: "",
                    cPrefix: "",
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
                    interfaces: [],
                    enumerations: [],
                    bitfields: [],
                    records: [],
                    callbacks: [],
                    functions: [],
                    constants: [],
                },
                {
                    name: "Gdk",
                    version: "4.0",
                    sharedLibrary: "",
                    cPrefix: "",
                    classes: [
                        {
                            name: "Display",
                            cType: "GdkDisplay",
                            implements: [],
                            methods: [],
                            constructors: [],
                            functions: [],
                            properties: [],
                            signals: [],
                        },
                    ],
                    interfaces: [],
                    enumerations: [],
                    bitfields: [],
                    records: [],
                    callbacks: [],
                    functions: [],
                    constants: [],
                },
            ];

            const registry = TypeRegistry.fromNamespaces(namespaces);

            expect(registry.resolve("Gtk.Widget")).toBeDefined();
            expect(registry.resolve("Gdk.Display")).toBeDefined();
        });
    });
});
