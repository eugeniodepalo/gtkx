import { describe, expect, it } from "vitest";
import * as Gdk from "../../src/generated/gdk/gdk.js";
import type { GType } from "../../src/generated/gobject/gobject.js";
import { typeFromName } from "../../src/generated/gobject/gobject.js";
import * as Gtk from "../../src/generated/gtk/gtk.js";
import "../../src/gobject/value.js";
import { Value } from "../../src/generated/gobject/gobject.js";
import { Type } from "../../src/gobject/types.js";
import { call } from "../../src/native.js";

const callGetType = (lib: string, fn: string): GType => call(lib, fn, [], { type: "uint64" }) as unknown as GType;
const gdkRgbaGType = (): GType => callGetType("libgtk-4.so.1", "gdk_rgba_get_type");

describe("Value factory methods", () => {
    describe("newFromBoolean", () => {
        it("creates a GValue holding true", () => {
            const v = Value.newFromBoolean(true);
            expect(v.getBoolean()).toBe(true);
        });

        it("creates a GValue holding false", () => {
            const v = Value.newFromBoolean(false);
            expect(v.getBoolean()).toBe(false);
        });
    });

    describe("newFromInt", () => {
        it("creates a GValue holding a positive integer", () => {
            const v = Value.newFromInt(42);
            expect(v.getInt()).toBe(42);
        });

        it("creates a GValue holding a negative integer", () => {
            const v = Value.newFromInt(-7);
            expect(v.getInt()).toBe(-7);
        });

        it("creates a GValue holding zero", () => {
            const v = Value.newFromInt(0);
            expect(v.getInt()).toBe(0);
        });
    });

    describe("newFromUint", () => {
        it("creates a GValue holding an unsigned integer", () => {
            const v = Value.newFromUint(255);
            expect(v.getUint()).toBe(255);
        });
    });

    describe("newFromLong", () => {
        it("creates a GValue holding a long", () => {
            const v = Value.newFromLong(100000);
            expect(v.getLong()).toBe(100000);
        });
    });

    describe("newFromUlong", () => {
        it("creates a GValue holding an unsigned long", () => {
            const v = Value.newFromUlong(200000);
            expect(v.getUlong()).toBe(200000);
        });
    });

    describe("newFromInt64", () => {
        it("creates a GValue holding a 64-bit integer", () => {
            const v = Value.newFromInt64(9007199254740991);
            expect(v.getInt64()).toBe(9007199254740991);
        });
    });

    describe("newFromUint64", () => {
        it("creates a GValue holding an unsigned 64-bit integer", () => {
            const v = Value.newFromUint64(12345678);
            expect(v.getUint64()).toBe(12345678);
        });
    });

    describe("newFromFloat", () => {
        it("creates a GValue holding a float", () => {
            const v = Value.newFromFloat(3.14);
            expect(v.getFloat()).toBeCloseTo(3.14, 2);
        });
    });

    describe("newFromDouble", () => {
        it("creates a GValue holding a double", () => {
            const v = Value.newFromDouble(Math.PI);
            expect(v.getDouble()).toBeCloseTo(Math.PI);
        });
    });

    describe("newFromString", () => {
        it("creates a GValue holding a string", () => {
            const v = Value.newFromString("hello");
            expect(v.getString()).toBe("hello");
        });

        it("creates a GValue holding null", () => {
            const v = Value.newFromString(null);
            expect(v.getString()).toBeNull();
        });

        it("creates a GValue holding an empty string", () => {
            const v = Value.newFromString("");
            expect(v.getString()).toBe("");
        });
    });

    describe("newFromObject", () => {
        it("creates a GValue holding a GObject", () => {
            const label = new Gtk.Label({ label: "test" });
            const v = Value.newFromObject(label);
            const retrieved = v.getObject();
            expect(retrieved).not.toBeNull();
        });

        it("creates a GValue holding null", () => {
            const v = Value.newFromObject(null);
            expect(v.getObject()).toBeNull();
        });
    });

    describe("newFromBoxed", () => {
        it("creates a GValue holding a boxed type", () => {
            const rgba = new (Gdk.RGBA as new (props: object) => Gdk.RGBA)({
                red: 1.0,
                green: 0.5,
                blue: 0.0,
                alpha: 1.0,
            });
            const v = Value.newFromBoxed(rgba, gdkRgbaGType());
            expect(v).not.toBeNull();
        });
    });

    describe("newFromEnum", () => {
        it("creates a GValue holding an enum", () => {
            const gtype = Type.ENUM;
            const v = Value.newFromEnum(gtype, 0);
            expect(v.getEnum()).toBe(0);
        });
    });

    describe("newFromFlags", () => {
        it("creates a GValue holding flags", () => {
            const gtype = Type.FLAGS;
            const v = Value.newFromFlags(gtype, 3);
            expect(v.getFlags()).toBe(3);
        });
    });
});

