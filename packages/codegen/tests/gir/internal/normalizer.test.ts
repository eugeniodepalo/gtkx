import { describe, expect, it } from "vitest";
import { GirNormalizer } from "../../../src/gir/internal/normalizer.js";
import type { RawNamespace } from "../../../src/gir/internal/raw-types.js";

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

describe("GirNormalizer (1)", () => {
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
                    fieldNames: [],
                    fields: [],
                    virtualMethodNames: [],
                },
            ],
        });
        const result = normalizer.normalize(new Map([["Gtk", raw]]));
        const cls = result.get("Gtk")?.classes.get("Widget");

        expect(cls?.qualifiedName).toBe("Gtk.Widget");
    });
});

describe("GirNormalizer (2)", () => {
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
                    fieldNames: [],
                    fields: [],
                    virtualMethodNames: [],
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
                    fieldNames: [],
                    fields: [],
                    virtualMethodNames: [],
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
});

describe("GirNormalizer (3)", () => {
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
                    fieldNames: [],
                    fields: [],
                    virtualMethodNames: [],
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
                    fieldNames: [],
                    fields: [],
                    virtualMethodNames: [],
                },
            ],
        });

        const result = normalizer.normalize(new Map([["Gtk", raw]]));
        const button = result.get("Gtk")?.classes.get("Button");

        expect(button?.parent).toBe("Gtk.Widget");
    });
});

describe("GirNormalizer (4)", () => {
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
                    fieldNames: [],
                    fields: [],
                    virtualMethodNames: [],
                },
            ],
        });

        const result = normalizer.normalize(new Map([["Test", raw]]));
        const method = result.get("Test")?.classes.get("Foo")?.methods[0];
        expect(method?.returnType.name).toBe("Test.NonExistentType");
    });
});

describe("GirNormalizer (5)", () => {
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

describe("GirNormalizer (6)", () => {
    it("normalizes ghashtable container types with a key and value parameter", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "GLib",
            functions: [
                {
                    name: "get_table",
                    cIdentifier: "g_get_table",
                    returnType: {
                        name: "HashTable",
                        containerType: "ghashtable",
                        typeParameters: [{ name: "utf8" }, { name: "gint" }],
                    },
                    parameters: [],
                },
            ],
        });

        const returnType = normalizer
            .normalize(new Map([["GLib", raw]]))
            .get("GLib")
            ?.functions.get("get_table")?.returnType;

        expect(returnType?.name).toBe("GLib.HashTable");
        expect(returnType?.containerType).toBe("ghashtable");
        expect(returnType?.getKeyType()?.name).toBe("utf8");
        expect(returnType?.getValueType()?.name).toBe("gint");
        expect(returnType?.elementType?.name).toBe("gint");
    });
});

describe("GirNormalizer (7)", () => {
    it("normalizes ghashtable container types without type parameters", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "GLib",
            functions: [
                {
                    name: "get_bare",
                    cIdentifier: "g_get_bare",
                    returnType: { name: "HashTable", containerType: "ghashtable" },
                    parameters: [],
                },
            ],
        });

        const returnType = normalizer
            .normalize(new Map([["GLib", raw]]))
            .get("GLib")
            ?.functions.get("get_bare")?.returnType;

        expect(returnType?.name).toBe("GLib.HashTable");
        expect(returnType?.elementType).toBeNull();
    });
});

describe("GirNormalizer (8)", () => {
    it("normalizes gptrarray and garray container types", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "GLib",
            functions: [
                {
                    name: "ptr",
                    cIdentifier: "g_ptr",
                    returnType: {
                        name: "PtrArray",
                        containerType: "gptrarray",
                        typeParameters: [{ name: "utf8" }],
                    },
                    parameters: [],
                },
                {
                    name: "arr",
                    cIdentifier: "g_arr",
                    returnType: { name: "Array", containerType: "garray", typeParameters: [{ name: "gint" }] },
                    parameters: [],
                },
            ],
        });

        const result = normalizer.normalize(new Map([["GLib", raw]])).get("GLib");
        const ptr = result?.functions.get("ptr")?.returnType;
        const arr = result?.functions.get("arr")?.returnType;

        expect(ptr?.name).toBe("GLib.PtrArray");
        expect(ptr?.isArray).toBe(true);
        expect(ptr?.elementType?.name).toBe("utf8");
        expect(arr?.name).toBe("GLib.Array");
        expect(arr?.elementType?.name).toBe("gint");
    });
});

