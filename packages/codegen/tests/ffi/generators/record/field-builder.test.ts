import { describe, expect, it } from "vitest";
import { Writer } from "../../../../src/builders/text-writer.js";
import { FieldBuilder } from "../../../../src/ffi/generators/record/field-builder.js";
import type { GirRepository } from "../../../../src/gir/index.js";
import { setupGtkFfiContext } from "../../../fixtures/generator-fixtures.js";
import {
    createNormalizedField,
    createNormalizedNamespace,
    createNormalizedRecord,
    createNormalizedType,
} from "../../../fixtures/gir-fixtures.js";

function createTestSetup(namespaces: Map<string, ReturnType<typeof createNormalizedNamespace>> = new Map()) {
    const { ffiMapper, file: imports } = setupGtkFfiContext(namespaces);
    const builder = new FieldBuilder(ffiMapper, imports);
    return { builder, imports, ffiMapper };
}

function createRepoBackedSetup(namespaces: Map<string, ReturnType<typeof createNormalizedNamespace>>) {
    const { repo, ffiMapper, file: imports } = setupGtkFfiContext(namespaces);
    const builder = new FieldBuilder(ffiMapper, imports, repo as unknown as GirRepository, "Gtk");
    return { builder, imports, ffiMapper, repo };
}

function render(write: (writer: Writer) => void): string {
    const writer = new Writer();
    write(writer);
    return writer.toString();
}

describe("FieldBuilder / constructor", () => {
    it("creates builder with dependencies", () => {
        const { builder } = createTestSetup();
        expect(builder).toBeInstanceOf(FieldBuilder);
    });
});

describe("FieldBuilder / calculateLayout (1)", () => {
    it("returns empty array for empty fields", () => {
        const { builder } = createTestSetup();

        const layout = builder.calculateLayout([]);

        expect(layout).toHaveLength(0);
    });

    it("calculates layout for single field", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "value",
                type: createNormalizedType({ name: "gint" }),
            }),
        ];

        const layout = builder.calculateLayout(fields);

        expect(layout).toHaveLength(1);
        expect(layout[0]?.offset).toBe(0);
        expect(layout[0]?.size).toBe(4);
    });

    it("calculates layout for multiple fields", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "x",
                type: createNormalizedType({ name: "gint" }),
            }),
            createNormalizedField({
                name: "y",
                type: createNormalizedType({ name: "gint" }),
            }),
        ];

        const layout = builder.calculateLayout(fields);

        expect(layout).toHaveLength(2);
        expect(layout[0]?.offset).toBe(0);
        expect(layout[1]?.offset).toBe(4);
    });
});

describe("FieldBuilder / calculateLayout (2)", () => {
    it("excludes private fields by default", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "public_field",
                type: createNormalizedType({ name: "gint" }),
                private: false,
            }),
            createNormalizedField({
                name: "private_field",
                type: createNormalizedType({ name: "gint" }),
                private: true,
            }),
        ];

        const layout = builder.calculateLayout(fields);

        expect(layout).toHaveLength(1);
        expect(layout[0]?.field.name).toBe("public_field");
    });

    it("includes private fields when includePrivate is true", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "public_field",
                type: createNormalizedType({ name: "gint" }),
                private: false,
            }),
            createNormalizedField({
                name: "private_field",
                type: createNormalizedType({ name: "gint" }),
                private: true,
            }),
        ];

        const layout = builder.calculateLayout(fields, true);

        expect(layout).toHaveLength(2);
    });
});

describe("FieldBuilder / calculateLayout (3)", () => {
    it("handles alignment for different sized types", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "byte",
                type: createNormalizedType({ name: "guint8" }),
            }),
            createNormalizedField({
                name: "int",
                type: createNormalizedType({ name: "gint" }),
            }),
        ];

        const layout = builder.calculateLayout(fields);

        expect(layout[0]?.offset).toBe(0);
        expect(layout[0]?.size).toBe(1);
        expect(layout[1]?.offset).toBe(4);
    });
});

