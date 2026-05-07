import type { GirNamespace, GirRepository } from "@gtkx/gir";
import { describe, expect, it } from "vitest";
import {
    canAllocateRecord,
    isClassVtable,
    isGeneratableFieldType,
    shouldGenerateRecord,
} from "../../../src/core/utils/record-filter.js";
import {
    createNormalizedField,
    createNormalizedNamespace,
    createNormalizedRecord,
    createNormalizedType,
} from "../../fixtures/gir-fixtures.js";
import { createMockRepository } from "../../fixtures/mock-repository.js";

const buildRepo = (records: ReturnType<typeof createNormalizedRecord>[]): GirRepository => {
    const ns = createNormalizedNamespace({
        name: "Gtk",
        records: new Map(records.map((r) => [r.name, r])),
    });
    const namespaces = new Map<string, GirNamespace>([["Gtk", ns]]);
    return createMockRepository(namespaces) as unknown as GirRepository;
};

describe("isClassVtable", () => {
    it("returns true when the GIR marks the record as a gtype struct", () => {
        const record = createNormalizedRecord({
            name: "Anything",
            isGtypeStructFor: "Object",
        });
        expect(isClassVtable(record)).toBe(true);
    });

    it("returns true for records whose name ends with Class", () => {
        expect(isClassVtable(createNormalizedRecord({ name: "WidgetClass" }))).toBe(true);
    });

    it("returns true for records whose name ends with Iface", () => {
        expect(isClassVtable(createNormalizedRecord({ name: "OrientableIface" }))).toBe(true);
    });

    it("returns false for plain non-vtable records", () => {
        expect(isClassVtable(createNormalizedRecord({ name: "Rectangle" }))).toBe(false);
    });
});

describe("isGeneratableFieldType", () => {
    it("returns true for primitive type names", () => {
        const repo = buildRepo([]);
        expect(isGeneratableFieldType("gint", repo, "Gtk")).toBe(true);
    });

    it("returns true for resolved boxed types regardless of fields", () => {
        const repo = buildRepo([
            createNormalizedRecord({
                name: "Bytes",
                qualifiedName: "Gtk.Bytes",
                opaque: true,
                glibTypeName: "GBytes",
            }),
        ]);
        expect(isGeneratableFieldType("Bytes", repo, "Gtk")).toBe(true);
    });

    it("returns false for opaque non-boxed records", () => {
        const repo = buildRepo([createNormalizedRecord({ name: "Mystery", opaque: true })]);
        expect(isGeneratableFieldType("Mystery", repo, "Gtk")).toBe(false);
    });

    it("returns false for disguised records", () => {
        const repo = buildRepo([createNormalizedRecord({ name: "Forward", disguised: true })]);
        expect(isGeneratableFieldType("Forward", repo, "Gtk")).toBe(false);
    });

    it("returns false when the type cannot be resolved", () => {
        const repo = buildRepo([]);
        expect(isGeneratableFieldType("Missing", repo, "Gtk")).toBe(false);
    });

    it("recurses through nested record fields and accepts a fully marshalable chain", () => {
        const inner = createNormalizedRecord({
            name: "Inner",
            qualifiedName: "Gtk.Inner",
            fields: [createNormalizedField({ name: "value", type: createNormalizedType({ name: "gint" }) })],
        });
        const outer = createNormalizedRecord({
            name: "Outer",
            qualifiedName: "Gtk.Outer",
            fields: [createNormalizedField({ name: "inner", type: createNormalizedType({ name: "Inner" }) })],
        });
        const repo = buildRepo([inner, outer]);
        expect(isGeneratableFieldType("Outer", repo, "Gtk")).toBe(true);
    });

    it("rejects when any nested field resolves to an unmarshalable type", () => {
        const inner = createNormalizedRecord({
            name: "Inner",
            qualifiedName: "Gtk.Inner",
            disguised: true,
        });
        const outer = createNormalizedRecord({
            name: "Outer",
            qualifiedName: "Gtk.Outer",
            fields: [createNormalizedField({ name: "inner", type: createNormalizedType({ name: "Inner" }) })],
        });
        const repo = buildRepo([inner, outer]);
        expect(isGeneratableFieldType("Outer", repo, "Gtk")).toBe(false);
    });

    it("breaks cycles instead of recursing forever", () => {
        const node = createNormalizedRecord({
            name: "Node",
            qualifiedName: "Gtk.Node",
            fields: [createNormalizedField({ name: "next", type: createNormalizedType({ name: "Node" }) })],
        });
        const repo = buildRepo([node]);
        expect(isGeneratableFieldType("Node", repo, "Gtk")).toBe(false);
    });
});