describe("Value instance methods", () => {
    describe("getType", () => {
        it("returns the GType of a string value", () => {
            const v = Value.newFromString("test");
            expect(v.getType()).toBe(Type.STRING);
        });

        it("returns the GType of a boolean value", () => {
            const v = Value.newFromBoolean(true);
            expect(v.getType()).toBe(Type.BOOLEAN);
        });

        it("returns the GType of an int value", () => {
            const v = Value.newFromInt(42);
            expect(v.getType()).toBe(Type.INT);
        });
    });

    describe("getTypeName", () => {
        it("returns 'gchararray' for a string value", () => {
            const v = Value.newFromString("test");
            expect(v.getTypeName()).toBe("gchararray");
        });

        it("returns 'gboolean' for a boolean value", () => {
            const v = Value.newFromBoolean(false);
            expect(v.getTypeName()).toBe("gboolean");
        });

        it("returns 'gint' for an int value", () => {
            const v = Value.newFromInt(0);
            expect(v.getTypeName()).toBe("gint");
        });
    });

    describe("holds", () => {
        it("returns true when value holds the specified type", () => {
            const v = Value.newFromString("test");
            expect(v.holds(Type.STRING)).toBe(true);
        });

        it("returns false when value does not hold the specified type", () => {
            const v = Value.newFromString("test");
            expect(v.holds(Type.INT)).toBe(false);
        });
    });

    describe("getBoxed", () => {
        it("returns an owned copy of the boxed value", () => {
            const rgba = new (Gdk.RGBA as new (props: object) => Gdk.RGBA)({
                red: 0.5,
                green: 0.25,
                blue: 0.75,
                alpha: 1.0,
            });
            const v = Value.newFromBoxed(rgba, gdkRgbaGType());
            const extracted = v.getBoxed(Gdk.RGBA, gdkRgbaGType());
            expect(extracted).not.toBeNull();
            expect(extracted?.red).toBeCloseTo(0.5);
            expect(extracted?.green).toBeCloseTo(0.25);
            expect(extracted?.blue).toBeCloseTo(0.75);
            expect(extracted?.alpha).toBeCloseTo(1.0);
        });
    });
});

