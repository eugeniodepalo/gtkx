import { describe, expect, it } from "vitest";
import { alloc, call, createRef, read, write } from "../index.js";
import { GDK_LIB, GLIB_LIB, GTK_LIB, setup } from "./test-setup.js";

setup();

describe("Ref with Primitive Types", () => {
    it("should handle Ref<i32> out parameters", () => {
        const widthRef = createRef(0);
        const heightRef = createRef(0);

        const window = call(GTK_LIB, "gtk_window_new", [], { type: "gobject", borrowed: true });

        call(
            GTK_LIB,
            "gtk_window_set_default_size",
            [
                { type: { type: "gobject", borrowed: true }, value: window },
                { type: { type: "int", size: 32, unsigned: false }, value: 800 },
                { type: { type: "int", size: 32, unsigned: false }, value: 600 },
            ],
            { type: "undefined" },
        );

        call(
            GTK_LIB,
            "gtk_window_get_default_size",
            [
                { type: { type: "gobject", borrowed: true }, value: window },
                {
                    type: { type: "ref", innerType: { type: "int", size: 32, unsigned: false } },
                    value: widthRef,
                },
                {
                    type: { type: "ref", innerType: { type: "int", size: 32, unsigned: false } },
                    value: heightRef,
                },
            ],
            { type: "undefined" },
        );

        expect(widthRef.value).toBe(800);
        expect(heightRef.value).toBe(600);
    });

    it("should handle Ref with negative values", () => {
        const window = call(GTK_LIB, "gtk_window_new", [], { type: "gobject", borrowed: true });

        call(
            GTK_LIB,
            "gtk_window_set_default_size",
            [
                { type: { type: "gobject", borrowed: true }, value: window },
                { type: { type: "int", size: 32, unsigned: false }, value: -1 },
                { type: { type: "int", size: 32, unsigned: false }, value: -1 },
            ],
            { type: "undefined" },
        );

        const widthRef = createRef(0);
        const heightRef = createRef(0);

        call(
            GTK_LIB,
            "gtk_window_get_default_size",
            [
                { type: { type: "gobject", borrowed: true }, value: window },
                { type: { type: "ref", innerType: { type: "int", size: 32, unsigned: false } }, value: widthRef },
                { type: { type: "ref", innerType: { type: "int", size: 32, unsigned: false } }, value: heightRef },
            ],
            { type: "undefined" },
        );

        expect(widthRef.value).toBe(-1);
        expect(heightRef.value).toBe(-1);
    });
});

describe("Ref with GError (pointer-to-pointer)", () => {
    it("should handle GError** out parameters when error occurs", () => {
        const keyFile = call(GLIB_LIB, "g_key_file_new", [], {
            type: "boxed",
            borrowed: true,
            innerType: "GKeyFile",
            lib: GLIB_LIB,
        });

        const errorRef = createRef(null);

        const result = call(
            GLIB_LIB,
            "g_key_file_load_from_file",
            [
                { type: { type: "boxed", innerType: "GKeyFile", lib: GLIB_LIB, borrowed: true }, value: keyFile },
                { type: { type: "string" }, value: "/nonexistent/file/that/does/not/exist.ini" },
                { type: { type: "int", size: 32, unsigned: false }, value: 0 },
                {
                    type: {
                        type: "ref",
                        innerType: {
                            type: "boxed",
                            innerType: "GError",
                            lib: GLIB_LIB,
                        },
                    },
                    value: errorRef,
                },
            ],
            { type: "boolean" },
        );

        expect(result).toBe(false);
        expect(errorRef.value).not.toBeNull();
    });

    it("should handle GError** out parameters when no error occurs", () => {
        const keyFile = call(GLIB_LIB, "g_key_file_new", [], {
            type: "boxed",
            borrowed: true,
            innerType: "GKeyFile",
            lib: GLIB_LIB,
        });

        call(
            GLIB_LIB,
            "g_key_file_set_string",
            [
                { type: { type: "boxed", innerType: "GKeyFile", lib: GLIB_LIB, borrowed: true }, value: keyFile },
                { type: { type: "string" }, value: "Group" },
                { type: { type: "string" }, value: "Key" },
                { type: { type: "string" }, value: "Value" },
            ],
            { type: "undefined" },
        );

        const errorRef = createRef(null);

        const result = call(
            GLIB_LIB,
            "g_key_file_get_string",
            [
                { type: { type: "boxed", innerType: "GKeyFile", lib: GLIB_LIB, borrowed: true }, value: keyFile },
                { type: { type: "string" }, value: "Group" },
                { type: { type: "string" }, value: "Key" },
                {
                    type: {
                        type: "ref",
                        innerType: {
                            type: "boxed",
                            innerType: "GError",
                            lib: GLIB_LIB,
                        },
                    },
                    value: errorRef,
                },
            ],
            { type: "string" },
        );

        expect(result).toBe("Value");
        expect(errorRef.value).toBeNull();
    });
});

