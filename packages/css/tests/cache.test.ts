import { describe, expect, it } from "vitest";
import { getGtkCache } from "../src/cache.js";
import { setup } from "./test-setup.js";

setup();

describe("getGtkCache", () => {
    it("returns an EmotionCache instance", () => {
        const cache = getGtkCache();
        expect(cache).toBeDefined();
        expect(cache.key).toBe("gtkx");
    });

    it("returns the same instance on subsequent calls (singleton)", () => {
        const cache1 = getGtkCache();
        const cache2 = getGtkCache();
        expect(cache1).toBe(cache2);
    });

    it("has a sheet property", () => {
        const cache = getGtkCache();
        expect(cache.sheet).toBeDefined();
    });

    it("cache key is gtkx", () => {
        const cache = getGtkCache();
        expect(cache.key).toBe("gtkx");
    });
});
