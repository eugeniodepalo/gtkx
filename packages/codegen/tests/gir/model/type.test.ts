import { describe, expect, it } from "vitest";
import { GirType } from "../../../src/gir/model/type.js";

function makeType(overrides: Partial<ConstructorParameters<typeof GirType>[0]> = {}): GirType {
    return new GirType({
        name: "gint",
        isArray: false,
        elementType: null,
        nullable: false,
        ...overrides,
    });
}

describe("GirType", () => {
    describe("constructor", () => {
        it("sets name, isArray, elementType, and nullable from data", () => {
            const element = makeType({ name: "gint" });
            const type = new GirType({
                name: "GLib.List",
                isArray: true,
                elementType: element,
                nullable: true,
            });

            expect(type.name).toBe("GLib.List");
            expect(type.isArray).toBe(true);
            expect(type.elementType).toBe(element);
            expect(type.nullable).toBe(true);
        });

        it("defaults typeParameters to an empty array when not provided", () => {
            const type = makeType();

            expect(type.typeParameters).toEqual([]);
        });

        it("preserves optional fields when provided", () => {
            const type = makeType({
                cType: "gint",
                containerType: "ghashtable",
                transferOwnership: "full",
                sizeParamIndex: 2,
                zeroTerminated: true,
                fixedSize: 8,
                typeParameters: [makeType({ name: "utf8" })],
            });

            expect(type.cType).toBe("gint");
            expect(type.containerType).toBe("ghashtable");
            expect(type.transferOwnership).toBe("full");
            expect(type.sizeParamIndex).toBe(2);
            expect(type.zeroTerminated).toBe(true);
            expect(type.fixedSize).toBe(8);
            expect(type.typeParameters).toHaveLength(1);
        });
    });

    describe("isIntrinsic", () => {
        it("returns true for intrinsic names", () => {
            expect(makeType({ name: "gint" }).isIntrinsic()).toBe(true);
            expect(makeType({ name: "utf8" }).isIntrinsic()).toBe(true);
        });

        it("returns false for qualified names", () => {
            expect(makeType({ name: "Gtk.Widget" }).isIntrinsic()).toBe(false);
        });
    });

    describe("isString", () => {
        it("returns true for utf8 and filename", () => {
            expect(makeType({ name: "utf8" }).isString()).toBe(true);
            expect(makeType({ name: "filename" }).isString()).toBe(true);
        });

        it("returns false for non-string types", () => {
            expect(makeType({ name: "gint" }).isString()).toBe(false);
        });
    });

    describe("isNumeric", () => {
        it("returns true for numeric intrinsics", () => {
            expect(makeType({ name: "gint" }).isNumeric()).toBe(true);
            expect(makeType({ name: "gdouble" }).isNumeric()).toBe(true);
        });

        it("returns false for non-numeric types", () => {
            expect(makeType({ name: "utf8" }).isNumeric()).toBe(false);
        });
    });

    describe("isBoolean", () => {
        it("returns true only for gboolean", () => {
            expect(makeType({ name: "gboolean" }).isBoolean()).toBe(true);
        });

        it("returns false for other types", () => {
            expect(makeType({ name: "gint" }).isBoolean()).toBe(false);
            expect(makeType({ name: "Gtk.Widget" }).isBoolean()).toBe(false);
        });
    });

    describe("isVoid", () => {
        it("returns true for void types", () => {
            expect(makeType({ name: "none" }).isVoid()).toBe(true);
        });

        it("returns false for non-void types", () => {
            expect(makeType({ name: "gint" }).isVoid()).toBe(false);
        });
    });

    describe("isVariant", () => {
        it("returns true for GVariant", () => {
            expect(makeType({ name: "GVariant" }).isVariant()).toBe(true);
        });

        it("returns false for other types", () => {
            expect(makeType({ name: "GParamSpec" }).isVariant()).toBe(false);
            expect(makeType({ name: "gint" }).isVariant()).toBe(false);
        });
    });

    describe("isParamSpec", () => {
        it("returns true for GParamSpec", () => {
            expect(makeType({ name: "GParamSpec" }).isParamSpec()).toBe(true);
        });

        it("returns false for other types", () => {
            expect(makeType({ name: "GVariant" }).isParamSpec()).toBe(false);
            expect(makeType({ name: "gint" }).isParamSpec()).toBe(false);
        });
    });

    describe("container predicates", () => {
        it("isHashTable returns true only for ghashtable container", () => {
            expect(makeType({ containerType: "ghashtable" }).isHashTable()).toBe(true);
            expect(makeType({ containerType: "garray" }).isHashTable()).toBe(false);
            expect(makeType({}).isHashTable()).toBe(false);
        });

        it("isPtrArray returns true only for gptrarray container", () => {
            expect(makeType({ containerType: "gptrarray" }).isPtrArray()).toBe(true);
            expect(makeType({ containerType: "garray" }).isPtrArray()).toBe(false);
            expect(makeType({}).isPtrArray()).toBe(false);
        });

        it("isGArray returns true only for garray container", () => {
            expect(makeType({ containerType: "garray" }).isGArray()).toBe(true);
            expect(makeType({ containerType: "gptrarray" }).isGArray()).toBe(false);
            expect(makeType({}).isGArray()).toBe(false);
        });

        it("isByteArray returns true only for gbytearray container", () => {
            expect(makeType({ containerType: "gbytearray" }).isByteArray()).toBe(true);
            expect(makeType({ containerType: "garray" }).isByteArray()).toBe(false);
            expect(makeType({}).isByteArray()).toBe(false);
        });

        it("isList returns true for glist and gslist", () => {
            expect(makeType({ containerType: "glist" }).isList()).toBe(true);
            expect(makeType({ containerType: "gslist" }).isList()).toBe(true);
            expect(makeType({ containerType: "garray" }).isList()).toBe(false);
            expect(makeType({}).isList()).toBe(false);
        });

        it("isGenericContainer returns true when containerType is defined", () => {
            expect(makeType({ containerType: "ghashtable" }).isGenericContainer()).toBe(true);
            expect(makeType({ containerType: "garray" }).isGenericContainer()).toBe(true);
            expect(makeType({}).isGenericContainer()).toBe(false);
        });
    });

    describe("getKeyType", () => {
        it("returns the first type parameter for a hashtable", () => {
            const key = makeType({ name: "utf8" });
            const value = makeType({ name: "gint" });
            const type = makeType({
                name: "GLib.HashTable",
                containerType: "ghashtable",
                typeParameters: [key, value],
            });

            expect(type.getKeyType()).toBe(key);
        });

        it("returns null when the container is not a hashtable", () => {
            const type = makeType({
                containerType: "garray",
                typeParameters: [makeType({ name: "utf8" })],
            });

            expect(type.getKeyType()).toBeNull();
        });

        it("returns null when the hashtable has no type parameters", () => {
            const type = makeType({
                containerType: "ghashtable",
                typeParameters: [],
            });

            expect(type.getKeyType()).toBeNull();
        });
    });

    describe("getValueType", () => {
        it("returns the second type parameter for a hashtable", () => {
            const key = makeType({ name: "utf8" });
            const value = makeType({ name: "gint" });
            const type = makeType({
                name: "GLib.HashTable",
                containerType: "ghashtable",
                typeParameters: [key, value],
            });

            expect(type.getValueType()).toBe(value);
        });

        it("returns null when the container is not a hashtable", () => {
            const type = makeType({
                containerType: "garray",
                typeParameters: [makeType({ name: "utf8" }), makeType({ name: "gint" })],
            });

            expect(type.getValueType()).toBeNull();
        });

        it("returns null when the hashtable has fewer than two type parameters", () => {
            const type = makeType({
                containerType: "ghashtable",
                typeParameters: [makeType({ name: "utf8" })],
            });

            expect(type.getValueType()).toBeNull();
        });
    });

    describe("getNamespace", () => {
        it("returns the namespace portion of a qualified name", () => {
            const type = makeType({ name: "Gtk.Widget" });
            expect(type.getNamespace()).toBe("Gtk");
        });

        it("returns null for intrinsic types", () => {
            expect(makeType({ name: "gint" }).getNamespace()).toBeNull();
        });

        it("returns null when the name has no namespace separator", () => {
            const type = makeType({ name: "Widget" });
            expect(type.getNamespace()).toBeNull();
        });
    });

    describe("getSimpleName", () => {
        it("returns the unqualified name portion for a qualified name", () => {
            const type = makeType({ name: "Gtk.Widget" });
            expect(type.getSimpleName()).toBe("Widget");
        });

        it("returns the full name for intrinsic types", () => {
            expect(makeType({ name: "gint" }).getSimpleName()).toBe("gint");
        });

        it("returns the original name when there is no namespace separator", () => {
            expect(makeType({ name: "Widget" }).getSimpleName()).toBe("Widget");
        });
    });
});
