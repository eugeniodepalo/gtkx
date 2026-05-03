import { describe, expect, it } from "vitest";
import { defineConfig, isValidAppId } from "../src/config.js";

describe("defineConfig", () => {
    it("returns the config unchanged when valid", () => {
        const config = { libraries: ["Gtk-4.0", "Adw-1"] };
        expect(defineConfig(config)).toBe(config);
    });

    it("accepts a girPath array", () => {
        const config = { libraries: ["Gtk-4.0"], girPath: ["/usr/share/gir-1.0"] };
        expect(defineConfig(config)).toBe(config);
    });

    it("rejects an empty libraries array", () => {
        expect(() => defineConfig({ libraries: [] })).toThrow(/`libraries` must be a non-empty string array/);
    });

    it("rejects a non-array libraries field", () => {
        expect(() => defineConfig({ libraries: "Gtk-4.0" as unknown as string[] })).toThrow(
            /`libraries` must be a non-empty string array/,
        );
    });

    it("rejects a library identifier without a version suffix", () => {
        expect(() => defineConfig({ libraries: ["Gtk"] })).toThrow(/invalid library identifier/);
    });

    it("rejects a library identifier that starts with a digit", () => {
        expect(() => defineConfig({ libraries: ["4Gtk-1.0"] })).toThrow(/invalid library identifier/);
    });

    it("accepts multi-component versions", () => {
        expect(() => defineConfig({ libraries: ["Glib-2.0.1"] })).not.toThrow();
    });

    it("rejects a non-string library entry", () => {
        expect(() => defineConfig({ libraries: [123 as unknown as string] })).toThrow(/invalid library identifier/);
    });

    it("rejects a non-array girPath", () => {
        expect(() =>
            defineConfig({ libraries: ["Gtk-4.0"], girPath: "/usr/share/gir-1.0" as unknown as string[] }),
        ).toThrow(/`girPath` must be an array of strings if provided/);
    });
});

describe("isValidAppId", () => {
    it("accepts a standard reverse-DNS application ID", () => {
        expect(isValidAppId("com.example.MyApp")).toBe(true);
    });

    it("accepts hyphens and underscores within elements", () => {
        expect(isValidAppId("com.example.my-app_v2")).toBe(true);
    });

    it("rejects an ID with no dots", () => {
        expect(isValidAppId("singletoken")).toBe(false);
    });

    it("rejects an empty string", () => {
        expect(isValidAppId("")).toBe(false);
    });

    it("rejects an ID exceeding 255 characters", () => {
        const long = `${"a".repeat(252)}.${"b".repeat(3)}`;
        expect(long.length).toBe(256);
        expect(isValidAppId(long)).toBe(false);
    });

    it("rejects an element starting with a digit", () => {
        expect(isValidAppId("com.4example.app")).toBe(false);
    });

    it("rejects whitespace and disallowed characters", () => {
        expect(isValidAppId("com.example.my app")).toBe(false);
        expect(isValidAppId("com.example.my$app")).toBe(false);
    });

    it("rejects trailing or leading dots", () => {
        expect(isValidAppId(".com.example")).toBe(false);
        expect(isValidAppId("com.example.")).toBe(false);
    });
});
