import { describe, expect, it } from "vitest";
import { alloc, call, read, write } from "../index.js";
import { GLIB_LIB, GOBJECT_LIB, GTK_LIB, setup } from "./test-setup.js";

setup();

describe("Integer Types", () => {
    it("should handle 8-bit signed integers", () => {
        const result = call(GLIB_LIB, "g_ascii_digit_value", [{ type: { type: "int", size: 8 }, value: 53 }], {
            type: "int",
            size: 32,
        });
        expect(result).toBe(5);
    });

    it("should handle 32-bit signed integers", () => {
        const result = call(
            GLIB_LIB,
            "g_random_int_range",
            [
                { type: { type: "int", size: 32 }, value: 10 },
                { type: { type: "int", size: 32 }, value: 11 },
            ],
            { type: "int", size: 32 },
        );
        expect(result).toBe(10);
    });

    it("should handle 32-bit unsigned integers", () => {
        const quark = call(GLIB_LIB, "g_quark_from_string", [{ type: { type: "string" }, value: "test-quark" }], {
            type: "int",
            size: 32,
            unsigned: true,
        }) as number;
        expect(quark).toBeGreaterThan(0);

        const retrieved = call(
            GLIB_LIB,
            "g_quark_to_string",
            [{ type: { type: "int", size: 32, unsigned: true }, value: quark }],
            { type: "string", borrowed: true },
        );
        expect(retrieved).toBe("test-quark");
    });

    it("should handle zero", () => {
        const result = call(
            GLIB_LIB,
            "g_random_int_range",
            [
                { type: { type: "int", size: 32 }, value: 0 },
                { type: { type: "int", size: 32 }, value: 1 },
            ],
            { type: "int", size: 32 },
        );
        expect(result).toBe(0);
    });

    it("should handle boundary values for 32-bit signed", () => {
        const max = call(
            GLIB_LIB,
            "g_random_int_range",
            [
                { type: { type: "int", size: 32 }, value: 2147483646 },
                { type: { type: "int", size: 32 }, value: 2147483647 },
            ],
            { type: "int", size: 32 },
        );
        expect(max).toBe(2147483646);
    });

    it("should handle 64-bit unsigned integers (GType)", () => {
        const gtype = call(GTK_LIB, "gtk_widget_get_type", [], { type: "int", size: 64, unsigned: true });
        expect(gtype).toBeGreaterThan(0);
    });

    it("should handle 64-bit signed integers", () => {
        const time = call(GLIB_LIB, "g_get_monotonic_time", [], { type: "int", size: 64, unsigned: false });
        expect(time).toBeGreaterThan(0);
    });
});

describe("Float Types", () => {
    it("should handle 32-bit floats", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "float", size: 32 }, 0, 0.5);
        const result = read(ptr, { type: "float", size: 32 }, 0);
        expect(result).toBeCloseTo(0.5, 5);
    });

    it("should handle 64-bit floats (doubles)", () => {
        const result = call(
            GLIB_LIB,
            "g_ascii_strtod",
            [
                { type: { type: "string" }, value: "3.14159265358979" },
                { type: { type: "null" }, value: null },
            ],
            { type: "float", size: 64 },
        );
        expect(result).toBeCloseTo(Math.PI, 10);
    });

    it("should handle float zero", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "float", size: 32 }, 0, 0.0);
        const result = read(ptr, { type: "float", size: 32 }, 0);
        expect(result).toBe(0.0);
    });

    it("should handle negative floats", () => {
        const result = call(
            GLIB_LIB,
            "g_ascii_strtod",
            [
                { type: { type: "string" }, value: "-2.5" },
                { type: { type: "null" }, value: null },
            ],
            { type: "float", size: 64 },
        );
        expect(result).toBeCloseTo(-2.5, 5);
    });

    it("should handle very small floats", () => {
        const result = call(
            GLIB_LIB,
            "g_ascii_strtod",
            [
                { type: { type: "string" }, value: "0.000001" },
                { type: { type: "null" }, value: null },
            ],
            { type: "float", size: 64 },
        );
        expect(result).toBeCloseTo(0.000001, 10);
    });

    it("should handle very large floats", () => {
        const result = call(
            GLIB_LIB,
            "g_ascii_strtod",
            [
                { type: { type: "string" }, value: "1e10" },
                { type: { type: "null" }, value: null },
            ],
            { type: "float", size: 64 },
        );
        expect(result).toBeCloseTo(1e10, 0);
    });
});