describe("FieldBuilder / calculateLayout (4)", () => {
    it("calculates correct sizes for various types", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "byte",
                type: createNormalizedType({ name: "guint8" }),
            }),
            createNormalizedField({
                name: "short",
                type: createNormalizedType({ name: "gint16" }),
            }),
            createNormalizedField({
                name: "int",
                type: createNormalizedType({ name: "gint" }),
            }),
            createNormalizedField({
                name: "long",
                type: createNormalizedType({ name: "gint64" }),
            }),
        ];

        const layout = builder.calculateLayout(fields);

        expect(layout[0]?.size).toBe(1);
        expect(layout[1]?.size).toBe(2);
        expect(layout[2]?.size).toBe(4);
        expect(layout[3]?.size).toBe(8);
    });

    it("preserves field reference in layout", () => {
        const { builder } = createTestSetup();
        const field = createNormalizedField({
            name: "test",
            type: createNormalizedType({ name: "gint" }),
        });

        const layout = builder.calculateLayout([field]);

        expect(layout[0]?.field).toBe(field);
    });
});

describe("FieldBuilder / calculateStructSize (1)", () => {
    it("returns 0 for empty fields", () => {
        const { builder } = createTestSetup();

        const size = builder.calculateStructSize([]);

        expect(size).toBe(0);
    });

    it("calculates size for single field", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "value",
                type: createNormalizedType({ name: "gint" }),
            }),
        ];

        const size = builder.calculateStructSize(fields);

        expect(size).toBe(4);
    });

    it("calculates size for multiple fields", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "x",
                type: createNormalizedType({ name: "gint" }),
            }),
            createNormalizedField({
                name: "y",
                type: createNormalizedType({ name: "gint" }),
            }),
        ];

        const size = builder.calculateStructSize(fields);

        expect(size).toBe(8);
    });
});

describe("FieldBuilder / calculateStructSize (2)", () => {
    it("includes alignment padding in total size", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "byte",
                type: createNormalizedType({ name: "guint8" }),
            }),
            createNormalizedField({
                name: "long",
                type: createNormalizedType({ name: "gint64" }),
            }),
        ];

        const size = builder.calculateStructSize(fields);

        expect(size).toBe(16);
    });

    it("includes private fields in size calculation", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "public",
                type: createNormalizedType({ name: "gint" }),
                private: false,
            }),
            createNormalizedField({
                name: "private",
                type: createNormalizedType({ name: "gint" }),
                private: true,
            }),
        ];

        const size = builder.calculateStructSize(fields);

        expect(size).toBe(8);
    });
});

describe("FieldBuilder / getWritableFields (1)", () => {
    it("returns empty array for empty fields", () => {
        const { builder } = createTestSetup();

        const writable = builder.getWritableFields([]);

        expect(writable).toHaveLength(0);
    });

    it("includes writable primitive fields", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "value",
                type: createNormalizedType({ name: "gint" }),
                writable: true,
            }),
        ];

        const writable = builder.getWritableFields(fields);

        expect(writable).toHaveLength(1);
    });

    it("excludes private fields", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "public",
                type: createNormalizedType({ name: "gint" }),
                writable: true,
                private: false,
            }),
            createNormalizedField({
                name: "private",
                type: createNormalizedType({ name: "gint" }),
                writable: true,
                private: true,
            }),
        ];

        const writable = builder.getWritableFields(fields);

        expect(writable).toHaveLength(1);
        expect(writable[0]?.name).toBe("public");
    });
});

describe("FieldBuilder / getWritableFields (2)", () => {
    it("excludes explicitly non-writable fields", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "writable",
                type: createNormalizedType({ name: "gint" }),
                writable: true,
            }),
            createNormalizedField({
                name: "readonly",
                type: createNormalizedType({ name: "gint" }),
                writable: false,
            }),
        ];

        const writable = builder.getWritableFields(fields);

        expect(writable).toHaveLength(1);
        expect(writable[0]?.name).toBe("writable");
    });

    it("excludes non-memory-writable types", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "primitive",
                type: createNormalizedType({ name: "gint" }),
                writable: true,
            }),
            createNormalizedField({
                name: "object",
                type: createNormalizedType({ name: "Gtk.Widget" }),
                writable: true,
            }),
        ];

        const writable = builder.getWritableFields(fields);

        expect(writable).toHaveLength(1);
        expect(writable[0]?.name).toBe("primitive");
    });
});

