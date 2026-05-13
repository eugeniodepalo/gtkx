import { describe, expect, it } from "vitest";
import { alloc, call, getNativeId, type NativeHandle } from "../../index.js";
import { GDK_LIB, GTK_LIB } from "./utils.js";

describe("getNativeId", () => {
    it("returns a number identifier for a GObject", () => {
        const label = call(
            GTK_LIB,
            "gtk_label_new",
            [{ type: { type: "string", ownership: "borrowed" }, value: "Test" }],
            {
                type: "gobject",
                ownership: "borrowed",
            },
        ) as NativeHandle;

        expect(typeof getNativeId(label)).toBe("number");
    });

    it("returns a number identifier for a boxed type", () => {
        const rgba = alloc(16, "GdkRGBA", GDK_LIB);

        expect(typeof getNativeId(rgba)).toBe("number");
    });

    it("returns consistent id for the same object", () => {
        const label = call(
            GTK_LIB,
            "gtk_label_new",
            [{ type: { type: "string", ownership: "borrowed" }, value: "Test" }],
            {
                type: "gobject",
                ownership: "borrowed",
            },
        ) as NativeHandle;

        expect(getNativeId(label)).toBe(getNativeId(label));
    });

    it("returns different ids for different objects", () => {
        const label1 = call(
            GTK_LIB,
            "gtk_label_new",
            [{ type: { type: "string", ownership: "borrowed" }, value: "Test 1" }],
            { type: "gobject", ownership: "borrowed" },
        ) as NativeHandle;
        const label2 = call(
            GTK_LIB,
            "gtk_label_new",
            [{ type: { type: "string", ownership: "borrowed" }, value: "Test 2" }],
            { type: "gobject", ownership: "borrowed" },
        ) as NativeHandle;

        expect(getNativeId(label1)).not.toBe(getNativeId(label2));
    });

    it("can be used as a Map key", () => {
        const label = call(
            GTK_LIB,
            "gtk_label_new",
            [{ type: { type: "string", ownership: "borrowed" }, value: "Test" }],
            {
                type: "gobject",
                ownership: "borrowed",
            },
        ) as NativeHandle;

        const map = new Map<number, string>();
        map.set(getNativeId(label), "label-value");

        expect(map.get(getNativeId(label))).toBe("label-value");
    });
});