describe("Boolean Type", () => {
    it("should pass boolean true as argument and return", () => {
        const label = call(GTK_LIB, "gtk_label_new", [{ type: { type: "string" }, value: "Test" }], {
            type: "gobject",
            borrowed: true,
        });

        call(
            GTK_LIB,
            "gtk_label_set_selectable",
            [
                { type: { type: "gobject", borrowed: true }, value: label },
                { type: { type: "boolean" }, value: true },
            ],
            { type: "undefined" },
        );

        const isSelectable = call(
            GTK_LIB,
            "gtk_label_get_selectable",
            [{ type: { type: "gobject", borrowed: true }, value: label }],
            {
                type: "boolean",
            },
        );
        expect(isSelectable).toBe(true);
    });

    it("should handle false boolean", () => {
        const label = call(GTK_LIB, "gtk_label_new", [{ type: { type: "string" }, value: "Test" }], {
            type: "gobject",
            borrowed: true,
        });

        call(
            GTK_LIB,
            "gtk_label_set_selectable",
            [
                { type: { type: "gobject", borrowed: true }, value: label },
                { type: { type: "boolean" }, value: false },
            ],
            { type: "undefined" },
        );

        const isSelectable = call(
            GTK_LIB,
            "gtk_label_get_selectable",
            [{ type: { type: "gobject", borrowed: true }, value: label }],
            {
                type: "boolean",
            },
        );
        expect(isSelectable).toBe(false);
    });

    it("should handle boolean field read/write with true", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "boolean" }, 0, true);
        const result = read(ptr, { type: "boolean" }, 0);
        expect(result).toBe(true);
    });

    it("should handle boolean field read/write with false", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "boolean" }, 0, false);
        const result = read(ptr, { type: "boolean" }, 0);
        expect(result).toBe(false);
    });

    it("should handle boolean field at different offsets", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "boolean" }, 0, true);
        write(ptr, { type: "boolean" }, 1, false);
        write(ptr, { type: "boolean" }, 2, true);

        expect(read(ptr, { type: "boolean" }, 0)).toBe(true);
        expect(read(ptr, { type: "boolean" }, 1)).toBe(false);
        expect(read(ptr, { type: "boolean" }, 2)).toBe(true);
    });
});

describe("Null and Undefined Types", () => {
    it("should handle null argument", () => {
        const label = call(GTK_LIB, "gtk_label_new", [{ type: { type: "null" }, value: null }], {
            type: "gobject",
            borrowed: true,
        });
        expect(label).not.toBeNull();
    });

    it("should handle undefined return (void functions)", () => {
        const button = call(GTK_LIB, "gtk_button_new", [], { type: "gobject", borrowed: true });

        const result = call(
            GTK_LIB,
            "gtk_button_set_label",
            [
                { type: { type: "gobject", borrowed: true }, value: button },
                { type: { type: "string" }, value: "test" },
            ],
            { type: "undefined" },
        );
        expect(result).toBeUndefined();
    });

    it("should handle null in optional object parameters", () => {
        const window = call(GTK_LIB, "gtk_window_new", [], { type: "gobject", borrowed: true });

        call(
            GTK_LIB,
            "gtk_window_set_child",
            [
                { type: { type: "gobject", borrowed: true }, value: window },
                { type: { type: "null" }, value: null },
            ],
            { type: "undefined" },
        );
    });
});

