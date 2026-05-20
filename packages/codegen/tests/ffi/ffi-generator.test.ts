import { describe, expect, it } from "vitest";
import { FfiGenerator } from "../../src/ffi/ffi-generator.js";
import type { GirNamespace, GirRepository } from "../../src/gir/index.js";
import {
    createButtonClass,
    createNormalizedCallback,
    createNormalizedClass,
    createNormalizedConstant,
    createNormalizedEnumeration,
    createNormalizedField,
    createNormalizedFunction,
    createNormalizedInterface,
    createNormalizedMethod,
    createNormalizedNamespace,
    createNormalizedParameter,
    createNormalizedRecord,
    createNormalizedType,
    createWidgetClass,
    qualifiedName,
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

const generateNamespaceFor = (
    ns: GirNamespace,
    namespace = "Gtk",
): { files: Array<{ path: string; content: string }>; file: { path: string; content: string } | undefined } => {
    const repo = createMockRepository(baseNamespaces({ [namespace]: ns }));
    const { files } = new FfiGenerator({
        repository: repo as unknown as GirRepository,
        namespace,
    }).generateNamespace(namespace);
    return { files, file: namespaceFile(files, namespace) };
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

describe("FfiGenerator.generateNamespace (1)", () => {
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
});

describe("FfiGenerator.generateNamespace (2)", () => {
    it("emits a single namespace file containing enum declarations", () => {
        const enumeration = createNormalizedEnumeration({ qualifiedName: "Gtk.Orientation" });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            enumerations: new Map([[enumeration.name, enumeration]]),
        });
        const { files, file } = generateNamespaceFor(ns);

        expect(files).toHaveLength(1);
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
        const { file } = generateNamespaceFor(ns);
        expect(file?.content).toContain("export const Orientation");
        expect(file?.content).toContain("export const DebugFlags");
    });
});

describe("FfiGenerator.generateNamespace (3)", () => {
    it("emits standalone functions into the namespace file", () => {
        const ns = createNormalizedNamespace({
            name: "Gtk",
            functions: new Map([["init", createNormalizedFunction({ name: "init" })]]),
        });
        const { file } = generateNamespaceFor(ns);
        expect(file?.content).toContain("export const init");
    });

    it("emits constants into the namespace file", () => {
        const ns = createNormalizedNamespace({
            name: "Gtk",
            constants: new Map([["MAJOR_VERSION", createNormalizedConstant({ qualifiedName: "Gtk.MAJOR_VERSION" })]]),
        });
        const { file } = generateNamespaceFor(ns);
        expect(file?.content).toContain("export const MAJOR_VERSION");
    });

    it("emits only the gobject augmentation side-effect imports when there is nothing to declare", () => {
        const ns = createNormalizedNamespace({ name: "Pango", sharedLibrary: "libpango-1.0.so.0" });
        const { file } = generateNamespaceFor(ns, "Pango");

        expect(file?.path).toBe("pango/pango.js");
        expect(file?.content).toBe('import "../../gobject/object.js";\nimport "../../gobject/value.js";\n\n');
    });
});

describe("FfiGenerator.generateNamespace (4)", () => {
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
        const { file } = generateNamespaceFor(ns);
        expect(file?.content).toContain("export class Widget");
        expect(file?.content).toContain("export class Button");
    });

    it("emits interfaces by name into the namespace file", () => {
        const orientable = createNormalizedInterface({ name: "Orientable" });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            interfaces: new Map([[orientable.name, orientable]]),
        });
        const { file } = generateNamespaceFor(ns);
        expect(file?.content).toContain("export class Orientable");
    });
});

describe("FfiGenerator.generateNamespace (5)", () => {
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
        const { file } = generateNamespaceFor(ns);
        expect(file?.content).toContain("export class WidgetPrivate");
    });
});

describe("FfiGenerator.generateNamespace (6)", () => {
    it("routes records that end with Class through the class-struct generator", () => {
        const klass = createNormalizedRecord({
            name: "WidgetClass",
            qualifiedName: "Gtk.WidgetClass",
            fields: [
                createNormalizedField({
                    name: "finalize",
                    type: createNormalizedType({ name: "gpointer", cType: "gpointer" }),
                    callback: createNormalizedCallback({
                        name: "finalize",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [],
                    }),
                }),
            ],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            records: new Map([[klass.name, klass]]),
        });
        const { file } = generateNamespaceFor(ns);
        expect(file?.content).toContain("const WidgetClass");
    });
});

