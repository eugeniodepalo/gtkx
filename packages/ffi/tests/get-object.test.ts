import { describe, expect, it } from "vitest";
import * as Gtk from "../src/generated/gtk/index.js";
import { getCurrentApp, getObject } from "../src/index.js";

describe("getObject", () => {
    it("wraps a native pointer in a class instance", () => {
        const label = new Gtk.Label("Test");
        const wrapped = getObject(label.id);
        expect(wrapped).toBeInstanceOf(Gtk.Label);
    });

    it("determines correct runtime type via GLib type system", () => {
        const button = new Gtk.Button();
        const wrapped = getObject(button.id);
        expect(wrapped).toBeInstanceOf(Gtk.Button);
    });

    it("walks up type hierarchy for unregistered subtypes", () => {
        const app = getCurrentApp();
        const wrapped = getObject(app.id);
        expect(wrapped).toBeInstanceOf(Gtk.Application);
    });

    it("wraps with specific type when targetType is provided", () => {
        const box = new Gtk.Box(Gtk.Orientation.HORIZONTAL, 0);
        const wrapped = getObject(box.id, Gtk.Box);
        expect(wrapped).toBeInstanceOf(Gtk.Box);
    });

    describe("null handling", () => {
        it("returns null when id is null", () => {
            const result = getObject(null);
            expect(result).toBeNull();
        });

        it("returns null when id is undefined", () => {
            const result = getObject(undefined);
            expect(result).toBeNull();
        });
    });
});
