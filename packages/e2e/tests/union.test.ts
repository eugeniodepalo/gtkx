import { CONSTRUCTION_META, type ConstructionMeta, type NativeClass } from "@gtkx/ffi";
import * as GLib from "@gtkx/ffi/glib";
import { describe, expect, it } from "vitest";

type BoxedMeta = Extract<ConstructionMeta, { kind: "boxed" }>;

const boxedMeta = (cls: unknown): BoxedMeta => {
    const meta = CONSTRUCTION_META.get(cls as NativeClass);
    if (meta?.kind !== "boxed") {
        throw new Error("expected boxed construction metadata");
    }
    return meta;
};

describe("union layout", () => {
    it("overlays every TokenValue field at offset 0", () => {
        const meta = boxedMeta(GLib.TokenValue);
        // a C union is the size of its widest member, not the sum of all members
        expect(meta.size).toBe(8);
        for (const field of Object.values(meta.fields)) {
            expect(field.offset).toBe(0);
        }
    });

    it("sizes IEEE754 unions by their widest member", () => {
        expect(boxedMeta(GLib.DoubleIEEE754).size).toBe(8);
        expect(boxedMeta(GLib.FloatIEEE754).size).toBe(4);
    });

    it("accounts for inline composite members in a record's size", () => {
        // GVariantBuilder's body is entirely an inline union of two 128-byte
        // members; dropping the union would leave the record sized at zero.
        expect(boxedMeta(GLib.VariantBuilder).size).toBe(128);
    });

    it("generates a value accessor for a single-field union", () => {
        const descriptor = Object.getOwnPropertyDescriptor(GLib.DoubleIEEE754.prototype, "vDouble");
        expect(typeof descriptor?.get).toBe("function");
        expect(typeof descriptor?.set).toBe("function");
    });
});

describe("union runtime behavior", () => {
    it("overlays distinct union members onto shared storage", () => {
        const token = new GLib.TokenValue();
        token.vInt64 = 7;
        expect(token.vInt).toBe(7);
        expect(token.vBinary).toBe(7);
    });

    it("round-trips the value field of an IEEE754 union", () => {
        const value = new GLib.DoubleIEEE754();
        value.vDouble = 1234.5;
        expect(value.vDouble).toBe(1234.5);
    });
});