describe("FfiGenerator.generateNamespace (7)", () => {
    it("routes records that end with Iface through the class-struct generator", () => {
        const iface = createNormalizedRecord({
            name: "OrientableIface",
            qualifiedName: "Gtk.OrientableIface",
            fields: [
                createNormalizedField({
                    name: "activate",
                    type: createNormalizedType({ name: "gpointer", cType: "gpointer" }),
                    callback: createNormalizedCallback({
                        name: "activate",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [],
                    }),
                }),
            ],
        });
        const ns = createNormalizedNamespace({
            name: "Gtk",
            records: new Map([[iface.name, iface]]),
        });
        const { file } = generateNamespaceFor(ns);
        expect(file?.content).toContain("const OrientableIface");
    });
});

describe("FfiGenerator.generateNamespace (8)", () => {
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
        const { file } = generateNamespaceFor(ns, "GLib");
        expect(file?.content).toContain("export class Bytes");
    });
});

describe("FfiGenerator.generateNamespace (9)", () => {
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
        const { file } = generateNamespaceFor(ns);
        expect(file?.content).toContain("export class Outer");
        expect(file?.content).toContain("export class Inner");
    });
});

describe("FfiGenerator.generateNamespace (10)", () => {
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
        const { file } = generateNamespaceFor(ns);
        expect(file?.content).toContain("export class Outer");
        expect(file?.content).toContain("export class Inner");
    });
});

describe("FfiGenerator.generateNamespace (11)", () => {
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
        const { file } = generateNamespaceFor(ns, "GLib");
        expect(file?.content).toContain("getSize");
    });
});

describe("FfiGenerator.generateNamespace (12)", () => {
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
        const { file } = generateNamespaceFor(ns, "Gdk");
        expect(file?.content).toContain("export class Rectangle");
    });
});

describe("FfiGenerator.generateNamespace (13)", () => {
    it("emits no class-struct registry for opaque core type-class records without vfuncs", () => {
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
        const { file } = generateNamespaceFor(ns, "GObject");
        expect(file?.content).not.toContain("const TypeClass");
    });
});

describe("FfiGenerator.generateNamespace (14)", () => {
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
        const { file } = generateNamespaceFor(ns);
        const content = file?.content ?? "";
        const widgetIdx = content.indexOf("export class Widget ");
        const buttonIdx = content.indexOf("export class Button ");
        const toggleIdx = content.indexOf("export class Toggle ");
        expect(widgetIdx).toBeGreaterThanOrEqual(0);
        expect(buttonIdx).toBeGreaterThan(widgetIdx);
        expect(toggleIdx).toBeGreaterThan(buttonIdx);
    });
});