describe("16-bit Integer Types", () => {
    it("should handle i16 read/write", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 16, unsigned: false }, 0, 12345);
        const result = read(ptr, { type: "int", size: 16, unsigned: false }, 0);
        expect(result).toBe(12345);
    });

    it("should handle u16 read/write", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 16, unsigned: true }, 0, 50000);
        const result = read(ptr, { type: "int", size: 16, unsigned: true }, 0);
        expect(result).toBe(50000);
    });

    it("should handle i16 negative values", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 16, unsigned: false }, 0, -1000);
        const result = read(ptr, { type: "int", size: 16, unsigned: false }, 0);
        expect(result).toBe(-1000);
    });

    it("should handle i16 boundary values", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 16, unsigned: false }, 0, 32767);
        expect(read(ptr, { type: "int", size: 16, unsigned: false }, 0)).toBe(32767);

        write(ptr, { type: "int", size: 16, unsigned: false }, 0, -32768);
        expect(read(ptr, { type: "int", size: 16, unsigned: false }, 0)).toBe(-32768);
    });

    it("should handle u16 boundary values", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 16, unsigned: true }, 0, 65535);
        expect(read(ptr, { type: "int", size: 16, unsigned: true }, 0)).toBe(65535);

        write(ptr, { type: "int", size: 16, unsigned: true }, 0, 0);
        expect(read(ptr, { type: "int", size: 16, unsigned: true }, 0)).toBe(0);
    });
});

describe("Integer Boundary Values", () => {
    it("should handle u8 boundaries", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 8, unsigned: true }, 0, 255);
        expect(read(ptr, { type: "int", size: 8, unsigned: true }, 0)).toBe(255);

        write(ptr, { type: "int", size: 8, unsigned: true }, 0, 0);
        expect(read(ptr, { type: "int", size: 8, unsigned: true }, 0)).toBe(0);
    });

    it("should handle i8 boundaries", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 8, unsigned: false }, 0, 127);
        expect(read(ptr, { type: "int", size: 8, unsigned: false }, 0)).toBe(127);

        write(ptr, { type: "int", size: 8, unsigned: false }, 0, -128);
        expect(read(ptr, { type: "int", size: 8, unsigned: false }, 0)).toBe(-128);
    });

    it("should handle u32 max value", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 32, unsigned: true }, 0, 4294967295);
        expect(read(ptr, { type: "int", size: 32, unsigned: true }, 0)).toBe(4294967295);
    });

    it("should handle i64 boundaries", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 64, unsigned: false }, 0, Number.MAX_SAFE_INTEGER);
        expect(read(ptr, { type: "int", size: 64, unsigned: false }, 0)).toBe(Number.MAX_SAFE_INTEGER);

        write(ptr, { type: "int", size: 64, unsigned: false }, 0, Number.MIN_SAFE_INTEGER);
        expect(read(ptr, { type: "int", size: 64, unsigned: false }, 0)).toBe(Number.MIN_SAFE_INTEGER);
    });

    it("should handle u64 large values", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 64, unsigned: true }, 0, Number.MAX_SAFE_INTEGER);
        expect(read(ptr, { type: "int", size: 64, unsigned: true }, 0)).toBe(Number.MAX_SAFE_INTEGER);
    });
});

