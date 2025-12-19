import { describe, expect, it } from "vitest";
import * as Gdk from "../src/generated/gdk/index.js";
import { getObject } from "../src/index.js";

describe("getObject with boxed types", () => {
    it("wraps a native boxed type pointer in a class instance", () => {
        const rgba = new Gdk.RGBA({ red: 1.0, green: 0.5, blue: 0.0, alpha: 1.0 });
        const wrapped = getObject(rgba.id, Gdk.RGBA);
        expect(wrapped).not.toBeNull();
        expect(wrapped?.red).toBeCloseTo(1.0);
        expect(wrapped?.green).toBeCloseTo(0.5);
        expect(wrapped?.blue).toBeCloseTo(0.0);
        expect(wrapped?.alpha).toBeCloseTo(1.0);
    });

    it("sets the correct prototype chain", () => {
        const rgba = new Gdk.RGBA({ red: 0.5 });
        const wrapped = getObject(rgba.id, Gdk.RGBA);
        expect(wrapped).not.toBeNull();
        expect(typeof wrapped?.toString).toBe("function");
        expect(typeof wrapped?.copy).toBe("function");
    });

    describe("null handling", () => {
        it("returns null when id is null", () => {
            const result = getObject(null, Gdk.RGBA);
            expect(result).toBeNull();
        });

        it("returns null when id is undefined", () => {
            const result = getObject(undefined, Gdk.RGBA);
            expect(result).toBeNull();
        });
    });
});