describe("FieldBuilder / isWritableType", () => {
    it("returns true for primitive integer types", () => {
        const { builder } = createTestSetup();

        expect(builder.isWritableType({ name: "gint" })).toBe(true);
        expect(builder.isWritableType({ name: "guint" })).toBe(true);
        expect(builder.isWritableType({ name: "gint8" })).toBe(true);
        expect(builder.isWritableType({ name: "guint8" })).toBe(true);
        expect(builder.isWritableType({ name: "gint16" })).toBe(true);
        expect(builder.isWritableType({ name: "guint16" })).toBe(true);
        expect(builder.isWritableType({ name: "gint32" })).toBe(true);
        expect(builder.isWritableType({ name: "guint32" })).toBe(true);
        expect(builder.isWritableType({ name: "gint64" })).toBe(true);
        expect(builder.isWritableType({ name: "guint64" })).toBe(true);
    });

    it("returns true for floating point types", () => {
        const { builder } = createTestSetup();

        expect(builder.isWritableType({ name: "gfloat" })).toBe(true);
        expect(builder.isWritableType({ name: "gdouble" })).toBe(true);
    });

    it("returns true for boolean type", () => {
        const { builder } = createTestSetup();

        expect(builder.isWritableType({ name: "gboolean" })).toBe(true);
    });

    it("returns false for object types", () => {
        const { builder } = createTestSetup();

        expect(builder.isWritableType({ name: "Gtk.Widget" })).toBe(false);
        expect(builder.isWritableType({ name: "GObject.Object" })).toBe(false);
    });

    it("returns false for string types", () => {
        const { builder } = createTestSetup();

        expect(builder.isWritableType({ name: "utf8" })).toBe(false);
        expect(builder.isWritableType({ name: "filename" })).toBe(false);
    });
});

describe("FieldBuilder / alignment (1)", () => {
    it("aligns 2-byte types to 2-byte boundaries", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "byte",
                type: createNormalizedType({ name: "guint8" }),
            }),
            createNormalizedField({
                name: "short",
                type: createNormalizedType({ name: "gint16" }),
            }),
        ];

        const layout = builder.calculateLayout(fields);

        expect(layout[1]?.offset).toBe(2);
    });

    it("aligns 4-byte types to 4-byte boundaries", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "byte",
                type: createNormalizedType({ name: "guint8" }),
            }),
            createNormalizedField({
                name: "int",
                type: createNormalizedType({ name: "gint" }),
            }),
        ];

        const layout = builder.calculateLayout(fields);

        expect(layout[1]?.offset).toBe(4);
    });
});

describe("FieldBuilder / alignment (2)", () => {
    it("aligns 8-byte types to 8-byte boundaries", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "byte",
                type: createNormalizedType({ name: "guint8" }),
            }),
            createNormalizedField({
                name: "long",
                type: createNormalizedType({ name: "gint64" }),
            }),
        ];

        const layout = builder.calculateLayout(fields);

        expect(layout[1]?.offset).toBe(8);
    });
});

describe("FieldBuilder - bitfields and unions (1)", () => {
    it("packs consecutive bitfield members into a shared storage unit", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({ name: "a", type: createNormalizedType({ name: "guint" }), bits: 3 }),
            createNormalizedField({ name: "b", type: createNormalizedType({ name: "guint" }), bits: 5 }),
        ];

        const layout = builder.calculateLayout(fields);

        expect(layout[0]?.offset).toBe(0);
        expect(layout[0]?.bitOffset).toBe(0);
        expect(layout[1]?.offset).toBe(0);
        expect(layout[1]?.bitOffset).toBe(3);
    });

    it("opens a fresh storage unit when a bitfield run overflows the current one", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({ name: "a", type: createNormalizedType({ name: "guint8" }), bits: 6 }),
            createNormalizedField({ name: "b", type: createNormalizedType({ name: "guint8" }), bits: 6 }),
        ];

        const layout = builder.calculateLayout(fields);

        expect(layout[0]?.offset).toBe(0);
        expect(layout[1]?.offset).toBe(1);
        expect(layout[1]?.bitOffset).toBe(0);
    });

    it("overlays union members at offset zero", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({ name: "asInt", type: createNormalizedType({ name: "gint" }) }),
            createNormalizedField({ name: "asLong", type: createNormalizedType({ name: "gint64" }) }),
        ];

        const layout = builder.calculateLayout(fields, false, true);

        expect(layout[0]?.offset).toBe(0);
        expect(layout[1]?.offset).toBe(0);
    });
});