describe("Ref with GObject Types - Borrowed", () => {
    it("should handle borrowed Ref<GObject> (out parameter returning borrowed object)", () => {
        const display = call(GDK_LIB, "gdk_display_get_default", [], {
            type: "gobject",
            borrowed: true,
        });
        expect(display).not.toBeNull();

        const clipboard = call(
            GDK_LIB,
            "gdk_display_get_clipboard",
            [{ type: { type: "gobject", borrowed: true }, value: display }],
            {
                type: "gobject",
                borrowed: true,
            },
        );
        expect(clipboard).not.toBeNull();
    });
});

describe("Ref with Boxed Types - Owned", () => {
    it("should handle owned Ref<Boxed> (GError is always owned, must be freed)", () => {
        const keyFile = call(GLIB_LIB, "g_key_file_new", [], {
            type: "boxed",
            borrowed: true,
            innerType: "GKeyFile",
            lib: GLIB_LIB,
        });

        const errorRef = createRef(null);

        call(
            GLIB_LIB,
            "g_key_file_load_from_file",
            [
                { type: { type: "boxed", innerType: "GKeyFile", lib: GLIB_LIB, borrowed: true }, value: keyFile },
                { type: { type: "string" }, value: "/nonexistent/path/file.ini" },
                { type: { type: "int", size: 32, unsigned: false }, value: 0 },
                {
                    type: {
                        type: "ref",
                        innerType: {
                            type: "boxed",
                            innerType: "GError",
                            lib: GLIB_LIB,
                            borrowed: false,
                        },
                    },
                    value: errorRef,
                },
            ],
            { type: "boolean" },
        );

        expect(errorRef.value).not.toBeNull();
    });

    it("should handle owned Ref<GdkRGBA> boxed type", () => {
        const rgba = alloc(16, "GdkRGBA", GDK_LIB);
        write(rgba, { type: "float", size: 32 }, 0, 1.0);
        write(rgba, { type: "float", size: 32 }, 4, 0.5);
        write(rgba, { type: "float", size: 32 }, 8, 0.25);
        write(rgba, { type: "float", size: 32 }, 12, 1.0);

        const copiedRgba = call(
            GDK_LIB,
            "gdk_rgba_copy",
            [{ type: { type: "boxed", innerType: "GdkRGBA", lib: GDK_LIB, borrowed: true }, value: rgba }],
            { type: "boxed", innerType: "GdkRGBA", lib: GDK_LIB, borrowed: false },
        );
        expect(copiedRgba).not.toBeNull();

        expect(read(copiedRgba, { type: "float", size: 32 }, 0)).toBeCloseTo(1.0, 5);
    });
});

