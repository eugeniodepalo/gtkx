import { describe, expect, it } from "vitest";
import * as Gdk from "../../src/generated/gdk/gdk.js";
import type { GType } from "../../src/generated/gobject/gobject.js";
import { typeFromName, Value } from "../../src/generated/gobject/gobject.js";
import * as Gtk from "../../src/generated/gtk/gtk.js";
import { Type } from "../../src/gobject/types.js";
import { call } from "../../src/native.js";
import {
    valueFromBoolean,
    valueFromBoxed,
    valueFromDouble,
    valueFromEnum,
    valueFromFfi,
    valueFromFlags,
    valueFromFloat,
    valueFromInt,
    valueFromInt64,
    valueFromJS,
    valueFromLong,
    valueFromObject,
    valueFromString,
    valueFromUint,
    valueFromUint64,
    valueFromUlong,
    valueGetBoxed,
    valueGetStrv,
    valueGetType,
    valueGetTypeName,
    valueHolds,
    valueToJS,
} from "../../src/value-marshal.js";

const callGetType = (lib: string, fn: string): GType => call(lib, fn, [], { type: "uint64" }) as unknown as GType;
const gdkRgbaGType = (): GType => callGetType("libgtk-4.so.1", "gdk_rgba_get_type");

describe("value-marshal factory functions", () => {
    describe("valueFromBoolean", () => {
        it("creates a GValue holding true", () => {
            const v = valueFromBoolean(true);
            expect(v.getBoolean()).toBe(true);
        });

        it("creates a GValue holding false", () => {
            const v = valueFromBoolean(false);
            expect(v.getBoolean()).toBe(false);
        });
    });

    describe("valueFromInt", () => {
        it("creates a GValue holding a positive integer", () => {
            const v = valueFromInt(42);
            expect(v.getInt()).toBe(42);
        });

        it("creates a GValue holding a negative integer", () => {
            const v = valueFromInt(-7);
            expect(v.getInt()).toBe(-7);
        });

        it("creates a GValue holding zero", () => {
            const v = valueFromInt(0);
            expect(v.getInt()).toBe(0);
        });
    });

    describe("valueFromUint", () => {
        it("creates a GValue holding an unsigned integer", () => {
            const v = valueFromUint(255);
            expect(v.getUint()).toBe(255);
        });
    });

    describe("valueFromLong", () => {
        it("creates a GValue holding a long", () => {
            const v = valueFromLong(100000);
            expect(v.getLong()).toBe(100000);
        });
    });

    describe("valueFromUlong", () => {
        it("creates a GValue holding an unsigned long", () => {
            const v = valueFromUlong(200000);
            expect(v.getUlong()).toBe(200000);
        });
    });

    describe("valueFromInt64", () => {
        it("creates a GValue holding a 64-bit integer", () => {
            const v = valueFromInt64(9007199254740991);
            expect(v.getInt64()).toBe(9007199254740991);
        });
    });

    describe("valueFromUint64", () => {
        it("creates a GValue holding an unsigned 64-bit integer", () => {
            const v = valueFromUint64(12345678);
            expect(v.getUint64()).toBe(12345678);
        });
    });

    describe("valueFromFloat", () => {
        it("creates a GValue holding a float", () => {
            const v = valueFromFloat(3.14);
            expect(v.getFloat()).toBeCloseTo(3.14, 2);
        });
    });

    describe("valueFromDouble", () => {
        it("creates a GValue holding a double", () => {
            const v = valueFromDouble(Math.PI);
            expect(v.getDouble()).toBeCloseTo(Math.PI);
        });
    });

    describe("valueFromString", () => {
        it("creates a GValue holding a string", () => {
            const v = valueFromString("hello");
            expect(v.getString()).toBe("hello");
        });

        it("creates a GValue holding null", () => {
            const v = valueFromString(null);
            expect(v.getString()).toBeNull();
        });

        it("creates a GValue holding an empty string", () => {
            const v = valueFromString("");
            expect(v.getString()).toBe("");
        });
    });

    describe("valueFromObject", () => {
        it("creates a GValue holding a GObject", () => {
            const label = new Gtk.Label({ label: "test" });
            const v = valueFromObject(label);
            const retrieved = v.getObject();
            expect(retrieved).not.toBeNull();
        });

        it("creates a GValue holding null", () => {
            const v = valueFromObject(null);
            expect(v.getObject()).toBeNull();
        });
    });

    describe("valueFromBoxed", () => {
        it("creates a GValue holding a boxed type", () => {
            const rgba = new (Gdk.RGBA as new (props: object) => Gdk.RGBA)({
                red: 1.0,
                green: 0.5,
                blue: 0.0,
                alpha: 1.0,
            });
            const v = valueFromBoxed(rgba, gdkRgbaGType());
            expect(v).not.toBeNull();
        });
    });

    describe("valueFromEnum", () => {
        it("creates a GValue holding an enum", () => {
            const gtype = Type.ENUM;
            const v = valueFromEnum(gtype, 0);
            expect(v.getEnum()).toBe(0);
        });
    });

    describe("valueFromFlags", () => {
        it("creates a GValue holding flags", () => {
            const gtype = Type.FLAGS;
            const v = valueFromFlags(gtype, 3);
            expect(v.getFlags()).toBe(3);
        });
    });
});