describe("FieldBuilder - bitfields and unions (2)", () => {
    it("overlays union bitfield members at offset zero", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({ name: "flag", type: createNormalizedType({ name: "guint" }), bits: 4 }),
        ];

        const layout = builder.calculateLayout(fields, false, true);

        expect(layout[0]?.offset).toBe(0);
        expect(layout[0]?.bitOffset).toBe(0);
        expect(layout[0]?.bitWidth).toBe(4);
    });

    it("sizes a union as its widest member rounded to alignment", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({ name: "asInt", type: createNormalizedType({ name: "gint" }) }),
            createNormalizedField({ name: "asLong", type: createNormalizedType({ name: "gint64" }) }),
        ];

        expect(builder.calculateStructSize(fields, true)).toBe(8);
    });
});

describe("FieldBuilder - inline composite members", () => {
    it("sizes an inline composite member from its nested fields", () => {
        const { builder } = createTestSetup();
        const fields = [
            createNormalizedField({
                name: "inner",
                type: createNormalizedType({ name: "AnonStruct" }),
                inlineComposite: {
                    isUnion: false,
                    fields: [
                        createNormalizedField({ name: "x", type: createNormalizedType({ name: "gint" }) }),
                        createNormalizedField({ name: "y", type: createNormalizedType({ name: "gint" }) }),
                    ],
                },
            }),
        ];

        const layout = builder.calculateLayout(fields, true);

        expect(layout[0]?.size).toBe(8);
        expect(layout[0]?.alignment).toBe(4);
    });
});

function pointWithRepo() {
    const point = createNormalizedRecord({
        name: "Point",
        qualifiedName: "Gtk.Point",
        isUnion: false,
        fields: [
            createNormalizedField({ name: "x", type: createNormalizedType({ name: "gint" }) }),
            createNormalizedField({ name: "y", type: createNormalizedType({ name: "gint" }) }),
        ],
    });
    const ns = createNormalizedNamespace({ name: "Gtk", records: new Map([["Point", point]]) });
    return createRepoBackedSetup(new Map([["Gtk", ns]]));
}

describe("FieldBuilder - nested struct resolution (1)", () => {
    it("identifies a plain nested struct type", () => {
        const { builder } = pointWithRepo();

        expect(builder.isNestedStructType("Point")).toBe(true);
        expect(builder.isNestedStructType("gint")).toBe(false);
    });

    it("computes the layout of a nested struct", () => {
        const { builder } = pointWithRepo();

        const layout = builder.getNestedStructLayout("Point");

        expect(layout).not.toBeNull();
        expect(layout).toHaveLength(2);
    });

    it("returns null layout for an unknown type", () => {
        const { builder } = pointWithRepo();

        expect(builder.getNestedStructLayout("DoesNotExist")).toBeNull();
    });

    it("reports a nested struct as having a readable layout", () => {
        const { builder } = pointWithRepo();

        expect(builder.hasReadableStructLayout("Point")).toBe(true);
        expect(builder.hasReadableStructLayout("gint")).toBe(false);
    });

    it("computes the byte size of a nested record type", () => {
        const { builder } = pointWithRepo();

        expect(builder.getRecordSize("Point")).toBe(8);
    });

    it("identifies an inline nested struct field with writable sub-fields", () => {
        const { builder } = pointWithRepo();
        const field = createNormalizedField({ name: "origin", type: createNormalizedType({ name: "Point" }) });

        expect(builder.isInlineNestedStruct(field)).toBe(true);
    });

    it("rejects a pointer-to-struct field as an inline nested struct", () => {
        const { builder } = pointWithRepo();
        const field = createNormalizedField({
            name: "originPtr",
            type: createNormalizedType({ name: "Point", cType: "GtkPoint*" }),
        });

        expect(builder.isInlineNestedStruct(field)).toBe(false);
    });
});