describe("Ref with Multiple Out Parameters", () => {
    it("should handle multiple Ref<i32> out parameters", () => {
        const window = call(GTK_LIB, "gtk_window_new", [], { type: "gobject", borrowed: true });

        call(
            GTK_LIB,
            "gtk_window_set_default_size",
            [
                { type: { type: "gobject", borrowed: true }, value: window },
                { type: { type: "int", size: 32, unsigned: false }, value: 1024 },
                { type: { type: "int", size: 32, unsigned: false }, value: 768 },
            ],
            { type: "undefined" },
        );

        const widthRef = createRef(0);
        const heightRef = createRef(0);

        call(
            GTK_LIB,
            "gtk_window_get_default_size",
            [
                { type: { type: "gobject", borrowed: true }, value: window },
                { type: { type: "ref", innerType: { type: "int", size: 32, unsigned: false } }, value: widthRef },
                { type: { type: "ref", innerType: { type: "int", size: 32, unsigned: false } }, value: heightRef },
            ],
            { type: "undefined" },
        );

        expect(widthRef.value).toBe(1024);
        expect(heightRef.value).toBe(768);
    });

    it("should handle zero values via out parameters", () => {
        const window = call(GTK_LIB, "gtk_window_new", [], { type: "gobject", borrowed: true });

        const widthRef = createRef(999);
        const heightRef = createRef(999);

        call(
            GTK_LIB,
            "gtk_window_get_default_size",
            [
                { type: { type: "gobject", borrowed: true }, value: window },
                { type: { type: "ref", innerType: { type: "int", size: 32, unsigned: false } }, value: widthRef },
                { type: { type: "ref", innerType: { type: "int", size: 32, unsigned: false } }, value: heightRef },
            ],
            { type: "undefined" },
        );

        expect(widthRef.value).toBe(0);
        expect(heightRef.value).toBe(0);
    });
});

describe("Ref with Boxed Error Type", () => {
    it("should handle null GError when operation succeeds", () => {
        const keyFile = call(GLIB_LIB, "g_key_file_new", [], {
            type: "boxed",
            borrowed: true,
            innerType: "GKeyFile",
            lib: GLIB_LIB,
        });

        call(
            GLIB_LIB,
            "g_key_file_set_string",
            [
                { type: { type: "boxed", innerType: "GKeyFile", lib: GLIB_LIB, borrowed: true }, value: keyFile },
                { type: { type: "string" }, value: "Section" },
                { type: { type: "string" }, value: "Key" },
                { type: { type: "string" }, value: "TestValue" },
            ],
            { type: "undefined" },
        );

        const errorRef = createRef(null);

        const result = call(
            GLIB_LIB,
            "g_key_file_get_string",
            [
                { type: { type: "boxed", innerType: "GKeyFile", lib: GLIB_LIB, borrowed: true }, value: keyFile },
                { type: { type: "string" }, value: "Section" },
                { type: { type: "string" }, value: "Key" },
                {
                    type: {
                        type: "ref",
                        innerType: { type: "boxed", innerType: "GError", lib: GLIB_LIB },
                    },
                    value: errorRef,
                },
            ],
            { type: "string" },
        );

        expect(result).toBe("TestValue");
        expect(errorRef.value).toBeNull();
    });

    it("should populate GError when operation fails", () => {
        const keyFile = call(GLIB_LIB, "g_key_file_new", [], {
            type: "boxed",
            borrowed: true,
            innerType: "GKeyFile",
            lib: GLIB_LIB,
        });

        const errorRef = createRef(null);

        call(
            GLIB_LIB,
            "g_key_file_get_string",
            [
                { type: { type: "boxed", innerType: "GKeyFile", lib: GLIB_LIB, borrowed: true }, value: keyFile },
                { type: { type: "string" }, value: "NonExistent" },
                { type: { type: "string" }, value: "Key" },
                {
                    type: {
                        type: "ref",
                        innerType: { type: "boxed", innerType: "GError", lib: GLIB_LIB },
                    },
                    value: errorRef,
                },
            ],
            { type: "string" },
        );

        expect(errorRef.value).not.toBeNull();
    });
});