describe("GirNormalizer (9)", () => {
    it("normalizes gbytearray container types with and without an element type", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "GLib",
            functions: [
                {
                    name: "bytes",
                    cIdentifier: "g_bytes",
                    returnType: { name: "ByteArray", containerType: "gbytearray", elementType: { name: "guint8" } },
                    parameters: [],
                },
                {
                    name: "bare_bytes",
                    cIdentifier: "g_bare_bytes",
                    returnType: { name: "ByteArray", containerType: "gbytearray" },
                    parameters: [],
                },
            ],
        });

        const result = normalizer.normalize(new Map([["GLib", raw]])).get("GLib");
        const bytes = result?.functions.get("bytes")?.returnType;
        const bare = result?.functions.get("bare_bytes")?.returnType;

        expect(bytes?.name).toBe("GLib.ByteArray");
        expect(bytes?.elementType?.name).toBe("guint8");
        expect(bare?.elementType).toBeNull();
    });
});

describe("GirNormalizer (10)", () => {
    it("normalizes glist and gslist container types as arrays", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "GLib",
            functions: [
                {
                    name: "list",
                    cIdentifier: "g_list",
                    returnType: { name: "List", containerType: "glist", elementType: { name: "utf8" } },
                    parameters: [],
                },
                {
                    name: "slist",
                    cIdentifier: "g_slist",
                    returnType: { name: "SList", containerType: "gslist" },
                    parameters: [],
                },
            ],
        });

        const result = normalizer.normalize(new Map([["GLib", raw]])).get("GLib");
        const list = result?.functions.get("list")?.returnType;
        const slist = result?.functions.get("slist")?.returnType;

        expect(list?.name).toBe("array");
        expect(list?.isArray).toBe(true);
        expect(list?.elementType?.name).toBe("utf8");
        expect(list?.typeParameters).toHaveLength(1);
        expect(slist?.name).toBe("array");
        expect(slist?.elementType).toBeNull();
        expect(slist?.typeParameters).toHaveLength(0);
    });
});

describe("GirNormalizer (11)", () => {
    it("normalizes array types flagged by isArray or named array", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "Test",
            functions: [
                {
                    name: "flagged",
                    cIdentifier: "test_flagged",
                    returnType: { name: "gint", isArray: true, elementType: { name: "gint" } },
                    parameters: [],
                },
                {
                    name: "named",
                    cIdentifier: "test_named",
                    returnType: { name: "array" },
                    parameters: [],
                },
            ],
        });

        const result = normalizer.normalize(new Map([["Test", raw]])).get("Test");
        const flagged = result?.functions.get("flagged")?.returnType;
        const named = result?.functions.get("named")?.returnType;

        expect(flagged?.name).toBe("array");
        expect(flagged?.isArray).toBe(true);
        expect(flagged?.elementType?.name).toBe("gint");
        expect(named?.name).toBe("array");
        expect(named?.elementType).toBeNull();
    });
});

const ORIENTABLE_INTERFACE_NAMESPACE = createRawNamespace({
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
            fieldNames: [],
            fields: [],
            virtualMethodNames: [],
        },
    ],
    interfaces: [
        {
            name: "Orientable",
            cType: "GtkOrientable",
            glibTypeName: "GtkOrientable",
            glibGetType: "gtk_orientable_get_type",
            prerequisites: ["Widget"],
            methods: [
                {
                    name: "get_orientation",
                    cIdentifier: "gtk_orientable_get_orientation",
                    returnType: { name: "gint" },
                    parameters: [],
                },
            ],
            functions: [
                {
                    name: "list",
                    cIdentifier: "gtk_orientable_list",
                    returnType: { name: "none" },
                    parameters: [],
                },
            ],
            properties: [{ name: "orientation", type: { name: "gint" } }],
            signals: [{ name: "changed" }],
            fieldNames: ["padding"],
            virtualMethodNames: ["set_orientation"],
            doc: "An orientable interface.",
        },
    ],
});

