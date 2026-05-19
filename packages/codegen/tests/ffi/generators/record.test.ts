import { describe, expect, it } from "vitest";
import { fileBuilder } from "../../../src/builders/file-builder.js";
import { stringify } from "../../../src/builders/stringify.js";
import { RecordGenerator } from "../../../src/ffi/generators/record/index.js";
import { FfiMapper } from "../../../src/type-system/ffi-mapper.js";
import {
    createNormalizedCallback,
    createNormalizedConstructor,
    createNormalizedField,
    createNormalizedFunction,
    createNormalizedMethod,
    createNormalizedNamespace,
    createNormalizedParameter,
    createNormalizedRecord,
    createNormalizedType,
} from "../../fixtures/gir-fixtures.js";
import { createMockRepository } from "../../fixtures/mock-repository.js";

function createTestSetup(namespaces: Map<string, ReturnType<typeof createNormalizedNamespace>> = new Map()) {
    const ns = createNormalizedNamespace({ name: "Gdk" });
    namespaces.set("Gdk", ns);
    const repo = createMockRepository(namespaces);
    const ffiMapper = new FfiMapper(repo as ConstructorParameters<typeof FfiMapper>[0], "Gdk");
    const file = fileBuilder();
    const options = {
        namespace: "Gdk",
        sharedLibrary: "libgdk-4.so.1",
        glibLibrary: "libglib-2.0.so.0",
        gobjectLibrary: "libgobject-2.0.so.0",
    };
    const generator = new RecordGenerator(ffiMapper, file, options);
    return { generator, file, repo };
}

function createTestSetupWithRepo(configure: (ns: ReturnType<typeof createNormalizedNamespace>) => void) {
    const ns = createNormalizedNamespace({ name: "Gdk" });
    configure(ns);
    const namespaces = new Map([["Gdk", ns]]);
    const repo = createMockRepository(namespaces);
    const ffiMapper = new FfiMapper(repo as ConstructorParameters<typeof FfiMapper>[0], "Gdk");
    const file = fileBuilder();
    const options = {
        namespace: "Gdk",
        sharedLibrary: "libgdk-4.so.1",
        glibLibrary: "libglib-2.0.so.0",
        gobjectLibrary: "libgobject-2.0.so.0",
    };
    const generator = new RecordGenerator(
        ffiMapper,
        file,
        options,
        repo as ConstructorParameters<typeof RecordGenerator>[3],
    );
    return { generator, file, repo, namespace: ns };
}

