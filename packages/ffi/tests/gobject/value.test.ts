import { describe, expect, it } from "vitest";
import * as Gdk from "../../src/generated/gdk/index.js";
import { typeFromName } from "../../src/generated/gobject/functions.js";
import * as Gtk from "../../src/generated/gtk/index.js";
import "../../src/gobject/value.js";
import { Value } from "../../src/generated/gobject/value.js";
import { Type } from "../../src/gobject/types.js";
import { call } from "../../src/native.js";

const callGetType = (lib: string, fn: string): number => call(lib, fn, [], { type: "uint64" }) as number;

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
            const label = new Gtk.Label("test");
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
            const rgba = new Gdk.RGBA({ red: 1.0, green: 0.5, blue: 0.0, alpha: 1.0 });
            const v = Value.newFromBoxed(rgba);
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
            const rgba = new Gdk.RGBA({ red: 0.5, green: 0.25, blue: 0.75, alpha: 1.0 });
            const v = Value.newFromBoxed(rgba);
            const extracted = v.getBoxed(Gdk.RGBA);
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
        const rgba = new Gdk.RGBA({ red: 0.5, green: 0.25, blue: 0.75, alpha: 1.0 });
        const rgbaGType = callGetType("libgtk-4.so.1", "gdk_rgba_get_type");
        const result = Value.fromJS(rgbaGType, rgba).toJS();
        expect(result).toBeInstanceOf(Gdk.RGBA);
        expect((result as Gdk.RGBA).red).toBeCloseTo(0.5);
        expect((result as Gdk.RGBA).green).toBeCloseTo(0.25);
        expect((result as Gdk.RGBA).blue).toBeCloseTo(0.75);
        expect((result as Gdk.RGBA).alpha).toBeCloseTo(1.0);
    });

    it("round-trips a GObject reference returning the same wrapper", () => {
        const label = new Gtk.Label("hello");
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