describe("Value.fromJS / toJS round-trips", () => {
    it("round-trips a boolean", () => {
        expect(Value.fromJS(Type.BOOLEAN, true).toJS()).toBe(true);
        expect(Value.fromJS(Type.BOOLEAN, false).toJS()).toBe(false);
    });

    it("round-trips signed and unsigned integers", () => {
        expect(Value.fromJS(Type.INT, -42).toJS()).toBe(-42);
        expect(Value.fromJS(Type.UINT, 255).toJS()).toBe(255);
        expect(Value.fromJS(Type.LONG, 100_000).toJS()).toBe(100_000);
        expect(Value.fromJS(Type.ULONG, 200_000).toJS()).toBe(200_000);
        expect(Value.fromJS(Type.INT64, 9_007_199_254_740_991).toJS()).toBe(9_007_199_254_740_991);
        expect(Value.fromJS(Type.UINT64, 12_345_678).toJS()).toBe(12_345_678);
    });

    it("round-trips floats and doubles within tolerance", () => {
        expect(Value.fromJS(Type.FLOAT, 1.5).toJS() as number).toBeCloseTo(1.5, 3);
        expect(Value.fromJS(Type.DOUBLE, Math.PI).toJS() as number).toBeCloseTo(Math.PI);
    });

    it("round-trips a non-empty string", () => {
        expect(Value.fromJS(Type.STRING, "hello").toJS()).toBe("hello");
    });

    it("round-trips an empty string", () => {
        expect(Value.fromJS(Type.STRING, "").toJS()).toBe("");
    });

    it("preserves null strings as null (not empty string)", () => {
        expect(Value.fromJS(Type.STRING, null).toJS()).toBeNull();
    });

    it("round-trips a string array via GStrv", () => {
        const strvGType = typeFromName("GStrv");
        const result = Value.fromJS(strvGType, ["alpha", "beta", "gamma"]).toJS();
        expect(result).toEqual(["alpha", "beta", "gamma"]);
    });

    it("round-trips an empty string array via GStrv", () => {
        const strvGType = typeFromName("GStrv");
        const result = Value.fromJS(strvGType, []).toJS();
        expect(result).toEqual([]);
    });

    it("round-trips a null GStrv as an empty array", () => {
        const strvGType = typeFromName("GStrv");
        const result = Value.fromJS(strvGType, null).toJS();
        expect(result).toEqual([]);
    });

    it("round-trips an enum value preserving the integer payload", () => {
        const alignGType = callGetType("libgtk-4.so.1", "gtk_align_get_type");
        const result = Value.fromJS(alignGType, Gtk.Align.CENTER).toJS();
        expect(result).toBe(Gtk.Align.CENTER);
    });

    it("round-trips a flags value preserving the bitmask", () => {
        const flagsGType = callGetType("libgobject-2.0.so.0", "g_binding_flags_get_type");
        const result = Value.fromJS(flagsGType, 3).toJS();
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
        const result = Value.fromJS(rgbaGType, rgba).toJS();
        expect(result).toBeInstanceOf(Gdk.RGBA);
        expect((result as Gdk.RGBA).red).toBeCloseTo(0.5);
        expect((result as Gdk.RGBA).green).toBeCloseTo(0.25);
        expect((result as Gdk.RGBA).blue).toBeCloseTo(0.75);
        expect((result as Gdk.RGBA).alpha).toBeCloseTo(1.0);
    });

    it("round-trips a GObject reference returning the same wrapper", () => {
        const label = new Gtk.Label({ label: "hello" });
        const result = Value.fromJS(Type.OBJECT, label).toJS();
        expect(result).toBe(label);
    });

    it("round-trips a null GObject reference", () => {
        expect(Value.fromJS(Type.OBJECT, null).toJS()).toBeNull();
    });

    it("accepts null for G_TYPE_POINTER and round-trips as null", () => {
        expect(Value.fromJS(Type.POINTER, null).toJS()).toBeNull();
    });

    it("throws when fromJS is called with a non-null G_TYPE_POINTER value", () => {
        expect(() => Value.fromJS(Type.POINTER, 42)).toThrow(/G_TYPE_POINTER/);
    });

    it("getStrv returns an empty array for an unset GStrv value", () => {
        const v = new Value();
        const strvGType = typeFromName("GStrv");
        v.init(strvGType);
        expect(v.getStrv()).toEqual([]);
    });
});

describe("Value.toJS extra coverage", () => {
    it("returns null when reading a default-initialised G_TYPE_POINTER", () => {
        const v = new Value();
        v.init(Type.POINTER);
        expect(v.toJS()).toBeNull();
    });

    it("returns a Gdk.RGBA wrapper when reading a boxed value via toJS", () => {
        const rgba = new (Gdk.RGBA as new (props: object) => Gdk.RGBA)({ red: 0.1, green: 0.2, blue: 0.3, alpha: 1.0 });
        const v = Value.newFromBoxed(rgba, gdkRgbaGType());
        const out = v.toJS();
        expect(out).toBeInstanceOf(Gdk.RGBA);
    });
});

