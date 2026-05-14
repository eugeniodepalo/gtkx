import { describe, expect, it } from "vitest";
import { FfiGenerator } from "../../src/ffi/ffi-generator.js";
import type { GirNamespace, GirRepository } from "../../src/gir/index.js";
import {
    createButtonClass,
    createNormalizedClass,
    createNormalizedConstant,
    createNormalizedEnumeration,
    createNormalizedField,
    createNormalizedFunction,
    createNormalizedInterface,
    createNormalizedMethod,
    createNormalizedNamespace,
    createNormalizedRecord,
    createNormalizedType,
    createWidgetClass,
} from "../fixtures/gir-fixtures.js";
import { createMockRepository } from "../fixtures/mock-repository.js";

const baseNamespaces = (overrides: Partial<Record<string, GirNamespace>> = {}): Map<string, GirNamespace> => {
    const map = new Map<string, GirNamespace>();
    map.set("GLib", createNormalizedNamespace({ name: "GLib", sharedLibrary: "libglib-2.0.so.0" }));
    map.set("GObject", createNormalizedNamespace({ name: "GObject", sharedLibrary: "libgobject-2.0.so.0" }));
    for (const [name, ns] of Object.entries(overrides)) {
        if (ns) map.set(name, ns);
    }
    return map;
};

const namespaceFile = (
    files: Array<{ path: string; content: string }>,
    namespace: string,
): { path: string; content: string } | undefined => {
    const lower = namespace.toLowerCase();
    return files.find((f) => f.path === `${lower}/${lower}.js`);
};

describe("FfiGenerator constructor", () => {
    it("constructs with the supplied repository and namespace", () => {
        const repo = createMockRepository(baseNamespaces());
        const generator = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        });
        expect(generator).toBeInstanceOf(FfiGenerator);
    });
});