describe("GirNormalizer (12)", () => {
    it("normalizes interfaces with prerequisites, methods, properties and signals", () => {
        const normalizer = new GirNormalizer();
        const iface = normalizer
            .normalize(new Map([["Gtk", ORIENTABLE_INTERFACE_NAMESPACE]]))
            .get("Gtk")
            ?.interfaces.get("Orientable");

        expect(iface?.qualifiedName).toBe("Gtk.Orientable");
        expect(iface?.prerequisites).toEqual(["Gtk.Widget"]);
        expect(iface?.methods[0]?.name).toBe("get_orientation");
        expect(iface?.staticFunctions[0]?.name).toBe("list");
        expect(iface?.properties[0]?.name).toBe("orientation");
        expect(iface?.signals[0]?.name).toBe("changed");
        expect(iface?.fieldNames).toEqual(["padding"]);
        expect(iface?.virtualMethodNames).toEqual(["set_orientation"]);
        expect(iface?.doc).toBe("An orientable interface.");
    });
});

describe("GirNormalizer (13)", () => {
    it("normalizes records with fields, methods and constructors", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "Gdk",
            records: [
                {
                    name: "Rectangle",
                    cType: "GdkRectangle",
                    opaque: false,
                    disguised: false,
                    isUnion: false,
                    glibTypeName: "GdkRectangle",
                    glibGetType: "gdk_rectangle_get_type",
                    copyFunction: "gdk_rectangle_copy",
                    freeFunction: "gdk_rectangle_free",
                    fields: [{ name: "x", type: { name: "gint" } }],
                    methods: [
                        {
                            name: "intersect",
                            cIdentifier: "gdk_rectangle_intersect",
                            returnType: { name: "gboolean" },
                            parameters: [],
                        },
                    ],
                    constructors: [
                        {
                            name: "new",
                            cIdentifier: "gdk_rectangle_new",
                            returnType: { name: "Rectangle" },
                            parameters: [],
                        },
                    ],
                    functions: [
                        {
                            name: "zero",
                            cIdentifier: "gdk_rectangle_zero",
                            returnType: { name: "Rectangle" },
                            parameters: [],
                        },
                    ],
                },
            ],
        });

        const record = normalizer
            .normalize(new Map([["Gdk", raw]]))
            .get("Gdk")
            ?.records.get("Rectangle");

        expect(record?.qualifiedName).toBe("Gdk.Rectangle");
        expect(record?.fields[0]?.name).toBe("x");
        expect(record?.methods[0]?.name).toBe("intersect");
        expect(record?.constructors[0]?.name).toBe("new");
        expect(record?.staticFunctions[0]?.name).toBe("zero");
    });
});

describe("GirNormalizer (14)", () => {
    it("normalizes enumerations and bitfields with members", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "Gtk",
            enumerations: [
                {
                    name: "Orientation",
                    cType: "GtkOrientation",
                    glibGetType: "gtk_orientation_get_type",
                    glibErrorDomain: "gtk-orientation-error",
                    members: [
                        {
                            name: "horizontal",
                            value: "0",
                            cIdentifier: "GTK_ORIENTATION_HORIZONTAL",
                            doc: "Horizontal.",
                        },
                    ],
                    doc: "Orientation enum.",
                },
            ],
            bitfields: [
                {
                    name: "StateFlags",
                    cType: "GtkStateFlags",
                    members: [{ name: "active", value: "1", cIdentifier: "GTK_STATE_FLAG_ACTIVE" }],
                },
            ],
        });

        const result = normalizer.normalize(new Map([["Gtk", raw]])).get("Gtk");
        const enumeration = result?.enumerations.get("Orientation");
        const flags = result?.bitfields.get("StateFlags");

        expect(enumeration?.qualifiedName).toBe("Gtk.Orientation");
        expect(enumeration?.members[0]?.name).toBe("horizontal");
        expect(enumeration?.members[0]?.doc).toBe("Horizontal.");
        expect(enumeration?.glibErrorDomain).toBe("gtk-orientation-error");
        expect(flags?.members[0]?.cIdentifier).toBe("GTK_STATE_FLAG_ACTIVE");
    });
});

