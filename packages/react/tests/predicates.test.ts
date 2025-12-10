import * as Gtk from "@gtkx/ffi/gtk";
import { describe, expect, it } from "vitest";
import { isAppendable, isRemovable, isSingleChild } from "../src/predicates.js";
import { setupTests } from "./test-setup.js";

setupTests();

describe("isAppendable", () => {
    it("returns true for widgets with append method", () => {
        const box = new Gtk.Box(Gtk.Orientation.VERTICAL, 0);

        expect(isAppendable(box)).toBe(true);
    });

    it("returns true for ListBox which has append", () => {
        const listBox = new Gtk.ListBox();

        expect(isAppendable(listBox)).toBe(true);
    });

    it("returns false for widgets without append method", () => {
        const label = new Gtk.Label("test");

        expect(isAppendable(label)).toBe(false);
    });

    it("returns false for Button which has no append method", () => {
        const button = new Gtk.Button();

        expect(isAppendable(button)).toBe(false);
    });
});

describe("isSingleChild", () => {
    it("returns true for widgets with setChild method", () => {
        const window = new Gtk.Window();

        expect(isSingleChild(window)).toBe(true);
    });

    it("returns true for ScrolledWindow which has setChild", () => {
        const scrolled = new Gtk.ScrolledWindow();

        expect(isSingleChild(scrolled)).toBe(true);
    });

    it("returns true for Frame which has setChild", () => {
        const frame = new Gtk.Frame("");

        expect(isSingleChild(frame)).toBe(true);
    });

    it("returns false for widgets without setChild method", () => {
        const label = new Gtk.Label("test");

        expect(isSingleChild(label)).toBe(false);
    });

    it("returns false for Box which uses append instead of setChild", () => {
        const box = new Gtk.Box(Gtk.Orientation.VERTICAL, 0);

        expect(isSingleChild(box)).toBe(false);
    });
});

describe("isRemovable", () => {
    it("returns true for widgets with remove method", () => {
        const box = new Gtk.Box(Gtk.Orientation.VERTICAL, 0);

        expect(isRemovable(box)).toBe(true);
    });

    it("returns true for Grid which has remove", () => {
        const grid = new Gtk.Grid();

        expect(isRemovable(grid)).toBe(true);
    });

    it("returns true for FlowBox which has remove", () => {
        const flowBox = new Gtk.FlowBox();

        expect(isRemovable(flowBox)).toBe(true);
    });

    it("returns false for widgets without remove method", () => {
        const label = new Gtk.Label("test");

        expect(isRemovable(label)).toBe(false);
    });

    it("returns false for Entry which has no remove method", () => {
        const entry = new Gtk.Entry();

        expect(isRemovable(entry)).toBe(false);
    });
});
