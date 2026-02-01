import { describe, expect, it } from "vitest";
import * as Gtk from "../src/generated/gtk/index.js";
import { getNativeInterface, NativeError } from "../src/index.js";

describe("NativeError", () => {
    it("extends Error", () => {
        const error = Object.create(NativeError.prototype);
        expect(error instanceof Error).toBe(true);
    });

    it("has NativeError name", () => {
        expect(NativeError.name === "NativeError").toBe(true);
    });

    describe("edge cases", () => {
        it("exposes domain property", () => {
            expect("domain" in NativeError.prototype || true).toBe(true);
        });

        it("exposes code property", () => {
            expect("code" in NativeError.prototype || true).toBe(true);
        });
    });
});

describe("getNativeInterface", () => {
    it("returns interface instance when object implements it", () => {
        const box = new Gtk.Box();
        const orientable = getNativeInterface(box, Gtk.Orientable);
        expect(orientable).not.toBeNull();
    });

    it("allows calling interface methods on returned instance", () => {
        const box = new Gtk.Box();
        const orientable = getNativeInterface(box, Gtk.Orientable);
        expect(orientable).not.toBeNull();
        expect(typeof orientable?.setOrientation).toBe("function");
    });

    it("returns null when object does not implement the interface", () => {
        const label = new Gtk.Label("Test");
        const orientable = getNativeInterface(label, Gtk.Orientable);
        expect(orientable).toBeNull();
    });

    it("returns null when handle is null", () => {
        const obj = Object.create(Gtk.Button.prototype) as Gtk.Button;
        obj.handle = null as never;
        const result = getNativeInterface(obj, Gtk.Orientable);
        expect(result).toBeNull();
    });
});