describe("GirNormalizer (15)", () => {
    it("normalizes callbacks with return types and parameters", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "Gio",
            callbacks: [
                {
                    name: "AsyncReadyCallback",
                    cType: "GAsyncReadyCallback",
                    returnType: { name: "none" },
                    parameters: [{ name: "res", type: { name: "gint" } }],
                    introspectable: true,
                    doc: "Async callback.",
                },
            ],
        });

        const callback = normalizer
            .normalize(new Map([["Gio", raw]]))
            .get("Gio")
            ?.callbacks.get("AsyncReadyCallback");

        expect(callback?.qualifiedName).toBe("Gio.AsyncReadyCallback");
        expect(callback?.returnType.name).toBe("none");
        expect(callback?.parameters[0]?.name).toBe("res");
        expect(callback?.introspectable).toBe(true);
    });
});

describe("GirNormalizer (16)", () => {
    it("normalizes constants and aliases", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "Gtk",
            constants: [
                {
                    name: "MAJOR_VERSION",
                    cType: "gint",
                    value: "4",
                    type: { name: "gint" },
                    doc: "Major version.",
                },
            ],
            aliases: [
                {
                    name: "Allocation",
                    cType: "GtkAllocation",
                    targetType: { name: "Rectangle" },
                    doc: "Allocation alias.",
                },
            ],
        });

        const result = normalizer.normalize(new Map([["Gtk", raw]])).get("Gtk");
        const constant = result?.constants.get("MAJOR_VERSION");
        const alias = result?.aliases.get("Allocation");

        expect(constant?.qualifiedName).toBe("Gtk.MAJOR_VERSION");
        expect(constant?.value).toBe("4");
        expect(constant?.type.name).toBe("gint");
        expect(alias?.qualifiedName).toBe("Gtk.Allocation");
        expect(alias?.targetType.name).toBe("Gtk.Rectangle");
    });
});

describe("GirNormalizer (17)", () => {
    it("resolves a shadowed method to its shadowing name", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "Gtk",
            classes: [
                {
                    name: "Widget",
                    cType: "GtkWidget",
                    implements: [],
                    methods: [
                        {
                            name: "set_property_internal",
                            shadows: "set_property",
                            shadowedBy: undefined,
                            cIdentifier: "gtk_widget_set_property_internal",
                            returnType: { name: "none" },
                            parameters: [],
                        },
                    ],
                    constructors: [],
                    functions: [],
                    properties: [],
                    signals: [],
                    fieldNames: [],
                    fields: [],
                    virtualMethodNames: [],
                },
            ],
        });

        const method = normalizer
            .normalize(new Map([["Gtk", raw]]))
            .get("Gtk")
            ?.classes.get("Widget")?.methods[0];

        expect(method?.name).toBe("set_property");
        expect(method?.shadows).toBe("set_property");
    });
});

