import { describe, expect, it } from "vitest";
import * as Gtk from "../../src/generated/gtk/index.js";
import { getObject } from "../../src/index.js";

describe("interfaces", () => {
    describe("interface methods on implementing class", () => {
        it("calls interface method via implementing class", () => {
            const box = new Gtk.Box(Gtk.Orientation.HORIZONTAL, 0);
            box.setOrientation(Gtk.Orientation.VERTICAL);
            expect(box.getOrientation()).toBe(Gtk.Orientation.VERTICAL);
        });

        it("calls multiple interface methods", () => {
            const box = new Gtk.Box(Gtk.Orientation.HORIZONTAL, 0);
            expect(box.getOrientation()).toBe(Gtk.Orientation.HORIZONTAL);
            box.setOrientation(Gtk.Orientation.VERTICAL);
            expect(box.getOrientation()).toBe(Gtk.Orientation.VERTICAL);
        });
    });

    describe("getObject interface casting", () => {
        it("casts object to interface type", () => {
            const box = new Gtk.Box(Gtk.Orientation.HORIZONTAL, 0);
            const orientable = getObject(box.id, Gtk.Orientable);
            expect(orientable).not.toBeNull();
        });

        it("allows calling interface methods after cast", () => {
            const box = new Gtk.Box(Gtk.Orientation.HORIZONTAL, 0);
            const orientable = getObject(box.id, Gtk.Orientable);
            expect(orientable).not.toBeNull();
            expect(orientable?.getOrientation()).toBe(Gtk.Orientation.HORIZONTAL);
        });

        it("allows setting via interface after cast", () => {
            const box = new Gtk.Box(Gtk.Orientation.HORIZONTAL, 0);
            const orientable = getObject(box.id, Gtk.Orientable);
            orientable?.setOrientation(Gtk.Orientation.VERTICAL);
            expect(box.getOrientation()).toBe(Gtk.Orientation.VERTICAL);
        });
    });

    describe("interface static properties", () => {
        it("has glibTypeName on interface", () => {
            expect(Gtk.Orientable.glibTypeName).toBe("GtkOrientable");
        });

        it("has objectType on interface", () => {
            expect(Gtk.Orientable.objectType).toBe("interface");
        });
    });

    describe("multiple interfaces", () => {
        it("implements Buildable interface", () => {
            const button = new Gtk.Button();
            const buildable = getObject(button.id, Gtk.Buildable);
            expect(buildable).not.toBeNull();
        });

        it("can call Buildable interface method", () => {
            const button = new Gtk.Button();
            const buildable = getObject(button.id, Gtk.Buildable);
            const buildableId = buildable?.getBuildableId();
            expect(buildableId === null || typeof buildableId === "string").toBe(true);
        });
    });
});
