import { describe, expect, it } from "vitest";
import { GirEnumeration, GirEnumerationMember } from "../src/model/enumeration.js";
import { GirProperty, parseDefaultValue } from "../src/model/property.js";
import { GirRecord } from "../src/model/record.js";
import { GirType } from "../src/model/type.js";

describe("GirType", () => {
    it("detects intrinsic types", () => {
        const type = new GirType({ name: "gint", isArray: false, elementType: null, nullable: false });
        expect(type.isIntrinsic()).toBe(true);
        expect(type.isNumeric()).toBe(true);
    });

    it("detects string types", () => {
        const type = new GirType({ name: "utf8", isArray: false, elementType: null, nullable: false });
        expect(type.isString()).toBe(true);
        expect(type.isIntrinsic()).toBe(true);
    });

    it("detects void types", () => {
        const type = new GirType({ name: "void", isArray: false, elementType: null, nullable: false });
        expect(type.isVoid()).toBe(true);
    });

    it("detects boolean types", () => {
        const type = new GirType({ name: "gboolean", isArray: false, elementType: null, nullable: false });
        expect(type.isBoolean()).toBe(true);
    });

    it("detects qualified types", () => {
        const type = new GirType({ name: "Gtk.Widget", isArray: false, elementType: null, nullable: false });
        expect(type.isIntrinsic()).toBe(false);
        expect(type.getNamespace()).toBe("Gtk");
        expect(type.getSimpleName()).toBe("Widget");
    });

    it("detects container types", () => {
        const type = new GirType({
            name: "GLib.HashTable",
            isArray: false,
            elementType: null,
            nullable: false,
            containerType: "ghashtable",
        });
        expect(type.isHashTable()).toBe(true);
        expect(type.isGenericContainer()).toBe(true);
    });

    it("detects list types", () => {
        const type = new GirType({
            name: "array",
            isArray: true,
            elementType: null,
            nullable: false,
            containerType: "glist",
        });
        expect(type.isList()).toBe(true);
        expect(type.isGenericContainer()).toBe(true);
    });
});

describe("GirEnumeration", () => {
    const makeEnum = () =>
        new GirEnumeration({
            name: "Orientation",
            qualifiedName: "Gtk.Orientation",
            cType: "GtkOrientation",
            members: [
                new GirEnumerationMember({ name: "horizontal", value: "0", cIdentifier: "GTK_ORIENTATION_HORIZONTAL" }),
                new GirEnumerationMember({ name: "vertical", value: "1", cIdentifier: "GTK_ORIENTATION_VERTICAL" }),
            ],
        });

    it("finds member by name", () => {
        const e = makeEnum();
        expect(e.getMember("horizontal")?.value).toBe("0");
        expect(e.getMember("unknown")).toBeNull();
    });

    it("finds member by value", () => {
        const e = makeEnum();
        expect(e.getMemberByValue("1")?.name).toBe("vertical");
    });

    it("gets member names", () => {
        const e = makeEnum();
        expect(e.getMemberNames()).toEqual(["horizontal", "vertical"]);
    });
});

describe("GirRecord", () => {
    it("detects boxed records", () => {
        const record = new GirRecord({
            name: "Rectangle",
            qualifiedName: "Gdk.Rectangle",
            cType: "GdkRectangle",
            opaque: false,
            disguised: false,
            glibTypeName: "GdkRectangle",
            glibGetType: "gdk_rectangle_get_type",
            fields: [],
            methods: [],
            constructors: [],
            staticFunctions: [],
        });
        expect(record.isBoxed()).toBe(true);
    });

    it("detects plain structs", async () => {
        const { GirField } = await import("../src/model/field.js");
        const record = new GirRecord({
            name: "Point",
            qualifiedName: "Gdk.Point",
            cType: "GdkPoint",
            opaque: false,
            disguised: false,
            fields: [
                new GirField({
                    name: "x",
                    type: new GirType({ name: "gint", isArray: false, elementType: null, nullable: false }),
                    writable: true,
                    readable: true,
                    private: false,
                }),
            ],
            methods: [],
            constructors: [],
            staticFunctions: [],
        });
        expect(record.isPlainStruct()).toBe(true);
        expect(record.isBoxed()).toBe(false);
    });
});

describe("GirProperty", () => {
    it("detects read-only properties", () => {
        const prop = new GirProperty({
            name: "test",
            type: new GirType({ name: "gint", isArray: false, elementType: null, nullable: false }),
            readable: true,
            writable: false,
            constructOnly: false,
            defaultValue: null,
        });
        expect(prop.isReadOnly()).toBe(true);
        expect(prop.isWriteOnly()).toBe(false);
    });

    it("detects construct-only properties", () => {
        const prop = new GirProperty({
            name: "test",
            type: new GirType({ name: "gint", isArray: false, elementType: null, nullable: false }),
            readable: true,
            writable: true,
            constructOnly: true,
            defaultValue: null,
        });
        expect(prop.isConstructOnly()).toBe(true);
    });
});

describe("parseDefaultValue", () => {
    it("parses NULL", () => {
        expect(parseDefaultValue("NULL")).toEqual({ kind: "null" });
    });

    it("parses booleans", () => {
        expect(parseDefaultValue("TRUE")).toEqual({ kind: "boolean", value: true });
        expect(parseDefaultValue("FALSE")).toEqual({ kind: "boolean", value: false });
    });

    it("parses numbers", () => {
        expect(parseDefaultValue("42")).toEqual({ kind: "number", value: 42 });
        expect(parseDefaultValue("0")).toEqual({ kind: "number", value: 0 });
    });

    it("parses strings", () => {
        expect(parseDefaultValue('"hello"')).toEqual({ kind: "string", value: "hello" });
    });

    it("parses enum identifiers", () => {
        expect(parseDefaultValue("GTK_ORIENTATION_HORIZONTAL")).toEqual({
            kind: "enum",
            cIdentifier: "GTK_ORIENTATION_HORIZONTAL",
        });
    });

    it("returns null for undefined", () => {
        expect(parseDefaultValue(undefined)).toBeNull();
    });
});