describe("shouldGenerateRecord", () => {
    const repoFor = (record: ReturnType<typeof createNormalizedRecord>): GirRepository => buildRepo([record]);

    it("rejects gtype-struct records", () => {
        const record = createNormalizedRecord({ name: "ObjectClass", isGtypeStructFor: "Object" });
        expect(shouldGenerateRecord(record, repoFor(record), "Gtk")).toBe(false);
    });

    it("rejects records whose name follows the *Class convention", () => {
        const record = createNormalizedRecord({ name: "WidgetClass" });
        expect(shouldGenerateRecord(record, repoFor(record), "Gtk")).toBe(false);
    });

    it("rejects records whose name follows the *Iface convention", () => {
        const record = createNormalizedRecord({ name: "OrientableIface" });
        expect(shouldGenerateRecord(record, repoFor(record), "Gtk")).toBe(false);
    });

    it("accepts boxed types even when they are opaque and have no fields", () => {
        const record = createNormalizedRecord({
            name: "Bytes",
            qualifiedName: "Gtk.Bytes",
            opaque: true,
            glibTypeName: "GBytes",
        });
        expect(shouldGenerateRecord(record, repoFor(record), "Gtk")).toBe(true);
    });

    it("rejects opaque plain structs that lack a glib type name", () => {
        const record = createNormalizedRecord({ name: "Mystery", opaque: true });
        expect(shouldGenerateRecord(record, repoFor(record), "Gtk")).toBe(false);
    });

    it("rejects plain structs with no fields", () => {
        const record = createNormalizedRecord({ name: "Empty" });
        expect(shouldGenerateRecord(record, repoFor(record), "Gtk")).toBe(false);
    });

    it("accepts plain structs whose every public field is marshalable", () => {
        const record = createNormalizedRecord({
            name: "Rectangle",
            fields: [
                createNormalizedField({ name: "x", type: createNormalizedType({ name: "gint" }) }),
                createNormalizedField({ name: "y", type: createNormalizedType({ name: "gint" }) }),
            ],
        });
        expect(shouldGenerateRecord(record, repoFor(record), "Gtk")).toBe(true);
    });

    it("rejects plain structs that contain even one unmarshalable public field", () => {
        const record = createNormalizedRecord({
            name: "Mixed",
            fields: [
                createNormalizedField({ name: "ok", type: createNormalizedType({ name: "gint" }) }),
                createNormalizedField({ name: "raw", type: createNormalizedType({ name: "gpointer" }) }),
            ],
        });
        expect(shouldGenerateRecord(record, repoFor(record), "Gtk")).toBe(false);
    });
});

describe("canAllocateRecord", () => {
    it("rejects gtype-struct records", () => {
        const record = createNormalizedRecord({
            name: "ObjectClass",
            isGtypeStructFor: "Object",
            fields: [createNormalizedField({ name: "padding", type: createNormalizedType({ name: "gint" }) })],
        });
        expect(canAllocateRecord(record)).toBe(false);
    });

    it("rejects records that have no fields", () => {
        const record = createNormalizedRecord({
            name: "Bytes",
            opaque: true,
            glibTypeName: "GBytes",
        });
        expect(canAllocateRecord(record)).toBe(false);
    });

    it("accepts boxed records that have at least one field", () => {
        const record = createNormalizedRecord({
            name: "Value",
            glibTypeName: "GValue",
            fields: [createNormalizedField({ name: "g_type", type: createNormalizedType({ name: "gsize" }) })],
        });
        expect(canAllocateRecord(record)).toBe(true);
    });

    it("rejects opaque plain structs", () => {
        const record = createNormalizedRecord({
            name: "Mystery",
            opaque: true,
            fields: [createNormalizedField({ name: "padding", type: createNormalizedType({ name: "gint" }) })],
        });
        expect(canAllocateRecord(record)).toBe(false);
    });

    it("accepts plain structs that have at least one public field", () => {
        const record = createNormalizedRecord({
            name: "Rectangle",
            fields: [
                createNormalizedField({ name: "x", type: createNormalizedType({ name: "gint" }) }),
                createNormalizedField({ name: "y", type: createNormalizedType({ name: "gint" }) }),
            ],
        });
        expect(canAllocateRecord(record)).toBe(true);
    });
});