describe("FfiGenerator.generateNamespace", () => {
    it("throws when the target namespace is missing from the repository", () => {
        const repo = createMockRepository(baseNamespaces());
        const generator = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        });
        expect(() => generator.generateNamespace("Gtk")).toThrow(/not found/);
    });

    it("throws when GLib has no shared library configured", () => {
        const namespaces = new Map<string, GirNamespace>();
        namespaces.set(
            "GLib",
            createNormalizedNamespace({ name: "GLib", sharedLibrary: undefined as unknown as string }),
        );
        namespaces.set("GObject", createNormalizedNamespace({ name: "GObject" }));
        namespaces.set("Gtk", createNormalizedNamespace({ name: "Gtk" }));
        const repo = createMockRepository(namespaces);

        const generator = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        });

        expect(() => generator.generateNamespace("Gtk")).toThrow(/No shared library/);
    });

    it("throws when the namespace shared library string starts with a leading comma", () => {
        const namespaces = baseNamespaces();
        namespaces.set("GLib", createNormalizedNamespace({ name: "GLib", sharedLibrary: ",libglib-2.0.so.0" }));
        namespaces.set("Gtk", createNormalizedNamespace({ name: "Gtk" }));
        const repo = createMockRepository(namespaces);

        const generator = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        });

        expect(() => generator.generateNamespace("Gtk")).toThrow(/Invalid shared library/);
    });

    it("emits a single namespace file containing enum declarations", () => {
        const enumeration = createNormalizedEnumeration({ qualifiedName: "Gtk.Orientation" });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            enumerations: new Map([[enumeration.name, enumeration]]),
        });
        const repo = createMockRepository(baseNamespaces({ Gtk: ns }));

        const { files } = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        }).generateNamespace("Gtk");

        expect(files).toHaveLength(1);
        const file = namespaceFile(files, "Gtk");
        expect(file?.path).toBe("gtk/gtk.js");
        expect(file?.content).toContain("export const Orientation");
    });

    it("merges bitfields with enumerations into the same namespace file", () => {
        const enumeration = createNormalizedEnumeration({ qualifiedName: "Gtk.Orientation" });
        const flags = createNormalizedEnumeration({
            qualifiedName: "Gtk.DebugFlags",
            name: "DebugFlags",
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            enumerations: new Map([[enumeration.name, enumeration]]),
            bitfields: new Map([[flags.name, flags]]),
        });
        const repo = createMockRepository(baseNamespaces({ Gtk: ns }));

        const { files } = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        }).generateNamespace("Gtk");

        const file = namespaceFile(files, "Gtk");
        expect(file?.content).toContain("export const Orientation");
        expect(file?.content).toContain("export const DebugFlags");
    });

    it("emits standalone functions into the namespace file", () => {
        const ns = createNormalizedNamespace({
            name: "Gtk",
            functions: new Map([["init", createNormalizedFunction({ name: "init" })]]),
        });
        const repo = createMockRepository(baseNamespaces({ Gtk: ns }));

        const { files } = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        }).generateNamespace("Gtk");

        const file = namespaceFile(files, "Gtk");
        expect(file?.content).toContain("export const init");
    });

    it("emits constants into the namespace file", () => {
        const ns = createNormalizedNamespace({
            name: "Gtk",
            constants: new Map([["MAJOR_VERSION", createNormalizedConstant({ qualifiedName: "Gtk.MAJOR_VERSION" })]]),
        });
        const repo = createMockRepository(baseNamespaces({ Gtk: ns }));

        const { files } = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        }).generateNamespace("Gtk");

        const file = namespaceFile(files, "Gtk");
        expect(file?.content).toContain("export const MAJOR_VERSION");
    });

    it("emits a single namespace file with no body when there is nothing to declare", () => {
        const ns = createNormalizedNamespace({ name: "Gtk" });
        const repo = createMockRepository(baseNamespaces({ Gtk: ns }));

        const { files } = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        }).generateNamespace("Gtk");

        const file = namespaceFile(files, "Gtk");
        expect(file?.path).toBe("gtk/gtk.js");
        expect(file?.content).toBe("");
    });

    it("emits each class once into the namespace file", () => {
        const widget = createWidgetClass();
        const button = createButtonClass();
        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([
                [button.name, button],
                [widget.name, widget],
            ]),
        });
        const repo = createMockRepository(baseNamespaces({ Gtk: ns }));

        const { files } = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        }).generateNamespace("Gtk");

        const file = namespaceFile(files, "Gtk");
        expect(file?.content).toContain("export class Widget");
        expect(file?.content).toContain("export class Button");
    });

    it("emits interfaces by name into the namespace file", () => {
        const orientable = createNormalizedInterface({ name: "Orientable" });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            interfaces: new Map([[orientable.name, orientable]]),
        });
        const repo = createMockRepository(baseNamespaces({ Gtk: ns }));

        const { files } = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        }).generateNamespace("Gtk");

        const file = namespaceFile(files, "Gtk");
        expect(file?.content).toContain("export class Orientable");
    });

    it("emits Private-suffixed records that have marshalable public fields", () => {
        const privateRec = createNormalizedRecord({
            name: "WidgetPrivate",
            qualifiedName: "Gtk.WidgetPrivate",
            cType: "GtkWidgetPrivate",
            fields: [createNormalizedField({ name: "value", type: createNormalizedType({ name: "gint" }) })],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            records: new Map([[privateRec.name, privateRec]]),
        });
        const repo = createMockRepository(baseNamespaces({ Gtk: ns }));

        const { files } = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        }).generateNamespace("Gtk");

        const file = namespaceFile(files, "Gtk");
        expect(file?.content).toContain("export class WidgetPrivate");
    });

    it("routes records that end with Class through the class-struct generator", () => {
        const klass = createNormalizedRecord({
            name: "WidgetClass",
            qualifiedName: "Gtk.WidgetClass",
            fields: [createNormalizedField({ name: "padding", type: createNormalizedType({ name: "gint" }) })],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            records: new Map([[klass.name, klass]]),
        });
        const repo = createMockRepository(baseNamespaces({ Gtk: ns }));

        const { files } = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        }).generateNamespace("Gtk");

        const file = namespaceFile(files, "Gtk");
        expect(file?.content).toContain("export const WidgetClass");
    });

    it("routes records that end with Iface through the class-struct generator", () => {
        const iface = createNormalizedRecord({
            name: "OrientableIface",
            qualifiedName: "Gtk.OrientableIface",
            fields: [createNormalizedField({ name: "padding", type: createNormalizedType({ name: "gint" }) })],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            records: new Map([[iface.name, iface]]),
        });
        const repo = createMockRepository(baseNamespaces({ Gtk: ns }));

        const { files } = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        }).generateNamespace("Gtk");

        const file = namespaceFile(files, "Gtk");
        expect(file?.content).toContain("export const OrientableIface");
    });

    it("emits a full binding for opaque records that carry a glib type name", () => {
        const opaqueRecord = createNormalizedRecord({
            name: "Bytes",
            qualifiedName: "GLib.Bytes",
            opaque: true,
            glibTypeName: "GBytes",
            glibGetType: "g_bytes_get_type",
        });
        const ns = createNormalizedNamespace({
            name: "GLib",
            sharedLibrary: "libglib-2.0.so.0",
            records: new Map([[opaqueRecord.name, opaqueRecord]]),
        });
        const repo = createMockRepository(
            baseNamespaces({
                GLib: ns,
                Gtk: createNormalizedNamespace({ name: "Gtk" }),
            }),
        );

        const { files } = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "GLib",
        }).generateNamespace("GLib");

        const file = namespaceFile(files, "GLib");
        expect(file?.content).toContain("export class Bytes");
    });

    it("walks nested record fields when deciding whether to fully generate a record", () => {
        const inner = createNormalizedRecord({
            name: "Inner",
            qualifiedName: "Gtk.Inner",
            cType: "GtkInner",
            fields: [createNormalizedField({ name: "value", type: createNormalizedType({ name: "gint" }) })],
        });
        const outer = createNormalizedRecord({
            name: "Outer",
            qualifiedName: "Gtk.Outer",
            cType: "GtkOuter",
            fields: [createNormalizedField({ name: "inner", type: createNormalizedType({ name: "Inner" }) })],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            records: new Map([
                [outer.name, outer],
                [inner.name, inner],
            ]),
        });
        const repo = createMockRepository(baseNamespaces({ Gtk: ns }));

        const { files } = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        }).generateNamespace("Gtk");

        const file = namespaceFile(files, "Gtk");
        expect(file?.content).toContain("export class Outer");
        expect(file?.content).toContain("export class Inner");
    });

    it("emits stub classes for records whose fields recurse to an unmarshalable type", () => {
        const inner = createNormalizedRecord({
            name: "Inner",
            qualifiedName: "Gtk.Inner",
            cType: "GtkInner",
            disguised: true,
        });
        const outer = createNormalizedRecord({
            name: "Outer",
            qualifiedName: "Gtk.Outer",
            cType: "GtkOuter",
            fields: [createNormalizedField({ name: "inner", type: createNormalizedType({ name: "Inner" }) })],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            records: new Map([
                [outer.name, outer],
                [inner.name, inner],
            ]),
        });
        const repo = createMockRepository(baseNamespaces({ Gtk: ns }));

        const { files } = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        }).generateNamespace("Gtk");

        const file = namespaceFile(files, "Gtk");
        expect(file?.content).toContain("export class Outer");
        expect(file?.content).toContain("export class Inner");
    });

    it("emits methods on opaque boxed records that expose safe instance methods", () => {
        const opaqueRecord = createNormalizedRecord({
            name: "Bytes",
            qualifiedName: "GLib.Bytes",
            opaque: true,
            glibTypeName: "GBytes",
            glibGetType: "g_bytes_get_type",
            cType: "GBytes",
            methods: [
                createNormalizedMethod({
                    name: "get_size",
                    cIdentifier: "g_bytes_get_size",
                    returnType: createNormalizedType({ name: "gsize" }),
                }),
            ],
        });
        const ns = createNormalizedNamespace({
            name: "GLib",
            sharedLibrary: "libglib-2.0.so.0",
            records: new Map([[opaqueRecord.name, opaqueRecord]]),
        });
        const repo = createMockRepository(
            baseNamespaces({
                GLib: ns,
                Gtk: createNormalizedNamespace({ name: "Gtk" }),
            }),
        );

        const { files } = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "GLib",
        }).generateNamespace("GLib");

        const file = namespaceFile(files, "GLib");
        expect(file?.content).toContain("getSize");
    });

    it("generates records that have only primitive fields", () => {
        const record = createNormalizedRecord({
            name: "Rectangle",
            qualifiedName: "Gdk.Rectangle",
            fields: [
                createNormalizedField({ name: "x", type: createNormalizedType({ name: "gint" }) }),
                createNormalizedField({ name: "y", type: createNormalizedType({ name: "gint" }) }),
                createNormalizedField({ name: "width", type: createNormalizedType({ name: "gint" }) }),
                createNormalizedField({ name: "height", type: createNormalizedType({ name: "gint" }) }),
            ],
        });
        const ns = createNormalizedNamespace({
            name: "Gdk",
            sharedLibrary: "libgdk-4.so.1",
            records: new Map([[record.name, record]]),
        });
        const repo = createMockRepository(
            baseNamespaces({
                Gdk: ns,
            }),
        );

        const { files } = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gdk",
        }).generateNamespace("Gdk");

        const file = namespaceFile(files, "Gdk");
        expect(file?.content).toContain("export class Rectangle");
    });

    it("routes opaque core type-class records through the class-struct generator as stubs", () => {
        const typeClass = createNormalizedRecord({
            name: "TypeClass",
            qualifiedName: "GObject.TypeClass",
            opaque: true,
        });
        const ns = createNormalizedNamespace({
            name: "GObject",
            sharedLibrary: "libgobject-2.0.so.0",
            records: new Map([[typeClass.name, typeClass]]),
        });
        const repo = createMockRepository(
            baseNamespaces({
                GObject: ns,
            }),
        );

        const { files } = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "GObject",
        }).generateNamespace("GObject");

        const file = namespaceFile(files, "GObject");
        expect(file?.content).toContain("export const TypeClass");
    });

    it("topologically sorts classes so a parent declaration precedes its children", () => {
        const widget = createWidgetClass();
        const button = createButtonClass();
        const grandchild = createNormalizedClass({
            name: "Toggle",
            qualifiedName: "Gtk.Toggle",
            cType: "GtkToggle",
            parent: "Gtk.Button",
            glibTypeName: "GtkToggle",
            glibGetType: "gtk_toggle_get_type",
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([
                [grandchild.name, grandchild],
                [button.name, button],
                [widget.name, widget],
            ]),
        });
        const repo = createMockRepository(baseNamespaces({ Gtk: ns }));

        const { files } = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        }).generateNamespace("Gtk");

        const file = namespaceFile(files, "Gtk");
        const content = file?.content ?? "";
        const widgetIdx = content.indexOf("export class Widget ");
        const buttonIdx = content.indexOf("export class Button ");
        const toggleIdx = content.indexOf("export class Toggle ");
        expect(widgetIdx).toBeGreaterThanOrEqual(0);
        expect(buttonIdx).toBeGreaterThan(widgetIdx);
        expect(toggleIdx).toBeGreaterThan(buttonIdx);
    });

    it("produces the same file list across repeat invocations on the same generator", () => {
        const widget = createWidgetClass();
        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([[widget.name, widget]]),
        });
        const repo = createMockRepository(baseNamespaces({ Gtk: ns }));

        const generator = new FfiGenerator({
            repository: repo as unknown as GirRepository,
            namespace: "Gtk",
        });
        const first = generator
            .generateNamespace("Gtk")
            .files.map((f) => f.path)
            .sort();
        const second = generator
            .generateNamespace("Gtk")
            .files.map((f) => f.path)
            .sort();

        expect(second).toEqual(first);
    });
});