describe("FfiGenerator.generateNamespace (15)", () => {
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

const asyncCallbackParameter = (closure = 2) =>
    createNormalizedParameter({
        name: "callback",
        type: createNormalizedType({ name: "Gio.AsyncReadyCallback", nullable: true }),
        scope: "async",
        closure,
        nullable: true,
    });

const buildGioNamespace = (className: string): GirNamespace => {
    const classType = () => createNormalizedType({ name: qualifiedName("Gio", className) });
    const asyncReadyCallback = createNormalizedCallback({
        name: "AsyncReadyCallback",
        qualifiedName: "Gio.AsyncReadyCallback",
        parameters: [
            createNormalizedParameter({
                name: "source_object",
                type: createNormalizedType({ name: qualifiedName("Gio", className), nullable: true }),
                nullable: true,
            }),
            createNormalizedParameter({ name: "res", type: classType() }),
        ],
    });
    const cls = createNormalizedClass({
        name: className,
        qualifiedName: qualifiedName("Gio", className),
        parent: null,
        methods: [
            createNormalizedMethod({
                name: "read_async",
                cIdentifier: "g_input_stream_read_async",
                finishFunc: "read_finish",
                returnType: createNormalizedType({ name: "none" }),
                parameters: [
                    createNormalizedParameter({
                        name: "io_priority",
                        type: createNormalizedType({ name: "gint" }),
                    }),
                    asyncCallbackParameter(),
                    createNormalizedParameter({
                        name: "user_data",
                        type: createNormalizedType({ name: "gpointer" }),
                    }),
                ],
            }),
            createNormalizedMethod({
                name: "read_finish",
                cIdentifier: "g_input_stream_read_finish",
                returnType: createNormalizedType({ name: "gboolean" }),
                parameters: [createNormalizedParameter({ name: "res", type: classType() })],
            }),
        ],
    });
    return createNormalizedNamespace({
        name: "Gio",
        sharedLibrary: "libgio-2.0.so.0",
        classes: new Map([[cls.name, cls]]),
        callbacks: new Map([[asyncReadyCallback.name, asyncReadyCallback]]),
    });
};

describe("FfiGenerator async wrappers", () => {
    it("emits a promisify-delegating wrapper for an async method", () => {
        const { file } = generateNamespaceFor(buildGioNamespace("InputStream"), "Gio");
        const content = file?.content ?? "";

        expect(content).toContain("readAsync(ioPriority) {");
        expect(content).toContain(
            "return promisify(g_input_stream_read_async, this.readFinish.bind(this), undefined, { leading: [getHandle(this), ioPriority] });",
        );
        expect(content).toMatch(/import \{[^}]*\bpromisify\b[^}]*\} from "\.\.\/\.\.\/runtime\.js";/);
        expect(content).not.toContain("new Promise");
        expect(content).not.toMatch(/readAsync\([^)]*callback[^)]*\)/);
    });

    it("keeps the companion finish method on the class", () => {
        const { file } = generateNamespaceFor(buildGioNamespace("InputStream"), "Gio");
        const content = file?.content ?? "";
        expect(content).toContain("readFinish(res) {");
        expect(content).toContain("g_input_stream_read_finish(");
    });
});

const buildCancellableReadAsyncMethod = () =>
    createNormalizedMethod({
        name: "read_async",
        cIdentifier: "g_input_stream_read_async",
        finishFunc: "read_finish",
        returnType: createNormalizedType({ name: "none" }),
        parameters: [
            createNormalizedParameter({
                name: "io_priority",
                type: createNormalizedType({ name: "gint" }),
            }),
            createNormalizedParameter({
                name: "cancellable",
                type: createNormalizedType({ name: "Gio.Cancellable", nullable: true }),
                nullable: true,
            }),
            asyncCallbackParameter(3),
            createNormalizedParameter({
                name: "user_data",
                type: createNormalizedType({ name: "gpointer" }),
            }),
        ],
    });

const buildCancellableGioNamespace = (): GirNamespace => {
    const classType = () => createNormalizedType({ name: "Gio.InputStream" });
    const asyncReadyCallback = createNormalizedCallback({
        name: "AsyncReadyCallback",
        qualifiedName: "Gio.AsyncReadyCallback",
        parameters: [
            createNormalizedParameter({
                name: "source_object",
                type: createNormalizedType({ name: "Gio.InputStream", nullable: true }),
                nullable: true,
            }),
            createNormalizedParameter({ name: "res", type: classType() }),
        ],
    });
    const cancellable = createNormalizedClass({
        name: "Cancellable",
        qualifiedName: "Gio.Cancellable",
        parent: null,
        methods: [],
    });
    const cls = createNormalizedClass({
        name: "InputStream",
        qualifiedName: "Gio.InputStream",
        parent: null,
        methods: [
            buildCancellableReadAsyncMethod(),
            createNormalizedMethod({
                name: "read_finish",
                cIdentifier: "g_input_stream_read_finish",
                returnType: createNormalizedType({ name: "gboolean" }),
                parameters: [createNormalizedParameter({ name: "res", type: classType() })],
            }),
        ],
    });
    return createNormalizedNamespace({
        name: "Gio",
        sharedLibrary: "libgio-2.0.so.0",
        classes: new Map([
            [cls.name, cls],
            [cancellable.name, cancellable],
        ]),
        callbacks: new Map([[asyncReadyCallback.name, asyncReadyCallback]]),
    });
};

describe("FfiGenerator async wrappers cancellable", () => {
    it("passes the cancellable as its own promisify argument", () => {
        const { file } = generateNamespaceFor(buildCancellableGioNamespace(), "Gio");
        const content = file?.content ?? "";

        expect(content).toContain("readAsync(ioPriority, cancellable) {");
        expect(content).toContain(
            "return promisify(g_input_stream_read_async, this.readFinish.bind(this), cancellable, { leading: [getHandle(this), ioPriority] });",
        );
    });
});