describe("value-marshal accessor functions", () => {
    describe("valueGetType", () => {
        it("returns the GType of a string value", () => {
            const v = valueFromString("test");
            expect(valueGetType(v)).toBe(Type.STRING);
        });

        it("returns the GType of a boolean value", () => {
            const v = valueFromBoolean(true);
            expect(valueGetType(v)).toBe(Type.BOOLEAN);
        });

        it("returns the GType of an int value", () => {
            const v = valueFromInt(42);
            expect(valueGetType(v)).toBe(Type.INT);
        });
    });

    describe("valueGetTypeName", () => {
        it("returns 'gchararray' for a string value", () => {
            const v = valueFromString("test");
            expect(valueGetTypeName(v)).toBe("gchararray");
        });

        it("returns 'gboolean' for a boolean value", () => {
            const v = valueFromBoolean(false);
            expect(valueGetTypeName(v)).toBe("gboolean");
        });

        it("returns 'gint' for an int value", () => {
            const v = valueFromInt(0);
            expect(valueGetTypeName(v)).toBe("gint");
        });
    });

    describe("valueHolds", () => {
        it("returns true when value holds the specified type", () => {
            const v = valueFromString("test");
            expect(valueHolds(v, Type.STRING)).toBe(true);
        });

        it("returns false when value does not hold the specified type", () => {
            const v = valueFromString("test");
            expect(valueHolds(v, Type.INT)).toBe(false);
        });
    });

    describe("valueGetBoxed", () => {
        it("returns an owned copy of the boxed value", () => {
            const rgba = new (Gdk.RGBA as new (props: object) => Gdk.RGBA)({
                red: 0.5,
                green: 0.25,
                blue: 0.75,
                alpha: 1.0,
            });
            const v = valueFromBoxed(rgba, gdkRgbaGType());
            const extracted = valueGetBoxed(v, Gdk.RGBA, gdkRgbaGType());
            expect(extracted).not.toBeNull();
            expect(extracted?.red).toBeCloseTo(0.5);
            expect(extracted?.green).toBeCloseTo(0.25);
            expect(extracted?.blue).toBeCloseTo(0.75);
            expect(extracted?.alpha).toBeCloseTo(1.0);
        });
    });
});