describe("FieldBuilder - nested struct resolution (2)", () => {
    it("treats a boxed record type as not a plain nested struct", () => {
        const boxed = createNormalizedRecord({
            name: "Border",
            qualifiedName: "Gtk.Border",
            isUnion: false,
            glibTypeName: "GtkBorder",
            fields: [createNormalizedField({ name: "left", type: createNormalizedType({ name: "gint" }) })],
        });
        const ns = createNormalizedNamespace({ name: "Gtk", records: new Map([["Border", boxed]]) });
        const { builder } = createRepoBackedSetup(new Map([["Gtk", ns]]));

        expect(builder.isNestedStructType("Border")).toBe(false);
    });

    it("falls back to primitive detection when no repository is configured", () => {
        const { builder } = createTestSetup();

        expect(builder.isGeneratableFieldType("gint")).toBe(true);
        expect(builder.isGeneratableFieldType("SomethingUnknown")).toBe(false);
    });
});

describe("FieldBuilder - writeFieldWrites (1)", () => {
    it("emits guarded write statements for writable primitive fields", () => {
        const { builder } = createTestSetup();
        const fields = [createNormalizedField({ name: "value", type: createNormalizedType({ name: "gint" }) })];

        const code = render(builder.writeFieldWrites(fields));

        expect(code).toContain("if (init.value !== undefined) write(getHandle(this),");
    });

    it("emits per-sub-field writes for an inline nested struct field", () => {
        const point = createNormalizedRecord({
            name: "Point",
            qualifiedName: "Gtk.Point",
            isUnion: false,
            fields: [
                createNormalizedField({ name: "x", type: createNormalizedType({ name: "gint" }) }),
                createNormalizedField({ name: "y", type: createNormalizedType({ name: "gint" }) }),
            ],
        });
        const ns = createNormalizedNamespace({ name: "Gtk", records: new Map([["Point", point]]) });
        const { builder } = createRepoBackedSetup(new Map([["Gtk", ns]]));
        const fields = [createNormalizedField({ name: "origin", type: createNormalizedType({ name: "Point" }) })];

        const code = render(builder.writeFieldWrites(fields));

        expect(code).toContain("if (init.origin !== undefined) {");
        expect(code).toContain("init.origin.x");
        expect(code).toContain("init.origin.y");
    });

    it("renames an id field to avoid the reserved member name", () => {
        const { builder } = createTestSetup();
        const fields = [createNormalizedField({ name: "id", type: createNormalizedType({ name: "gint" }) })];

        const code = render(builder.writeFieldWrites(fields));

        expect(code).toContain("init.id_");
    });
});

describe("FieldBuilder - writeFieldWrites (2)", () => {
    it("returns initializable fields including inline nested structs", () => {
        const point = createNormalizedRecord({
            name: "Point",
            qualifiedName: "Gtk.Point",
            isUnion: false,
            fields: [createNormalizedField({ name: "x", type: createNormalizedType({ name: "gint" }) })],
        });
        const ns = createNormalizedNamespace({ name: "Gtk", records: new Map([["Point", point]]) });
        const { builder } = createRepoBackedSetup(new Map([["Gtk", ns]]));
        const fields = [
            createNormalizedField({ name: "value", type: createNormalizedType({ name: "gint" }) }),
            createNormalizedField({ name: "origin", type: createNormalizedType({ name: "Point" }) }),
        ];

        const initializable = builder.getInitializableFields(fields);

        expect(initializable.map((f) => f.name)).toEqual(["value", "origin"]);
    });
});