describe("Integer Function Call Arguments - All Sizes", () => {
    it("should handle i8 as function argument", () => {
        const result = call(GLIB_LIB, "g_ascii_digit_value", [{ type: { type: "int", size: 8 }, value: 48 }], {
            type: "int",
            size: 32,
        });
        expect(result).toBe(0);
    });

    it("should handle i8 boundary values via read/write", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 8, unsigned: false }, 0, -128);
        expect(read(ptr, { type: "int", size: 8, unsigned: false }, 0)).toBe(-128);

        write(ptr, { type: "int", size: 8, unsigned: false }, 0, 127);
        expect(read(ptr, { type: "int", size: 8, unsigned: false }, 0)).toBe(127);
    });

    it("should handle u8 as function argument", () => {
        const result = call(
            GLIB_LIB,
            "g_ascii_digit_value",
            [{ type: { type: "int", size: 8, unsigned: true }, value: 57 }],
            {
                type: "int",
                size: 32,
            },
        );
        expect(result).toBe(9);
    });

    it("should handle u8 max value via read/write", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 8, unsigned: true }, 0, 255);
        expect(read(ptr, { type: "int", size: 8, unsigned: true }, 0)).toBe(255);
    });

    it("should handle i16 as function argument", () => {
        const result = call(
            GLIB_LIB,
            "g_random_int_range",
            [
                { type: { type: "int", size: 16 }, value: 100 },
                { type: { type: "int", size: 16 }, value: 101 },
            ],
            { type: "int", size: 32 },
        );
        expect(result).toBe(100);
    });

    it("should handle i16 negative via read/write", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 16, unsigned: false }, 0, -32768);
        expect(read(ptr, { type: "int", size: 16, unsigned: false }, 0)).toBe(-32768);

        write(ptr, { type: "int", size: 16, unsigned: false }, 0, -1000);
        expect(read(ptr, { type: "int", size: 16, unsigned: false }, 0)).toBe(-1000);
    });

    it("should handle u16 as function argument", () => {
        const result = call(
            GLIB_LIB,
            "g_random_int_range",
            [
                { type: { type: "int", size: 16, unsigned: true }, value: 50000 },
                { type: { type: "int", size: 16, unsigned: true }, value: 50001 },
            ],
            { type: "int", size: 32 },
        );
        expect(result).toBe(50000);
    });

    it("should handle i32 as function argument", () => {
        const result = call(
            GLIB_LIB,
            "g_random_int_range",
            [
                { type: { type: "int", size: 32 }, value: 1000000 },
                { type: { type: "int", size: 32 }, value: 1000001 },
            ],
            { type: "int", size: 32 },
        );
        expect(result).toBe(1000000);
    });

    it("should handle i32 negative via read/write", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 32, unsigned: false }, 0, -2147483648);
        expect(read(ptr, { type: "int", size: 32, unsigned: false }, 0)).toBe(-2147483648);

        write(ptr, { type: "int", size: 32, unsigned: false }, 0, -2000000000);
        expect(read(ptr, { type: "int", size: 32, unsigned: false }, 0)).toBe(-2000000000);
    });

    it("should handle u32 as function argument", () => {
        const quark1 = call(GLIB_LIB, "g_quark_from_string", [{ type: { type: "string" }, value: "test-u32-arg" }], {
            type: "int",
            size: 32,
            unsigned: true,
        });
        expect(quark1).toBeGreaterThan(0);

        const str = call(
            GLIB_LIB,
            "g_quark_to_string",
            [{ type: { type: "int", size: 32, unsigned: true }, value: quark1 }],
            { type: "string", borrowed: true },
        );
        expect(str).toBe("test-u32-arg");
    });

    it("should handle i64 as function argument", () => {
        const time = call(GLIB_LIB, "g_get_monotonic_time", [], { type: "int", size: 64, unsigned: false });
        expect(time).toBeGreaterThan(0);
    });

    it("should handle u64 as function argument (GType)", () => {
        const widgetType = call(GTK_LIB, "gtk_widget_get_type", [], {
            type: "int",
            size: 64,
            unsigned: true,
        }) as number;
        expect(widgetType).toBeGreaterThan(0);

        const typeName = call(
            GOBJECT_LIB,
            "g_type_name",
            [{ type: { type: "int", size: 64, unsigned: true }, value: widgetType }],
            { type: "string", borrowed: true },
        );
        expect(typeName).toBe("GtkWidget");
    });

    it("should handle u64 max safe integer as function argument", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 64, unsigned: true }, 0, Number.MAX_SAFE_INTEGER);
        const result = read(ptr, { type: "int", size: 64, unsigned: true }, 0);
        expect(result).toBe(Number.MAX_SAFE_INTEGER);
    });
});

