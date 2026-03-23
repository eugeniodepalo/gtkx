import { describe, expect, it } from "vitest";
import { GirRepository } from "../src/repository.js";

const createMinimalGir = (name: string, version: string, content: string) => `<?xml version="1.0"?>
<repository version="1.2" xmlns="http://www.gtk.org/introspection/core/1.0"
    xmlns:c="http://www.gtk.org/introspection/c/1.0"
    xmlns:glib="http://www.gtk.org/introspection/glib/1.0">
    <namespace name="${name}" version="${version}" shared-library="lib${name.toLowerCase()}.so"
        c:identifier-prefixes="${name}" c:symbol-prefixes="${name.toLowerCase()}">
        ${content}
    </namespace>
</repository>`;

describe("GirRepository", () => {
    describe("fromXml", () => {
        it("loads and parses XML content", () => {
            const repo = GirRepository.fromXml([createMinimalGir("Test", "1.0", "")]);
            expect(repo.getNamespaceNames()).toContain("Test");
        });

        it("can load multiple namespaces", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir("Gtk", "4.0", ""),
                createMinimalGir("GObject", "2.0", ""),
            ]);
            expect(repo.getNamespaceNames()).toContain("Gtk");
            expect(repo.getNamespaceNames()).toContain("GObject");
        });
    });

    describe("getNamespace", () => {
        it("returns namespace by name", () => {
            const repo = GirRepository.fromXml([createMinimalGir("Gtk", "4.0", "")]);
            const ns = repo.getNamespace("Gtk");
            expect(ns?.name).toBe("Gtk");
            expect(ns?.version).toBe("4.0");
        });

        it("returns null for unknown namespace", () => {
            const repo = GirRepository.fromXml([createMinimalGir("Gtk", "4.0", "")]);
            expect(repo.getNamespace("Unknown")).toBeNull();
        });
    });

    describe("resolveClass", () => {
        it("resolves class by qualified name", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir(
                    "Gtk",
                    "4.0",
                    `<class name="Widget" c:type="GtkWidget"
                        glib:type-name="GtkWidget" glib:get-type="gtk_widget_get_type"/>`,
                ),
            ]);
            const widget = repo.resolveClass("Gtk.Widget");
            expect(widget?.name).toBe("Widget");
            expect(widget?.qualifiedName).toBe("Gtk.Widget");
        });

        it("returns null for unknown class", () => {
            const repo = GirRepository.fromXml([createMinimalGir("Gtk", "4.0", "")]);
            expect(repo.resolveClass("Gtk.Unknown")).toBeNull();
        });
    });

    describe("resolveInterface", () => {
        it("resolves interface by qualified name", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir(
                    "Gtk",
                    "4.0",
                    `<interface name="Buildable" c:type="GtkBuildable" glib:type-name="GtkBuildable"/>`,
                ),
            ]);
            const buildable = repo.resolveInterface("Gtk.Buildable");
            expect(buildable?.name).toBe("Buildable");
        });
    });

    describe("resolveRecord", () => {
        it("resolves record by qualified name", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir(
                    "Gdk",
                    "4.0",
                    `<record name="Rectangle" c:type="GdkRectangle"
                        glib:type-name="GdkRectangle" glib:get-type="gdk_rectangle_get_type">
                        <field name="x" writable="1"><type name="gint"/></field>
                    </record>`,
                ),
            ]);
            const rect = repo.resolveRecord("Gdk.Rectangle");
            expect(rect?.name).toBe("Rectangle");
        });
    });

    describe("resolveEnum", () => {
        it("resolves enumeration by qualified name", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir(
                    "Gtk",
                    "4.0",
                    `<enumeration name="Orientation" c:type="GtkOrientation">
                        <member name="horizontal" value="0" c:identifier="GTK_ORIENTATION_HORIZONTAL"/>
                        <member name="vertical" value="1" c:identifier="GTK_ORIENTATION_VERTICAL"/>
                    </enumeration>`,
                ),
            ]);
            const orientation = repo.resolveEnum("Gtk.Orientation");
            expect(orientation?.name).toBe("Orientation");
            expect(orientation?.members.length).toBe(2);
        });
    });

    describe("resolveFlags", () => {
        it("resolves bitfield by qualified name", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir(
                    "Gdk",
                    "4.0",
                    `<bitfield name="ModifierType" c:type="GdkModifierType">
                        <member name="shift_mask" value="1" c:identifier="GDK_SHIFT_MASK"/>
                    </bitfield>`,
                ),
            ]);
            const modType = repo.resolveFlags("Gdk.ModifierType");
            expect(modType?.name).toBe("ModifierType");
        });
    });

    describe("resolveCallback", () => {
        it("resolves callback by qualified name", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir(
                    "Gio",
                    "2.0",
                    `<callback name="AsyncReadyCallback" c:type="GAsyncReadyCallback">
                        <return-value><type name="none"/></return-value>
                    </callback>`,
                ),
            ]);
            const callback = repo.resolveCallback("Gio.AsyncReadyCallback");
            expect(callback?.name).toBe("AsyncReadyCallback");
        });
    });

    describe("resolveConstant", () => {
        it("resolves constant by qualified name", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir(
                    "Gtk",
                    "4.0",
                    `<constant name="MAJOR_VERSION" value="4" c:type="GTK_MAJOR_VERSION">
                        <type name="gint"/>
                    </constant>`,
                ),
            ]);
            const constant = repo.resolveConstant("Gtk.MAJOR_VERSION");
            expect(constant?.name).toBe("MAJOR_VERSION");
            expect(constant?.value).toBe("4");
        });
    });

    describe("resolveFunction", () => {
        it("resolves function by qualified name", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir(
                    "Gtk",
                    "4.0",
                    `<function name="init" c:identifier="gtk_init">
                        <return-value><type name="none"/></return-value>
                    </function>`,
                ),
            ]);
            const init = repo.resolveFunction("Gtk.init");
            expect(init?.name).toBe("init");
            expect(init?.cIdentifier).toBe("gtk_init");
        });
    });

    describe("getTypeKind", () => {
        it("returns correct kind for each type", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir(
                    "Gtk",
                    "4.0",
                    `<class name="Widget" c:type="GtkWidget" glib:type-name="GtkWidget" glib:get-type="gtk_widget_get_type"/>
                    <interface name="Buildable" c:type="GtkBuildable" glib:type-name="GtkBuildable"/>
                    <enumeration name="Orientation" c:type="GtkOrientation">
                        <member name="horizontal" value="0" c:identifier="GTK_ORIENTATION_HORIZONTAL"/>
                    </enumeration>`,
                ),
                createMinimalGir(
                    "Gdk",
                    "4.0",
                    `<record name="Rectangle" c:type="GdkRectangle"/>
                    <bitfield name="ModifierType" c:type="GdkModifierType">
                        <member name="shift_mask" value="1" c:identifier="GDK_SHIFT_MASK"/>
                    </bitfield>`,
                ),
                createMinimalGir(
                    "Gio",
                    "2.0",
                    `<callback name="AsyncReadyCallback" c:type="GAsyncReadyCallback">
                        <return-value><type name="none"/></return-value>
                    </callback>`,
                ),
            ]);

            expect(repo.getTypeKind("Gtk.Widget")).toBe("class");
            expect(repo.getTypeKind("Gtk.Buildable")).toBe("interface");
            expect(repo.getTypeKind("Gdk.Rectangle")).toBe("record");
            expect(repo.getTypeKind("Gtk.Orientation")).toBe("enum");
            expect(repo.getTypeKind("Gdk.ModifierType")).toBe("flags");
            expect(repo.getTypeKind("Gio.AsyncReadyCallback")).toBe("callback");
        });

        it("returns null for intrinsic types", () => {
            const repo = GirRepository.fromXml([createMinimalGir("Gtk", "4.0", "")]);
            expect(repo.getTypeKind("gint")).toBeNull();
            expect(repo.getTypeKind("utf8")).toBeNull();
        });

        it("returns null for unknown types", () => {
            const repo = GirRepository.fromXml([createMinimalGir("Gtk", "4.0", "")]);
            expect(repo.getTypeKind("Gtk.Unknown")).toBeNull();
        });
    });

    describe("isPrimitive", () => {
        it("returns true for intrinsic types", () => {
            const repo = GirRepository.fromXml([createMinimalGir("Gtk", "4.0", "")]);
            expect(repo.isPrimitive("gint")).toBe(true);
            expect(repo.isPrimitive("utf8")).toBe(true);
            expect(repo.isPrimitive("gboolean")).toBe(true);
        });

        it("returns false for non-primitive types", () => {
            const repo = GirRepository.fromXml([createMinimalGir("Gtk", "4.0", "")]);
            expect(repo.isPrimitive("GtkWidget")).toBe(false);
        });
    });

    describe("isGObject", () => {
        it("returns true for class with GType", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir(
                    "Gtk",
                    "4.0",
                    `<class name="Widget" c:type="GtkWidget"
                        glib:type-name="GtkWidget" glib:get-type="gtk_widget_get_type"/>`,
                ),
            ]);
            expect(repo.isGObject("Gtk.Widget")).toBe(true);
        });

        it("returns false for class without GType", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir("Test", "1.0", `<class name="Simple" c:type="TestSimple"/>`),
            ]);
            expect(repo.isGObject("Test.Simple")).toBe(false);
        });
    });

    describe("isBoxed", () => {
        it("returns true for record with GType", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir(
                    "Gdk",
                    "4.0",
                    `<record name="Rectangle" c:type="GdkRectangle"
                        glib:type-name="GdkRectangle" glib:get-type="gdk_rectangle_get_type"/>`,
                ),
            ]);
            expect(repo.isBoxed("Gdk.Rectangle")).toBe(true);
        });

        it("returns false for record without GType", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir("Test", "1.0", `<record name="Data" c:type="TestData"/>`),
            ]);
            expect(repo.isBoxed("Test.Data")).toBe(false);
        });
    });

    describe("findClasses", () => {
        it("finds classes matching predicate", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir(
                    "Gtk",
                    "4.0",
                    `<class name="Widget" c:type="GtkWidget" abstract="1"
                        glib:type-name="GtkWidget" glib:get-type="gtk_widget_get_type"/>
                    <class name="Button" c:type="GtkButton"
                        glib:type-name="GtkButton" glib:get-type="gtk_button_get_type"/>`,
                ),
            ]);
            const abstractClasses = repo.findClasses((cls) => cls.abstract);
            expect(abstractClasses.length).toBe(1);
            expect(abstractClasses[0]?.name).toBe("Widget");
        });

        it("returns empty array when no matches", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir("Gtk", "4.0", `<class name="Button" c:type="GtkButton"/>`),
            ]);
            const matches = repo.findClasses((cls) => cls.name === "Unknown");
            expect(matches).toEqual([]);
        });
    });

    describe("findInterfaces", () => {
        it("finds interfaces matching predicate", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir(
                    "Gtk",
                    "4.0",
                    `<interface name="Buildable" c:type="GtkBuildable" glib:type-name="GtkBuildable"/>
                    <interface name="Accessible" c:type="GtkAccessible" glib:type-name="GtkAccessible"/>`,
                ),
            ]);
            const interfaces = repo.findInterfaces((iface) => iface.name.startsWith("Build"));
            expect(interfaces.length).toBe(1);
            expect(interfaces[0]?.name).toBe("Buildable");
        });
    });

    describe("findRecords", () => {
        it("finds records matching predicate", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir(
                    "Gdk",
                    "4.0",
                    `<record name="Rectangle" c:type="GdkRectangle"
                        glib:type-name="GdkRectangle" glib:get-type="gdk_rectangle_get_type"/>
                    <record name="Point" c:type="GdkPoint"/>`,
                ),
            ]);
            const boxedRecords = repo.findRecords((rec) => rec.isBoxed());
            expect(boxedRecords.length).toBe(1);
            expect(boxedRecords[0]?.name).toBe("Rectangle");
        });
    });

    describe("getAllNamespaces", () => {
        it("returns all namespaces as map", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir("Gtk", "4.0", ""),
                createMinimalGir("GObject", "2.0", ""),
            ]);
            const all = repo.getAllNamespaces();
            expect(all.size).toBe(2);
            expect(all.has("Gtk")).toBe(true);
            expect(all.has("GObject")).toBe(true);
        });
    });

    describe("class traversal", () => {
        it("resolves inheritance chain", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir(
                    "GObject",
                    "2.0",
                    `<class name="Object" c:type="GObject" glib:type-name="GObject" glib:get-type="g_object_get_type"/>`,
                ),
                createMinimalGir(
                    "Gtk",
                    "4.0",
                    `<class name="Widget" c:type="GtkWidget" parent="GObject.Object"
                        glib:type-name="GtkWidget" glib:get-type="gtk_widget_get_type"/>
                    <class name="Button" c:type="GtkButton" parent="Widget"
                        glib:type-name="GtkButton" glib:get-type="gtk_button_get_type"/>`,
                ),
            ]);

            const button = repo.resolveClass("Gtk.Button");
            expect(button?.isSubclassOf("Gtk.Widget")).toBe(true);
            expect(button?.isSubclassOf("GObject.Object")).toBe(true);
            expect(button?.getInheritanceChain()).toEqual(["Gtk.Button", "Gtk.Widget", "GObject.Object"]);
        });

        it("resolves parent class", () => {
            const repo = GirRepository.fromXml([
                createMinimalGir(
                    "GObject",
                    "2.0",
                    `<class name="Object" c:type="GObject" glib:type-name="GObject" glib:get-type="g_object_get_type"/>`,
                ),
                createMinimalGir(
                    "Gtk",
                    "4.0",
                    `<class name="Widget" c:type="GtkWidget" parent="GObject.Object"
                        glib:type-name="GtkWidget" glib:get-type="gtk_widget_get_type"/>`,
                ),
            ]);

            const widget = repo.resolveClass("Gtk.Widget");
            const parent = widget?.getParent();
            expect(parent?.name).toBe("Object");
            expect(parent?.qualifiedName).toBe("GObject.Object");
        });
    });
});