describe("Value.newFrom (FFI-type-driven factory)", () => {
    it("builds a boolean value", () => {
        const v = Value.newFrom({ type: "boolean" }, true);
        expect(v.getBoolean()).toBe(true);
    });

    it("builds a string value", () => {
        const v = Value.newFrom({ type: "string", ownership: "borrowed" }, "hi");
        expect(v.getString()).toBe("hi");
    });

    it("builds an enum value from library/getTypeFn descriptor", () => {
        const v = Value.newFrom(
            { type: "enum", library: "libgtk-4.so.1", getTypeFn: "gtk_align_get_type", signed: false },
            Gtk.Align.CENTER,
        );
        expect(v.getEnum()).toBe(Gtk.Align.CENTER);
    });

    it("builds a flags value from a flags-fundamental enum descriptor", () => {
        const v = Value.newFrom(
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
        const v = Value.newFrom(
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
        expect(Value.newFrom({ type: "int8" }, -1).getInt()).toBe(-1);
        expect(Value.newFrom({ type: "int16" }, 100).getInt()).toBe(100);
        expect(Value.newFrom({ type: "int32" }, 2000).getInt()).toBe(2000);
    });

    it("builds a uint value for uint8/uint16/uint32 descriptors", () => {
        expect(Value.newFrom({ type: "uint8" }, 1).getUint()).toBe(1);
        expect(Value.newFrom({ type: "uint16" }, 200).getUint()).toBe(200);
        expect(Value.newFrom({ type: "uint32" }, 4000).getUint()).toBe(4000);
    });

    it("builds int64 and uint64 values", () => {
        expect(Value.newFrom({ type: "int64" }, 42).getInt64()).toBe(42);
        expect(Value.newFrom({ type: "uint64" }, 84).getUint64()).toBe(84);
    });

    it("builds float and double values", () => {
        expect(Value.newFrom({ type: "float32" }, 1.5).getFloat()).toBeCloseTo(1.5, 3);
        expect(Value.newFrom({ type: "float64" }, Math.PI).getDouble()).toBeCloseTo(Math.PI);
    });

    it("builds a gobject value", () => {
        const label = new Gtk.Label({ label: "x" });
        const v = Value.newFrom({ type: "gobject", ownership: "borrowed" }, label);
        expect(v.getObject()).not.toBeNull();
    });

    it("builds a boxed value via getTypeFn resolution", () => {
        const rgba = new (Gdk.RGBA as new (props: object) => Gdk.RGBA)({ red: 0, green: 0, blue: 0, alpha: 1 });
        const v = Value.newFrom(
            {
                type: "boxed",
                ownership: "borrowed",
                innerType: "GdkRGBA",
                library: "libgtk-4.so.1",
                getTypeFn: "gdk_rgba_get_type",
            },
            rgba,
        );
        expect(v.getType()).toBe(gdkRgbaGType());
    });

    it("builds a boxed value when only innerType is provided", () => {
        const rgba = new (Gdk.RGBA as new (props: object) => Gdk.RGBA)({ red: 0, green: 0, blue: 0, alpha: 1 });
        const v = Value.newFrom({ type: "boxed", ownership: "borrowed", innerType: "GdkRGBA" }, rgba);
        expect(v.getType()).toBe(gdkRgbaGType());
    });

    it("throws for boxed types with an unresolvable innerType", () => {
        const dummy = new (Gdk.RGBA as new (props: object) => Gdk.RGBA)({ red: 0, green: 0, blue: 0, alpha: 1 });
        expect(() =>
            Value.newFrom({ type: "boxed", ownership: "borrowed", innerType: "NotARealGType" }, dummy),
        ).toThrow(/Cannot resolve gtype/);
    });

    it("builds a strv array value", () => {
        const v = Value.newFrom(
            {
                type: "array",
                kind: "array",
                ownership: "borrowed",
                itemType: { type: "string", ownership: "borrowed" },
            },
            ["one", "two"],
        );
        expect(v.getStrv()).toEqual(["one", "two"]);
    });

    it("throws for unsupported array types", () => {
        expect(() =>
            Value.newFrom(
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
            Value.newFrom(
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
        expect(() => Value.newFrom({ type: "unichar" }, 0)).toThrow(/Unsupported FFI type for GValue conversion/);
    });
});

describe("Value.fromJS extra coverage", () => {
    it("returns a null-initialised BOXED value when value is null", () => {
        const v = Value.fromJS(gdkRgbaGType(), null);
        expect(v.getType()).toBe(gdkRgbaGType());
    });

    it("returns a null-initialised BOXED value when value is undefined", () => {
        const v = Value.fromJS(gdkRgbaGType(), undefined);
        expect(v.getType()).toBe(gdkRgbaGType());
    });

    it("returns an empty GStrv value when value is null", () => {
        const strvGType = typeFromName("GStrv");
        const v = Value.fromJS(strvGType, null);
        expect(v.getStrv()).toEqual([]);
    });

    it("round-trips a signed char (G_TYPE_CHAR) through toJS", () => {
        const charGType = typeFromName("gchar");
        expect(Value.fromJS(charGType, -1).toJS()).toBe(-1);
    });

    it("round-trips an unsigned char (G_TYPE_UCHAR) through toJS", () => {
        const ucharGType = typeFromName("guchar");
        expect(Value.fromJS(ucharGType, 200).toJS()).toBe(200);
    });
});