describe("valueFromJS / valueToJS round-trips", () => {
    it("round-trips a boolean", () => {
        expect(valueToJS(valueFromJS(Type.BOOLEAN, true))).toBe(true);
        expect(valueToJS(valueFromJS(Type.BOOLEAN, false))).toBe(false);
    });

    it("round-trips signed and unsigned integers", () => {
        expect(valueToJS(valueFromJS(Type.INT, -42))).toBe(-42);
        expect(valueToJS(valueFromJS(Type.UINT, 255))).toBe(255);
        expect(valueToJS(valueFromJS(Type.LONG, 100_000))).toBe(100_000);
        expect(valueToJS(valueFromJS(Type.ULONG, 200_000))).toBe(200_000);
        expect(valueToJS(valueFromJS(Type.INT64, 9_007_199_254_740_991))).toBe(9_007_199_254_740_991);
        expect(valueToJS(valueFromJS(Type.UINT64, 12_345_678))).toBe(12_345_678);
    });

    it("round-trips floats and doubles within tolerance", () => {
        expect(valueToJS(valueFromJS(Type.FLOAT, 1.5)) as number).toBeCloseTo(1.5, 3);
        expect(valueToJS(valueFromJS(Type.DOUBLE, Math.PI)) as number).toBeCloseTo(Math.PI);
    });

    it("round-trips a non-empty string", () => {
        expect(valueToJS(valueFromJS(Type.STRING, "hello"))).toBe("hello");
    });

    it("round-trips an empty string", () => {
        expect(valueToJS(valueFromJS(Type.STRING, ""))).toBe("");
    });

    it("preserves null strings as null (not empty string)", () => {
        expect(valueToJS(valueFromJS(Type.STRING, null))).toBeNull();
    });

    it("round-trips a string array via GStrv", () => {
        const strvGType = typeFromName("GStrv");
        const result = valueToJS(valueFromJS(strvGType, ["alpha", "beta", "gamma"]));
        expect(result).toEqual(["alpha", "beta", "gamma"]);
    });

    it("round-trips an empty string array via GStrv", () => {
        const strvGType = typeFromName("GStrv");
        const result = valueToJS(valueFromJS(strvGType, []));
        expect(result).toEqual([]);
    });

    it("round-trips a null GStrv as an empty array", () => {
        const strvGType = typeFromName("GStrv");
        const result = valueToJS(valueFromJS(strvGType, null));
        expect(result).toEqual([]);
    });

    it("round-trips an enum value preserving the integer payload", () => {
        const alignGType = callGetType("libgtk-4.so.1", "gtk_align_get_type");
        const result = valueToJS(valueFromJS(alignGType, Gtk.Align.CENTER));
        expect(result).toBe(Gtk.Align.CENTER);
    });

    it("round-trips a flags value preserving the bitmask", () => {
        const flagsGType = callGetType("libgobject-2.0.so.0", "g_binding_flags_get_type");
        const result = valueToJS(valueFromJS(flagsGType, 3));
        expect(result).toBe(3);
    });

    it("round-trips a boxed value resolving the registered wrapper class", () => {
        const rgba = new (Gdk.RGBA as new (props: object) => Gdk.RGBA)({
            red: 0.5,
            green: 0.25,
            blue: 0.75,
            alpha: 1.0,
        });
        const rgbaGType = callGetType("libgtk-4.so.1", "gdk_rgba_get_type");
        const result = valueToJS(valueFromJS(rgbaGType, rgba));
        expect(result).toBeInstanceOf(Gdk.RGBA);
        expect((result as Gdk.RGBA).red).toBeCloseTo(0.5);
        expect((result as Gdk.RGBA).green).toBeCloseTo(0.25);
        expect((result as Gdk.RGBA).blue).toBeCloseTo(0.75);
        expect((result as Gdk.RGBA).alpha).toBeCloseTo(1.0);
    });

    it("round-trips a GObject reference returning the same wrapper", () => {
        const label = new Gtk.Label({ label: "hello" });
        const result = valueToJS(valueFromJS(Type.OBJECT, label));
        expect(result).toBe(label);
    });

    it("round-trips a null GObject reference", () => {
        expect(valueToJS(valueFromJS(Type.OBJECT, null))).toBeNull();
    });

    it("accepts null for G_TYPE_POINTER and round-trips as null", () => {
        expect(valueToJS(valueFromJS(Type.POINTER, null))).toBeNull();
    });

    it("throws when valueFromJS is called with a non-null G_TYPE_POINTER value", () => {
        expect(() => valueFromJS(Type.POINTER, 42)).toThrow(/G_TYPE_POINTER/);
    });

    it("valueGetStrv returns an empty array for an unset GStrv value", () => {
        const v = new Value();
        const strvGType = typeFromName("GStrv");
        v.init(strvGType);
        expect(valueGetStrv(v)).toEqual([]);
    });
});