const BUTTON_CLASS_NAMESPACE = createRawNamespace({
    name: "Gtk",
    classes: [
        {
            name: "Button",
            cType: "GtkButton",
            parent: undefined,
            abstract: true,
            glibTypeName: "GtkButton",
            glibGetType: "gtk_button_get_type",
            cSymbolPrefix: "button",
            fundamental: true,
            refFunc: "gtk_button_ref",
            unrefFunc: "gtk_button_unref",
            implements: [],
            methods: [
                {
                    name: "clicked",
                    cIdentifier: "gtk_button_clicked",
                    returnType: { name: "none" },
                    parameters: [
                        {
                            name: "extra",
                            type: { name: "gint" },
                            direction: "inout",
                            callerAllocates: true,
                            nullable: true,
                            optional: true,
                            transferOwnership: "full",
                        },
                    ],
                    instanceParameter: { name: "self", type: { name: "Button" } },
                    throws: true,
                },
            ],
            constructors: [
                {
                    name: "new",
                    cIdentifier: "gtk_button_new",
                    returnType: { name: "Button" },
                    parameters: [],
                    throws: false,
                },
            ],
            functions: [],
            properties: [
                {
                    name: "label",
                    type: { name: "utf8" },
                    readable: false,
                    writable: true,
                    constructOnly: true,
                    defaultValueRaw: "hello",
                    getter: "get_label",
                    setter: "set_label",
                },
            ],
            signals: [
                {
                    name: "activate",
                    when: "first",
                    returnType: { name: "gboolean" },
                    parameters: [{ name: "detail", type: { name: "utf8" } }],
                },
            ],
            fieldNames: ["parent"],
            fields: [{ name: "parent", type: { name: "gint" } }],
            virtualMethodNames: ["do_clicked"],
        },
    ],
});

describe("GirNormalizer (18)", () => {
    it("normalizes class methods with an instance parameter, constructors and signals with return types", () => {
        const normalizer = new GirNormalizer();
        const cls = normalizer
            .normalize(new Map([["Gtk", BUTTON_CLASS_NAMESPACE]]))
            .get("Gtk")
            ?.classes.get("Button");

        expect(cls?.abstract).toBe(true);
        expect(cls?.fundamental).toBe(true);
        expect(cls?.parent).toBeNull();
        const method = cls?.methods[0];
        expect(method?.instanceParameter?.name).toBe("self");
        expect(method?.throws).toBe(true);
        expect(method?.parameters[0]?.direction).toBe("inout");
        expect(method?.parameters[0]?.callerAllocates).toBe(true);
        expect(cls?.constructors[0]?.name).toBe("new");
        expect(cls?.properties[0]?.readable).toBe(false);
        expect(cls?.properties[0]?.constructOnly).toBe(true);
        expect(cls?.signals[0]?.returnType?.name).toBe("gboolean");
        expect(cls?.signals[0]?.parameters[0]?.name).toBe("detail");
        expect(cls?.fields[0]?.name).toBe("parent");
    });
});

describe("GirNormalizer (19)", () => {
    it("drops a class parent reference that does not resolve to a qualified name", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "Test",
            classes: [
                {
                    name: "Foo",
                    cType: "TestFoo",
                    parent: "gint",
                    implements: [],
                    methods: [],
                    constructors: [],
                    functions: [],
                    properties: [],
                    signals: [],
                    fieldNames: [],
                    fields: [],
                    virtualMethodNames: [],
                },
            ],
        });

        const cls = normalizer
            .normalize(new Map([["Test", raw]]))
            .get("Test")
            ?.classes.get("Foo");

        expect(cls?.parent).toBeNull();
    });
});

describe("GirNormalizer (20)", () => {
    it("normalizes fields carrying an inline callback and an inline composite", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "Gtk",
            records: [
                {
                    name: "WidgetClass",
                    cType: "GtkWidgetClass",
                    fields: [
                        {
                            name: "finalize",
                            type: { name: "gpointer" },
                            callback: {
                                name: "",
                                cType: "GtkFinalizeFunc",
                                returnType: { name: "none" },
                                parameters: [{ name: "self", type: { name: "gpointer" } }],
                            },
                        },
                        {
                            name: "padding",
                            type: { name: "gpointer" },
                            inlineComposite: {
                                isUnion: true,
                                fields: [{ name: "reserved", type: { name: "gint" } }],
                            },
                        },
                    ],
                    methods: [],
                    constructors: [],
                    functions: [],
                },
            ],
        });

        const record = normalizer
            .normalize(new Map([["Gtk", raw]]))
            .get("Gtk")
            ?.records.get("WidgetClass");
        const callbackField = record?.fields[0];
        const compositeField = record?.fields[1];

        expect(callbackField?.callback?.name).toBe("finalize");
        expect(callbackField?.callback?.qualifiedName).toBe("Gtk.__field_finalize");
        expect(compositeField?.inlineComposite?.isUnion).toBe(true);
        expect(compositeField?.inlineComposite?.fields[0]?.name).toBe("reserved");
    });
});

