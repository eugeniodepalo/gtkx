import { describe, expect, it } from "vitest";
import { Type } from "../../src/gobject/index.js";

describe("Type", () => {
    it("resolves INVALID to a GType value", () => {
        expect(typeof Type.INVALID).toBe("number");
    });

    it("resolves NONE to a GType value", () => {
        expect(typeof Type.NONE).toBe("number");
    });

    it("resolves INTERFACE to a nonzero GType", () => {
        expect(Type.INTERFACE).toBeGreaterThan(0);
    });

    it("resolves CHAR to a nonzero GType", () => {
        expect(Type.CHAR).toBeGreaterThan(0);
    });

    it("resolves UCHAR to a nonzero GType", () => {
        expect(Type.UCHAR).toBeGreaterThan(0);
    });

    it("resolves BOOLEAN to a nonzero GType", () => {
        expect(Type.BOOLEAN).toBeGreaterThan(0);
    });

    it("resolves INT to a nonzero GType", () => {
        expect(Type.INT).toBeGreaterThan(0);
    });

    it("resolves UINT to a nonzero GType", () => {
        expect(Type.UINT).toBeGreaterThan(0);
    });

    it("resolves LONG to a nonzero GType", () => {
        expect(Type.LONG).toBeGreaterThan(0);
    });

    it("resolves ULONG to a nonzero GType", () => {
        expect(Type.ULONG).toBeGreaterThan(0);
    });

    it("resolves INT64 to a nonzero GType", () => {
        expect(Type.INT64).toBeGreaterThan(0);
    });

    it("resolves UINT64 to a nonzero GType", () => {
        expect(Type.UINT64).toBeGreaterThan(0);
    });

    it("resolves ENUM to a nonzero GType", () => {
        expect(Type.ENUM).toBeGreaterThan(0);
    });

    it("resolves FLAGS to a nonzero GType", () => {
        expect(Type.FLAGS).toBeGreaterThan(0);
    });

    it("resolves FLOAT to a nonzero GType", () => {
        expect(Type.FLOAT).toBeGreaterThan(0);
    });

    it("resolves DOUBLE to a nonzero GType", () => {
        expect(Type.DOUBLE).toBeGreaterThan(0);
    });

    it("resolves STRING to a nonzero GType", () => {
        expect(Type.STRING).toBeGreaterThan(0);
    });

    it("resolves POINTER to a nonzero GType", () => {
        expect(Type.POINTER).toBeGreaterThan(0);
    });

    it("resolves BOXED to a nonzero GType", () => {
        expect(Type.BOXED).toBeGreaterThan(0);
    });

    it("resolves PARAM to a nonzero GType", () => {
        expect(Type.PARAM).toBeGreaterThan(0);
    });

    it("resolves OBJECT to a nonzero GType", () => {
        expect(Type.OBJECT).toBeGreaterThan(0);
    });

    it("resolves VARIANT to a nonzero GType", () => {
        expect(Type.VARIANT).toBeGreaterThan(0);
    });

    it("returns the same value on subsequent accesses", () => {
        const first = Type.STRING;
        const second = Type.STRING;
        expect(first).toBe(second);
    });

    it("returns distinct values for different types", () => {
        const types = new Set([
            Type.BOOLEAN,
            Type.INT,
            Type.UINT,
            Type.FLOAT,
            Type.DOUBLE,
            Type.STRING,
            Type.OBJECT,
            Type.BOXED,
        ]);
        expect(types.size).toBe(8);
    });
});