describe("valueToJS extra coverage", () => {
    it("returns null when reading a default-initialised G_TYPE_POINTER", () => {
        const v = new Value();
        v.init(Type.POINTER);
        expect(valueToJS(v)).toBeNull();
    });

    it("returns a Gdk.RGBA wrapper when reading a boxed value via valueToJS", () => {
        const rgba = new (Gdk.RGBA as new (props: object) => Gdk.RGBA)({ red: 0.1, green: 0.2, blue: 0.3, alpha: 1.0 });
        const v = valueFromBoxed(rgba, gdkRgbaGType());
        const out = valueToJS(v);
        expect(out).toBeInstanceOf(Gdk.RGBA);
    });
});

describe("valueFromFfi (FFI-type-driven factory)", () => {
    it("builds a boolean value", () => {
        const v = valueFromFfi({ type: "boolean" }, true);
        expect(v.getBoolean()).toBe(true);
    });

    it("builds a string value", () => {
        const v = valueFromFfi({ type: "string", ownership: "borrowed" }, "hi");
        expect(v.getString()).toBe("hi");
    });

    it("builds an enum value from library/getTypeFn descriptor", () => {
        const v = valueFromFfi(
            { type: "enum", library: "libgtk-4.so.1", getTypeFn: "gtk_align_get_type", signed: false },
            Gtk.Align.CENTER,
        );
        expect(v.getEnum()).toBe(Gtk.Align.CENTER);
    });

    it("builds a flags value from a flags-fundamental enum descriptor", () => {
        const v = valueFromFfi(
            {
                type: "enum",
                library: "libgobject-2.0.so.0",
                getTypeFn: "g_binding_flags_get_type",
                signed: false,
            },
            3,
        );
        expect(v.getFlags()).toBe(3);
    });

    it("builds a flags value from a flags descriptor", () => {
        const v = valueFromFfi(
            {
                type: "flags",
                library: "libgobject-2.0.so.0",
                getTypeFn: "g_binding_flags_get_type",
                signed: false,
            },
            5,
        );
        expect(v.getFlags()).toBe(5);
    });

    it("builds an int value for int8/int16/int32 descriptors", () => {
        expect(valueFromFfi({ type: "int8" }, -1).getInt()).toBe(-1);
        expect(valueFromFfi({ type: "int16" }, 100).getInt()).toBe(100);
        expect(valueFromFfi({ type: "int32" }, 2000).getInt()).toBe(2000);
    });

    it("builds a uint value for uint8/uint16/uint32 descriptors", () => {
        expect(valueFromFfi({ type: "uint8" }, 1).getUint()).toBe(1);
        expect(valueFromFfi({ type: "uint16" }, 200).getUint()).toBe(200);
        expect(valueFromFfi({ type: "uint32" }, 4000).getUint()).toBe(4000);
    });

    it("builds int64 and uint64 values", () => {
        expect(valueFromFfi({ type: "int64" }, 42).getInt64()).toBe(42);
        expect(valueFromFfi({ type: "uint64" }, 84).getUint64()).toBe(84);
    });

    it("builds float and double values", () => {
        expect(valueFromFfi({ type: "float32" }, 1.5).getFloat()).toBeCloseTo(1.5, 3);
        expect(valueFromFfi({ type: "float64" }, Math.PI).getDouble()).toBeCloseTo(Math.PI);
    });

    it("builds a gobject value", () => {
        const label = new Gtk.Label({ label: "x" });
        const v = valueFromFfi({ type: "gobject", ownership: "borrowed" }, label);
        expect(v.getObject()).not.toBeNull();
    });

    it("builds a boxed value via getTypeFn resolution", () => {
        const rgba = new (Gdk.RGBA as new (props: object) => Gdk.RGBA)({ red: 0, green: 0, blue: 0, alpha: 1 });
        const v = valueFromFfi(
            {
                type: "boxed",
                ownership: "borrowed",
                innerType: "GdkRGBA",
                library: "libgtk-4.so.1",
                getTypeFn: "gdk_rgba_get_type",
            },
            rgba,
        );
        expect(valueGetType(v)).toBe(gdkRgbaGType());
    });

    it("builds a boxed value when only innerType is provided", () => {
        const rgba = new (Gdk.RGBA as new (props: object) => Gdk.RGBA)({ red: 0, green: 0, blue: 0, alpha: 1 });
        const v = valueFromFfi({ type: "boxed", ownership: "borrowed", innerType: "GdkRGBA" }, rgba);
        expect(valueGetType(v)).toBe(gdkRgbaGType());
    });

    it("throws for boxed types with an unresolvable innerType", () => {
        const dummy = new (Gdk.RGBA as new (props: object) => Gdk.RGBA)({ red: 0, green: 0, blue: 0, alpha: 1 });
        expect(() => valueFromFfi({ type: "boxed", ownership: "borrowed", innerType: "NotARealGType" }, dummy)).toThrow(
            /Cannot resolve gtype/,
        );
    });

    it("builds a strv array value", () => {
        const v = valueFromFfi(
            {
                type: "array",
                kind: "array",
                ownership: "borrowed",
                itemType: { type: "string", ownership: "borrowed" },
            },
            ["one", "two"],
        );
        expect(valueGetStrv(v)).toEqual(["one", "two"]);
    });

    it("throws for unsupported array types", () => {
        expect(() =>
            valueFromFfi(
                {
                    type: "array",
                    kind: "glist",
                    ownership: "borrowed",
                    itemType: { type: "string", ownership: "borrowed" },
                },
                ["x"],
            ),
        ).toThrow(/Unsupported array type/);
    });

    it("throws for fundamental types without a typeName", () => {
        const dummy = new (Gdk.RGBA as new (props: object) => Gdk.RGBA)({ red: 0, green: 0, blue: 0, alpha: 1 });
        expect(() =>
            valueFromFfi(
                {
                    type: "fundamental",
                    ownership: "borrowed",
                    library: "libgobject-2.0.so.0",
                    refFn: "g_object_ref",
                    unrefFn: "g_object_unref",
                },
                dummy,
            ),
        ).toThrow(/Cannot resolve gtype for fundamental/);
    });

    it("throws for unsupported FFI types", () => {
        expect(() => valueFromFfi({ type: "unichar" }, 0)).toThrow(/Unsupported FFI type for GValue conversion/);
    });
});

describe("valueFromJS extra coverage", () => {
    it("returns a null-initialised BOXED value when value is null", () => {
        const v = valueFromJS(gdkRgbaGType(), null);
        expect(valueGetType(v)).toBe(gdkRgbaGType());
    });

    it("returns a null-initialised BOXED value when value is undefined", () => {
        const v = valueFromJS(gdkRgbaGType(), undefined);
        expect(valueGetType(v)).toBe(gdkRgbaGType());
    });

    it("returns an empty GStrv value when value is null", () => {
        const strvGType = typeFromName("GStrv");
        const v = valueFromJS(strvGType, null);
        expect(valueGetStrv(v)).toEqual([]);
    });

    it("round-trips a signed char (G_TYPE_CHAR) through valueToJS", () => {
        const charGType = typeFromName("gchar");
        expect(valueToJS(valueFromJS(charGType, -1))).toBe(-1);
    });

    it("round-trips an unsigned char (G_TYPE_UCHAR) through valueToJS", () => {
        const ucharGType = typeFromName("guchar");
        expect(valueToJS(valueFromJS(ucharGType, 200))).toBe(200);
    });
});