describe("Ref with All Integer Sizes", () => {
    it("should handle Ref<i8>", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 8, unsigned: false }, 0, -100);

        const ref = createRef(0);
        const val = read(ptr, { type: "int", size: 8, unsigned: false }, 0) as number;
        ref.value = val;
        expect(ref.value).toBe(-100);
    });

    it("should handle Ref<u8>", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 8, unsigned: true }, 0, 200);

        const ref = createRef(0);
        const val = read(ptr, { type: "int", size: 8, unsigned: true }, 0) as number;
        ref.value = val;
        expect(ref.value).toBe(200);
    });

    it("should handle Ref<i16>", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 16, unsigned: false }, 0, -20000);

        const ref = createRef(0);
        const val = read(ptr, { type: "int", size: 16, unsigned: false }, 0) as number;
        ref.value = val;
        expect(ref.value).toBe(-20000);
    });

    it("should handle Ref<u16>", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 16, unsigned: true }, 0, 50000);

        const ref = createRef(0);
        const val = read(ptr, { type: "int", size: 16, unsigned: true }, 0) as number;
        ref.value = val;
        expect(ref.value).toBe(50000);
    });

    it("should handle Ref<i64>", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 64, unsigned: false }, 0, -9007199254740991);

        const ref = createRef(0);
        const val = read(ptr, { type: "int", size: 64, unsigned: false }, 0) as number;
        ref.value = val;
        expect(ref.value).toBe(-9007199254740991);
    });

    it("should handle Ref<u64>", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 64, unsigned: true }, 0, 9007199254740991);

        const ref = createRef(0);
        const val = read(ptr, { type: "int", size: 64, unsigned: true }, 0) as number;
        ref.value = val;
        expect(ref.value).toBe(9007199254740991);
    });

    it("should handle Ref<i32> large values", () => {
        const window = call(GTK_LIB, "gtk_window_new", [], { type: "gobject", borrowed: true });

        call(
            GTK_LIB,
            "gtk_window_set_default_size",
            [
                { type: { type: "gobject", borrowed: true }, value: window },
                { type: { type: "int", size: 32, unsigned: false }, value: 10000 },
                { type: { type: "int", size: 32, unsigned: false }, value: 8000 },
            ],
            { type: "undefined" },
        );

        const widthRef = createRef(0);
        const heightRef = createRef(0);

        call(
            GTK_LIB,
            "gtk_window_get_default_size",
            [
                { type: { type: "gobject", borrowed: true }, value: window },
                { type: { type: "ref", innerType: { type: "int", size: 32, unsigned: false } }, value: widthRef },
                { type: { type: "ref", innerType: { type: "int", size: 32, unsigned: false } }, value: heightRef },
            ],
            { type: "undefined" },
        );

        expect(widthRef.value).toBe(10000);
        expect(heightRef.value).toBe(8000);
    });

    it("should handle Ref<i32> boundary values via read/write", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "int", size: 32, unsigned: false }, 0, 2147483647);
        expect(read(ptr, { type: "int", size: 32, unsigned: false }, 0)).toBe(2147483647);

        write(ptr, { type: "int", size: 32, unsigned: false }, 0, -2147483648);
        expect(read(ptr, { type: "int", size: 32, unsigned: false }, 0)).toBe(-2147483648);
    });
});

describe("Ref with Float Types", () => {
    it("should handle Ref<f32>", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "float", size: 32 }, 0, 3.14);

        const ref = createRef(0);
        const val = read(ptr, { type: "float", size: 32 }, 0) as number;
        ref.value = val;
        expect(ref.value).toBeCloseTo(3.14, 2);
    });

    it("should handle Ref<f64>", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "float", size: 64 }, 0, Math.PI);

        const ref = createRef(0);
        const val = read(ptr, { type: "float", size: 64 }, 0) as number;
        ref.value = val;
        expect(ref.value).toBeCloseTo(Math.PI, 10);
    });

    it("should handle Ref<f32> negative values", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "float", size: 32 }, 0, -999.5);

        const ref = createRef(0);
        const val = read(ptr, { type: "float", size: 32 }, 0) as number;
        ref.value = val;
        expect(ref.value).toBeCloseTo(-999.5, 1);
    });

    it("should handle Ref<f64> very small values", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "float", size: 64 }, 0, 0.000000001);

        const ref = createRef(0);
        const val = read(ptr, { type: "float", size: 64 }, 0) as number;
        ref.value = val;
        expect(ref.value).toBeCloseTo(0.000000001, 12);
    });

    it("should handle Ref<f32> special value infinity", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "float", size: 32 }, 0, Infinity);

        const ref = createRef(0);
        const val = read(ptr, { type: "float", size: 32 }, 0) as number;
        ref.value = val;
        expect(ref.value).toBe(Infinity);
    });

    it("should handle Ref<f64> special value negative infinity", () => {
        const ptr = alloc(16, "GdkRGBA", GTK_LIB);
        write(ptr, { type: "float", size: 64 }, 0, -Infinity);

        const ref = createRef(0);
        const val = read(ptr, { type: "float", size: 64 }, 0) as number;
        ref.value = val;
        expect(ref.value).toBe(-Infinity);
    });
});