describe("RecordGenerator", () => {
    describe("constructor", () => {
        it("creates generator with dependencies", () => {
            const { generator } = createTestSetup();
            expect(generator).toBeInstanceOf(RecordGenerator);
        });
    });

    describe("generateToSourceFile", () => {
        it("generates class with correct name", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                fields: [],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("export class Rectangle");
        });

        it("emits a constructor that delegates to constructNativeObject", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                fields: [],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("constructNativeObject(this, props)");
            expect(code).not.toContain("extends NativeObject");
        });

        it("registers native class with gtype when glibGetType is present", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                glibTypeName: "GdkRectangle",
                glibGetType: "gdk_rectangle_get_type",
                fields: [],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("registerNativeClass(Rectangle, gdk_rectangle_get_type());");
            expect(code).toContain("export const gdk_rectangle_get_type");
        });

        it("does not emit objectType when glibTypeName present", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                glibTypeName: "GdkRectangle",
                fields: [],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).not.toContain("objectType");
        });

        it("does not emit objectType when no glibTypeName", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                glibTypeName: undefined,
                fields: [],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).not.toContain("objectType");
        });

        it("does not emit objectType for fundamental records", () => {
            const glibNs = createNormalizedNamespace({ name: "GLib" });
            const namespaces = new Map([["GLib", glibNs]]);
            const repo = createMockRepository(namespaces);
            const ffiMapper = new FfiMapper(repo as ConstructorParameters<typeof FfiMapper>[0], "GLib");
            const glibFile = fileBuilder();
            const options = {
                namespace: "GLib",
                sharedLibrary: "libglib-2.0.so.0",
                glibLibrary: "libglib-2.0.so.0",
                gobjectLibrary: "libgobject-2.0.so.0",
            };
            const generator = new RecordGenerator(ffiMapper, glibFile, options);

            const record = createNormalizedRecord({
                name: "Variant",
                glibTypeName: "GVariant",
                copyFunction: "g_variant_ref_sink",
                freeFunction: "g_variant_unref",
                fields: [],
            });

            generator.generate(record);

            const code = stringify(glibFile);
            expect(code).not.toContain("objectType");
        });

        it("adds registerNativeClass call when glibGetType is present", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                glibTypeName: "GdkRectangle",
                glibGetType: "gdk_rectangle_get_type",
                fields: [],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("registerNativeClass(Rectangle, gdk_rectangle_get_type());");
        });
    });

    describe("field generation", () => {
        it("generates accessor for readable field", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                fields: [
                    createNormalizedField({
                        name: "x",
                        type: createNormalizedType({ name: "gint" }),
                        readable: true,
                        writable: true,
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get x()");
            expect(code).toContain("set x(");
        });

        it("generates setter for writable field", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                glibTypeName: "GdkRectangle",
                fields: [
                    createNormalizedField({
                        name: "x",
                        type: createNormalizedType({ name: "gint" }),
                        readable: true,
                        writable: true,
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("set x(value");
        });

        it("converts field names to camelCase", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                fields: [
                    createNormalizedField({
                        name: "some_field",
                        type: createNormalizedType({ name: "gint" }),
                        readable: true,
                        writable: true,
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get someField()");
        });

        it("renames id field to id_", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Event",
                fields: [
                    createNormalizedField({
                        name: "id",
                        type: createNormalizedType({ name: "gint" }),
                        readable: true,
                        writable: true,
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get id_()");
        });
    });

    describe("constructor generation", () => {
        it("emits the record class without a per-class init type when no main constructor exists", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                constructors: [],
                fields: [
                    createNormalizedField({
                        name: "x",
                        type: createNormalizedType({ name: "gint" }),
                        readable: true,
                        writable: true,
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("export class Rectangle");
            expect(code).not.toContain("extends NativeObject");
            expect(code).not.toContain("RectangleInit");
        });

        it("emits a static factory for the GIR `new` constructor", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                constructors: [
                    createNormalizedConstructor({
                        name: "new",
                        cIdentifier: "gdk_rectangle_new",
                        returnType: createNormalizedType({ name: "Gdk.Rectangle" }),
                        parameters: [],
                    }),
                ],
                fields: [],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("static new(");
        });

        it("generates factory methods for non-main constructors", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                constructors: [
                    createNormalizedConstructor({
                        name: "new",
                        cIdentifier: "gdk_rectangle_new",
                        returnType: createNormalizedType({ name: "Gdk.Rectangle" }),
                        parameters: [],
                    }),
                    createNormalizedConstructor({
                        name: "new_from_coords",
                        cIdentifier: "gdk_rectangle_new_from_coords",
                        returnType: createNormalizedType({ name: "Gdk.Rectangle" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "x",
                                type: createNormalizedType({ name: "gint" }),
                            }),
                        ],
                    }),
                ],
                fields: [],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("static newFromCoords");
        });
    });

    describe("method generation", () => {
        it("generates instance methods", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                methods: [
                    createNormalizedMethod({
                        name: "get_area",
                        cIdentifier: "gdk_rectangle_get_area",
                        returnType: createNormalizedType({ name: "gint" }),
                    }),
                ],
                fields: [],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("getArea");
        });

        it("generates static functions", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                staticFunctions: [
                    createNormalizedFunction({
                        name: "intersect",
                        cIdentifier: "gdk_rectangle_intersect",
                        returnType: createNormalizedType({ name: "gboolean" }),
                        parameters: [],
                        throws: false,
                    }),
                ],
                fields: [],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("static intersect");
        });

        it("emits a throwing stub for methods whose parameters are GLib.Closure (untyped, unsafe)", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                methods: [
                    createNormalizedMethod({
                        name: "with_closure",
                        cIdentifier: "gdk_rectangle_with_closure",
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
                        cIdentifier: "gdk_rectangle_normal",
                        returnType: createNormalizedType({ name: "none" }),
                    }),
                ],
                fields: [],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("normal");
            expect(code).toContain("withClosure");
            expect(code).toContain("throwUnsupported");
        });
    });

    describe("init interface generation", () => {
        it("emits no per-record init type alias when no main constructor", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                constructors: [],
                fields: [
                    createNormalizedField({
                        name: "x",
                        type: createNormalizedType({ name: "gint" }),
                        readable: true,
                        writable: true,
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).not.toContain("RectangleInit");
        });

        it("emits no per-record init type alias even when writable fields exist", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                constructors: [],
                fields: [
                    createNormalizedField({
                        name: "x",
                        type: createNormalizedType({ name: "gint" }),
                        readable: true,
                        writable: true,
                    }),
                    createNormalizedField({
                        name: "y",
                        type: createNormalizedType({ name: "gint" }),
                        readable: true,
                        writable: true,
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).not.toContain("RectangleInit");
        });

        it("generates init interface when main constructor takes no parameters and fields are writable", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                constructors: [
                    createNormalizedConstructor({
                        name: "new",
                        cIdentifier: "gdk_rectangle_new",
                        returnType: createNormalizedType({ name: "Gdk.Rectangle" }),
                        parameters: [],
                    }),
                ],
                fields: [
                    createNormalizedField({
                        name: "x",
                        type: createNormalizedType({ name: "gint" }),
                        readable: true,
                        writable: true,
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("export class Rectangle");
            expect(code).not.toContain("extends NativeObject");
        });

        it("emits the GIR `<constructor>` as a static factory even when it takes parameters", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                constructors: [
                    createNormalizedConstructor({
                        name: "new",
                        cIdentifier: "gdk_rectangle_new",
                        returnType: createNormalizedType({ name: "Gdk.Rectangle" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "x",
                                type: createNormalizedType({ name: "gint" }),
                                direction: "in",
                            }),
                        ],
                    }),
                ],
                fields: [
                    createNormalizedField({
                        name: "x",
                        type: createNormalizedType({ name: "gint" }),
                        readable: true,
                        writable: true,
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("static new(");
        });
    });

    describe("context updates", () => {
        it("sets usesNativeObject flag", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                fields: [],
            });

            generator.generate(record);

            expect(stringify(file)).toContain("NativeObject");
        });

        it("imports fn when record has methods", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                methods: [
                    createNormalizedMethod({
                        name: "get_value",
                        cIdentifier: "gdk_rectangle_get_value",
                        returnType: createNormalizedType({ name: "gint" }),
                    }),
                ],
                fields: [],
            });

            generator.generate(record);
            const out = stringify(file);

            expect(out).toContain("import { t }");
            expect(out).toContain("const gdk_rectangle_get_value = t.fn(");
        });

        it("sets usesRead flag when record has readable fields", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                fields: [
                    createNormalizedField({
                        name: "x",
                        type: createNormalizedType({ name: "gint" }),
                        readable: true,
                        writable: false,
                    }),
                ],
            });

            generator.generate(record);

            expect(stringify(file)).toContain("read");
        });

        it("registers native class when glibGetType is present", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                glibTypeName: "GdkRectangle",
                glibGetType: "gdk_rectangle_get_type",
                fields: [],
            });

            generator.generate(record);

            expect(stringify(file)).toContain("registerNativeClass");
        });
    });

    describe("JSDoc generation", () => {
        it("includes record documentation", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                doc: "A rectangle with integer coordinates",
                fields: [],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("A rectangle with integer coordinates");
        });

        it("attaches field documentation to the accessor", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                fields: [
                    createNormalizedField({
                        name: "width",
                        type: createNormalizedType({ name: "gint" }),
                        doc: "The width in pixels",
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("The width in pixels");
        });
    });

    describe("construction metadata", () => {
        it("emits registerConstructionMeta with field offsets for allocatable records", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                fields: [
                    createNormalizedField({ name: "x", type: createNormalizedType({ name: "gint" }) }),
                    createNormalizedField({ name: "y", type: createNormalizedType({ name: "gint" }) }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("registerConstructionMeta(Rectangle, {");
            expect(code).toContain('kind: "boxed"');
            expect(code).toContain("size: 8");
            expect(code).toContain("x: { offset: 0, ffiType:");
            expect(code).toContain("y: { offset: 4, ffiType:");
        });

        it("includes glibTypeName and library in construction metadata when boxed", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                glibTypeName: "GdkRectangle",
                glibGetType: "gdk_rectangle_get_type",
                fields: [createNormalizedField({ name: "x", type: createNormalizedType({ name: "gint" }) })],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain('glibTypeName: "GdkRectangle"');
            expect(code).toContain('lib: "libgdk-4.so.1"');
        });

        it("emits an empty fields object when no field is initializable", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Boxed",
                glibTypeName: "GdkBoxed",
                fields: [
                    createNormalizedField({
                        name: "blob",
                        type: createNormalizedType({ name: "Gtk.Widget" }),
                        writable: false,
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("registerConstructionMeta(Boxed, {");
            expect(code).toContain("fields: {}");
        });

        it("does not emit construction metadata for vtable class structs", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "WidgetClass",
                isGtypeStructFor: "Widget",
                fields: [createNormalizedField({ name: "x", type: createNormalizedType({ name: "gint" }) })],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).not.toContain("registerConstructionMeta");
        });

        it("does not emit construction metadata for empty records", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({ name: "Empty", fields: [] });

            generator.generate(record);

            const code = stringify(file);
            expect(code).not.toContain("registerConstructionMeta");
        });
    });

    describe("union layout", () => {
        it("overlays every union member at offset zero", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Value",
                isUnion: true,
                fields: [
                    createNormalizedField({ name: "as_int", type: createNormalizedType({ name: "gint" }) }),
                    createNormalizedField({ name: "as_double", type: createNormalizedType({ name: "gdouble" }) }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get asInt()");
            expect(code).toContain("get asDouble()");
            expect(code).toContain("registerConstructionMeta(Value, {");
            expect(code).toContain("asInt: { offset: 0, ffiType:");
            expect(code).toContain("asDouble: { offset: 0, ffiType:");
        });
    });

    describe("bitfield fields", () => {
        it("masks and shifts a readable bitfield member", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Flags",
                fields: [
                    createNormalizedField({
                        name: "low",
                        type: createNormalizedType({ name: "guint" }),
                        bits: 3,
                    }),
                    createNormalizedField({
                        name: "high",
                        type: createNormalizedType({ name: "guint" }),
                        bits: 5,
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get low()");
            expect(code).toContain(">>> 0) & 7)");
            expect(code).toContain("get high()");
            expect(code).toContain(">>> 3) & 31)");
        });

        it("emits a read-modify-write setter that preserves sibling bits", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Flags",
                fields: [
                    createNormalizedField({
                        name: "flag",
                        type: createNormalizedType({ name: "guint" }),
                        bits: 4,
                        writable: true,
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("set flag(value");
            expect(code).toContain("& ~15)");
            expect(code).toContain("(value & 15)");
        });

        it("records bitOffset and bitWidth in construction metadata", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Flags",
                glibTypeName: "GdkFlags",
                fields: [
                    createNormalizedField({
                        name: "first",
                        type: createNormalizedType({ name: "guint" }),
                        bits: 2,
                    }),
                    createNormalizedField({
                        name: "second",
                        type: createNormalizedType({ name: "guint" }),
                        bits: 6,
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("bitOffset: 0, bitWidth: 2");
            expect(code).toContain("bitOffset: 2, bitWidth: 6");
        });
    });

    describe("array fields", () => {
        it("emits a fixed-size primitive array accessor with read and write loops", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Matrix",
                fields: [
                    createNormalizedField({
                        name: "values",
                        type: createNormalizedType({
                            name: "gint",
                            isArray: true,
                            fixedSize: 4,
                            elementType: createNormalizedType({ name: "gint" }),
                        }),
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get values()");
            expect(code).toContain("set values(value");
            expect(code).toContain("index < 4");
        });

        it("emits a zero-terminated string array accessor", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Names",
                fields: [
                    createNormalizedField({
                        name: "entries",
                        type: createNormalizedType({
                            name: "utf8",
                            isArray: true,
                            elementType: createNormalizedType({ name: "utf8" }),
                        }),
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get entries()");
            expect(code).toContain("t.array(t.string(");
        });

        it("emits a sized array accessor reading from a sibling length field", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "IntList",
                fields: [
                    createNormalizedField({
                        name: "items",
                        type: createNormalizedType({
                            name: "gint",
                            isArray: true,
                            sizeParamIndex: 1,
                            cType: "gint*",
                            elementType: createNormalizedType({ name: "gint" }),
                        }),
                    }),
                    createNormalizedField({ name: "n_items", type: createNormalizedType({ name: "guint" }) }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get items()");
            expect(code).toContain("this.nItems");
        });

        it("emits a linked-list field accessor read whole", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Container",
                fields: [
                    createNormalizedField({
                        name: "children",
                        type: createNormalizedType({
                            name: "GLib.List",
                            cType: "GList*",
                            isArray: true,
                            elementType: createNormalizedType({ name: "gpointer" }),
                        }),
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get children()");
        });
    });

    describe("nested struct and callback fields", () => {
        it("flattens an inline nested struct into a constructed accessor", () => {
            const { generator, file } = createTestSetupWithRepo((ns) => {
                ns.records.set(
                    "Point",
                    createNormalizedRecord({
                        name: "Point",
                        qualifiedName: "Gdk.Point",
                        fields: [
                            createNormalizedField({ name: "x", type: createNormalizedType({ name: "gint" }) }),
                            createNormalizedField({ name: "y", type: createNormalizedType({ name: "gint" }) }),
                        ],
                    }),
                );
            });
            const record = createNormalizedRecord({
                name: "Shape",
                fields: [
                    createNormalizedField({
                        name: "origin",
                        type: createNormalizedType({ name: "Point", cType: "GdkPoint" }),
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get origin()");
            expect(code).toContain("new Point({");
            expect(code).toContain("x:");
            expect(code).toContain("y:");
        });

        it("emits a read-only whole-struct accessor for a pointer-to-struct field", () => {
            const { generator, file } = createTestSetupWithRepo((ns) => {
                ns.records.set(
                    "Point",
                    createNormalizedRecord({
                        name: "Point",
                        qualifiedName: "Gdk.Point",
                        fields: [createNormalizedField({ name: "x", type: createNormalizedType({ name: "gint" }) })],
                    }),
                );
            });
            const record = createNormalizedRecord({
                name: "Shape",
                fields: [
                    createNormalizedField({
                        name: "anchor",
                        type: createNormalizedType({ name: "Point", cType: "GdkPoint*" }),
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get anchor()");
        });

        it("exposes a callback struct field as a raw pointer slot", () => {
            const { generator, file } = createTestSetupWithRepo((ns) => {
                ns.callbacks.set(
                    "DrawFunc",
                    createNormalizedCallback({ name: "DrawFunc", qualifiedName: "Gdk.DrawFunc" }),
                );
            });
            const record = createNormalizedRecord({
                name: "Painter",
                fields: [
                    createNormalizedField({
                        name: "draw",
                        type: createNormalizedType({ name: "DrawFunc", cType: "GdkDrawFunc" }),
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get draw()");
            expect(code).toContain("t.uint64");
        });

        it("wraps a boxed-typed field with getNativeObject and tryGetHandle", () => {
            const { generator, file } = createTestSetupWithRepo((ns) => {
                ns.records.set(
                    "Color",
                    createNormalizedRecord({
                        name: "Color",
                        qualifiedName: "Gdk.Color",
                        glibTypeName: "GdkColor",
                        glibGetType: "gdk_color_get_type",
                        fields: [createNormalizedField({ name: "red", type: createNormalizedType({ name: "guint" }) })],
                    }),
                );
            });
            const record = createNormalizedRecord({
                name: "Style",
                fields: [
                    createNormalizedField({
                        name: "fg",
                        type: createNormalizedType({ name: "Color", cType: "GdkColor*" }),
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get fg()");
            expect(code).toContain("getNativeObject(");
            expect(code).toContain("tryGetHandle(value)");
        });

        it("emits a sized struct-array accessor reading the sibling length field", () => {
            const { generator, file } = createTestSetupWithRepo((ns) => {
                ns.records.set(
                    "Point",
                    createNormalizedRecord({
                        name: "Point",
                        qualifiedName: "Gdk.Point",
                        fields: [
                            createNormalizedField({ name: "x", type: createNormalizedType({ name: "gint" }) }),
                            createNormalizedField({ name: "y", type: createNormalizedType({ name: "gint" }) }),
                        ],
                    }),
                );
            });
            const record = createNormalizedRecord({
                name: "Polygon",
                fields: [
                    createNormalizedField({
                        name: "vertices",
                        type: createNormalizedType({
                            name: "Point",
                            isArray: true,
                            sizeParamIndex: 1,
                            elementType: createNormalizedType({ name: "Point", cType: "GdkPoint" }),
                        }),
                    }),
                    createNormalizedField({ name: "n_vertices", type: createNormalizedType({ name: "guint" }) }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get vertices()");
            expect(code).toContain("this.nVertices");
        });

        it("groups inline nested sub-structs inside array element objects", () => {
            const { generator, file } = createTestSetupWithRepo((ns) => {
                ns.records.set(
                    "Point",
                    createNormalizedRecord({
                        name: "Point",
                        qualifiedName: "Gdk.Point",
                        fields: [
                            createNormalizedField({ name: "x", type: createNormalizedType({ name: "gint" }) }),
                            createNormalizedField({ name: "y", type: createNormalizedType({ name: "gint" }) }),
                        ],
                    }),
                );
                ns.records.set(
                    "Segment",
                    createNormalizedRecord({
                        name: "Segment",
                        qualifiedName: "Gdk.Segment",
                        fields: [
                            createNormalizedField({
                                name: "start",
                                type: createNormalizedType({ name: "Point", cType: "GdkPoint" }),
                            }),
                            createNormalizedField({ name: "weight", type: createNormalizedType({ name: "gint" }) }),
                        ],
                    }),
                );
            });
            const record = createNormalizedRecord({
                name: "Track",
                fields: [
                    createNormalizedField({
                        name: "segments",
                        type: createNormalizedType({
                            name: "Segment",
                            isArray: true,
                            fixedSize: 2,
                            elementType: createNormalizedType({ name: "Segment", cType: "GdkSegment" }),
                        }),
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get segments()");
            expect(code).toContain("start: {");
            expect(code).toContain("weight:");
        });

        it("emits an array-of-struct accessor with per-element field reads", () => {
            const { generator, file } = createTestSetupWithRepo((ns) => {
                ns.records.set(
                    "Point",
                    createNormalizedRecord({
                        name: "Point",
                        qualifiedName: "Gdk.Point",
                        fields: [
                            createNormalizedField({ name: "x", type: createNormalizedType({ name: "gint" }) }),
                            createNormalizedField({ name: "y", type: createNormalizedType({ name: "gint" }) }),
                        ],
                    }),
                );
            });
            const record = createNormalizedRecord({
                name: "Path",
                fields: [
                    createNormalizedField({
                        name: "points",
                        type: createNormalizedType({
                            name: "Point",
                            isArray: true,
                            fixedSize: 3,
                            elementType: createNormalizedType({ name: "Point", cType: "GdkPoint" }),
                        }),
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get points()");
            expect(code).toContain("set points(value");
            expect(code).toContain("t.struct(");
        });
    });

    describe("filtering and edge cases", () => {
        it("keeps the field accessor and drops a method that collides with a field name", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Widget",
                fields: [createNormalizedField({ name: "width", type: createNormalizedType({ name: "gint" }) })],
                methods: [
                    createNormalizedMethod({
                        name: "width",
                        cIdentifier: "gdk_widget_width",
                        returnType: createNormalizedType({ name: "gint" }),
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get width()");
            expect(code).not.toContain("gdk_widget_width");
        });

        it("emits only a getter for a read-only primitive field", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                fields: [
                    createNormalizedField({
                        name: "depth",
                        type: createNormalizedType({ name: "gint" }),
                        readable: true,
                        writable: false,
                    }),
                ],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("get depth()");
            expect(code).not.toContain("set depth(");
        });

        it("uses g_type_from_name when glibGetType is intern", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                glibTypeName: "GdkRectangle",
                glibGetType: "intern",
                fields: [createNormalizedField({ name: "x", type: createNormalizedType({ name: "gint" }) })],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("registerNativeClass(Rectangle,");
            expect(code).toContain("g_type_from_name");
        });

        it("falls back to a zero gtype when intern getType lacks a glib type name", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                glibTypeName: undefined,
                glibGetType: "intern",
                fields: [createNormalizedField({ name: "x", type: createNormalizedType({ name: "gint" }) })],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("registerNativeClass(Rectangle, 0");
        });

        it("generates instance methods with a fundamental self descriptor for copy/free records", () => {
            const glibNs = createNormalizedNamespace({ name: "GLib" });
            const namespaces = new Map([["GLib", glibNs]]);
            const repo = createMockRepository(namespaces);
            const ffiMapper = new FfiMapper(repo as ConstructorParameters<typeof FfiMapper>[0], "GLib");
            const file = fileBuilder();
            const options = {
                namespace: "GLib",
                sharedLibrary: "libglib-2.0.so.0",
                glibLibrary: "libglib-2.0.so.0",
                gobjectLibrary: "libgobject-2.0.so.0",
            };
            const generator = new RecordGenerator(ffiMapper, file, options);
            const record = createNormalizedRecord({
                name: "Variant",
                qualifiedName: "GLib.Variant",
                glibTypeName: "GVariant",
                copyFunction: "g_variant_ref_sink",
                freeFunction: "g_variant_unref",
                methods: [
                    createNormalizedMethod({
                        name: "get_size",
                        cIdentifier: "g_variant_get_size",
                        returnType: createNormalizedType({ name: "gsize" }),
                    }),
                ],
                fields: [],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("getSize");
        });

        it("emits a throwing stub for static functions with unsupported callbacks", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                staticFunctions: [
                    createNormalizedFunction({
                        name: "with_closure",
                        cIdentifier: "gdk_rectangle_with_closure",
                        returnType: createNormalizedType({ name: "none" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "callback",
                                type: createNormalizedType({ name: "GLib.Closure" }),
                            }),
                        ],
                        throws: false,
                    }),
                ],
                fields: [],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("withClosure");
            expect(code).toContain("throwUnsupported");
        });

        it("emits a throwing stub for unsupported constructors", () => {
            const { generator, file } = createTestSetup();
            const record = createNormalizedRecord({
                name: "Rectangle",
                constructors: [
                    createNormalizedConstructor({
                        name: "new_with_closure",
                        cIdentifier: "gdk_rectangle_new_with_closure",
                        returnType: createNormalizedType({ name: "Gdk.Rectangle" }),
                        parameters: [
                            createNormalizedParameter({
                                name: "callback",
                                type: createNormalizedType({ name: "GLib.Closure" }),
                            }),
                        ],
                    }),
                ],
                fields: [],
            });

            generator.generate(record);

            const code = stringify(file);
            expect(code).toContain("newWithClosure");
            expect(code).toContain("throwUnsupported");
        });
    });
});
