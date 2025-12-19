import { describe, expect, it } from "vitest";
import * as Gtk from "../src/generated/gtk/index.js";
import { getObject, type NativeClass } from "../src/index.js";

describe("getObject with interfaces", () => {
    it("returns interface instance when object implements it", () => {
        const box = new Gtk.Box(Gtk.Orientation.HORIZONTAL, 0);
        const orientable = getObject(box.id, Gtk.Orientable);
        expect(orientable).not.toBeNull();
    });

    it("allows calling interface methods on returned instance", () => {
        const box = new Gtk.Box(Gtk.Orientation.HORIZONTAL, 0);
        const orientable = getObject(box.id, Gtk.Orientable);
        expect(orientable).not.toBeNull();
        expect(typeof orientable?.setOrientation).toBe("function");
    });

    it("returns null for invalid gtype", () => {
        const label = new Gtk.Label("Test");
        const invalidType = {
            glibTypeName: "InvalidInterface",
            objectType: "interface",
            prototype: { id: null },
        } as unknown as NativeClass;
        const result = getObject(label.id, invalidType);
        expect(result).toBeNull();
    });
});