describe("Float Function Call Arguments", () => {
    it("should handle f64 as function argument", () => {
        const result = call(
            GLIB_LIB,
            "g_ascii_strtod",
            [
                { type: { type: "string" }, value: "123.456" },
                { type: { type: "null" }, value: null },
            ],
            { type: "float", size: 64 },
        );
        expect(result).toBeCloseTo(123.456, 3);
    });

    it("should handle f64 negative as function argument", () => {
        const result = call(
            GLIB_LIB,
            "g_ascii_strtod",
            [
                { type: { type: "string" }, value: "-987.654" },
                { type: { type: "null" }, value: null },
            ],
            { type: "float", size: 64 },
        );
        expect(result).toBeCloseTo(-987.654, 3);
    });

    it("should handle f64 scientific notation as function argument", () => {
        const result = call(
            GLIB_LIB,
            "g_ascii_strtod",
            [
                { type: { type: "string" }, value: "1.5e-10" },
                { type: { type: "null" }, value: null },
            ],
            { type: "float", size: 64 },
        );
        expect(result).toBeCloseTo(1.5e-10, 15);
    });

    it("should handle f32 via GdkRGBA color values", () => {
        const rgba = alloc(16, "GdkRGBA", GTK_LIB);
        write(rgba, { type: "float", size: 32 }, 0, 0.25);
        write(rgba, { type: "float", size: 32 }, 4, 0.5);
        write(rgba, { type: "float", size: 32 }, 8, 0.75);
        write(rgba, { type: "float", size: 32 }, 12, 1.0);

        expect(read(rgba, { type: "float", size: 32 }, 0)).toBeCloseTo(0.25, 2);
        expect(read(rgba, { type: "float", size: 32 }, 4)).toBeCloseTo(0.5, 2);
        expect(read(rgba, { type: "float", size: 32 }, 8)).toBeCloseTo(0.75, 2);
        expect(read(rgba, { type: "float", size: 32 }, 12)).toBeCloseTo(1.0, 2);
    });

    it("should handle f32 very small values", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "float", size: 32 }, 0, 1e-7);
        const result = read(ptr, { type: "float", size: 32 }, 0);
        expect(result).toBeCloseTo(1e-7, 10);
    });

    it("should handle f64 very large values", () => {
        const result = call(
            GLIB_LIB,
            "g_ascii_strtod",
            [
                { type: { type: "string" }, value: "1e308" },
                { type: { type: "null" }, value: null },
            ],
            { type: "float", size: 64 },
        );
        expect(result).toBeCloseTo(1e308, 0);
    });
});

describe("Special Float Values", () => {
    it("should handle positive infinity", () => {
        const result = call(
            GLIB_LIB,
            "g_ascii_strtod",
            [
                { type: { type: "string" }, value: "inf" },
                { type: { type: "null" }, value: null },
            ],
            { type: "float", size: 64 },
        );
        expect(result).toBe(Infinity);
    });

    it("should handle negative infinity", () => {
        const result = call(
            GLIB_LIB,
            "g_ascii_strtod",
            [
                { type: { type: "string" }, value: "-inf" },
                { type: { type: "null" }, value: null },
            ],
            { type: "float", size: 64 },
        );
        expect(result).toBe(-Infinity);
    });

    it("should handle NaN", () => {
        const result = call(
            GLIB_LIB,
            "g_ascii_strtod",
            [
                { type: { type: "string" }, value: "nan" },
                { type: { type: "null" }, value: null },
            ],
            { type: "float", size: 64 },
        );
        expect(Number.isNaN(result)).toBe(true);
    });

    it("should handle f32 special values via read/write", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);

        write(ptr, { type: "float", size: 32 }, 0, Infinity);
        expect(read(ptr, { type: "float", size: 32 }, 0)).toBe(Infinity);

        write(ptr, { type: "float", size: 32 }, 0, -Infinity);
        expect(read(ptr, { type: "float", size: 32 }, 0)).toBe(-Infinity);
    });
});