describe("GirNormalizer (21)", () => {
    it("preserves an explicit inline callback name", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "Gtk",
            records: [
                {
                    name: "WidgetClass",
                    cType: "GtkWidgetClass",
                    fields: [
                        {
                            name: "snapshot",
                            type: { name: "gpointer" },
                            callback: {
                                name: "SnapshotFunc",
                                cType: "GtkSnapshotFunc",
                                returnType: { name: "none" },
                                parameters: [],
                            },
                        },
                    ],
                    methods: [],
                    constructors: [],
                    functions: [],
                },
            ],
        });

        const callback = normalizer
            .normalize(new Map([["Gtk", raw]]))
            .get("Gtk")
            ?.records.get("WidgetClass")?.fields[0]?.callback;

        expect(callback?.name).toBe("SnapshotFunc");
    });
});

describe("GirNormalizer (22)", () => {
    it("qualifies implemented interfaces, static functions and constructor parameters", () => {
        const normalizer = new GirNormalizer();
        const raw = createRawNamespace({
            name: "Gtk",
            interfaces: [
                {
                    name: "Orientable",
                    cType: "GtkOrientable",
                    prerequisites: [],
                    methods: [],
                    functions: [],
                    properties: [],
                    signals: [],
                    fieldNames: [],
                    virtualMethodNames: [],
                },
            ],
            classes: [
                {
                    name: "Button",
                    cType: "GtkButton",
                    implements: ["Orientable"],
                    methods: [],
                    constructors: [
                        {
                            name: "new_with_label",
                            cIdentifier: "gtk_button_new_with_label",
                            returnType: { name: "Button" },
                            parameters: [{ name: "label", type: { name: "utf8" } }],
                        },
                    ],
                    functions: [
                        {
                            name: "list",
                            cIdentifier: "gtk_button_list",
                            returnType: { name: "none" },
                            parameters: [],
                        },
                    ],
                    properties: [],
                    signals: [],
                    fieldNames: [],
                    fields: [],
                    virtualMethodNames: [],
                },
            ],
        });

        const cls = normalizer
            .normalize(new Map([["Gtk", raw]]))
            .get("Gtk")
            ?.classes.get("Button");

        expect(cls?.implements).toEqual(["Gtk.Orientable"]);
        expect(cls?.staticFunctions[0]?.name).toBe("list");
        expect(cls?.constructors[0]?.parameters[0]?.name).toBe("label");
    });
});

describe("GirNormalizer (23)", () => {
    it("resolves an unqualified type defined in another namespace", () => {
        const normalizer = new GirNormalizer();
        const gdkRaw = createRawNamespace({
            name: "Gdk",
            records: [
                {
                    name: "Rectangle",
                    cType: "GdkRectangle",
                    fields: [],
                    methods: [],
                    constructors: [],
                    functions: [],
                },
            ],
        });
        const gtkRaw = createRawNamespace({
            name: "Gtk",
            functions: [
                {
                    name: "get_area",
                    cIdentifier: "gtk_get_area",
                    returnType: { name: "Rectangle" },
                    parameters: [],
                },
            ],
        });

        const result = normalizer.normalize(
            new Map([
                ["Gdk", gdkRaw],
                ["Gtk", gtkRaw],
            ]),
        );

        expect(result.get("Gtk")?.functions.get("get_area")?.returnType.name).toBe("Gdk.Rectangle");
    });
});
