import { describe, expect, it, vi } from "vitest";
import * as Gdk from "../../src/generated/gdk/index.js";
import * as Gtk from "../../src/generated/gtk/index.js";
import "../../src/gobject/object.js";
import "../../src/gobject/value.js";

describe("Object.setProperty / getProperty auto-marshalling", () => {
    it("round-trips a string property through pspec lookup", () => {
        const label = new Gtk.Label("");
        label.setProperty("label", "hello");
        expect(label.getProperty("label")).toBe("hello");
    });

    it("round-trips a boolean property", () => {
        const button = new Gtk.Button();
        button.setProperty("sensitive", false);
        expect(button.getProperty("sensitive")).toBe(false);
        button.setProperty("sensitive", true);
        expect(button.getProperty("sensitive")).toBe(true);
    });

    it("round-trips an enum property as its integer payload", () => {
        const button = new Gtk.Button();
        button.setProperty("halign", Gtk.Align.CENTER);
        expect(button.getProperty("halign")).toBe(Gtk.Align.CENTER);
    });

    it("round-trips an integer property", () => {
        const scale = new Gtk.Scale();
        scale.setProperty("width-request", 240);
        expect(scale.getProperty("width-request")).toBe(240);
    });

    it("round-trips a double property", () => {
        const adjustment = new Gtk.Adjustment(0, 0, 1, 0.1, 0.1, 0);
        adjustment.setProperty("value", 0.75);
        expect(adjustment.getProperty("value") as number).toBeCloseTo(0.75);
    });

    it("preserves null when reading a string property that is unset", () => {
        const button = new Gtk.Button();
        const result = button.getProperty("label");
        expect(result === null || result === "").toBe(true);
    });

    it("returns a wrapper instance for boxed properties via class registry", () => {
        const window = new Gtk.Window();
        const settings = window.getProperty("display");
        expect(settings).toBeInstanceOf(Gdk.Display);
    });

    it("throws when getting an unknown property", () => {
        const button = new Gtk.Button();
        expect(() => button.getProperty("does-not-exist")).toThrow(/No property 'does-not-exist'/);
    });

    it("throws when setting an unknown property", () => {
        const button = new Gtk.Button();
        expect(() => button.setProperty("does-not-exist", 1)).toThrow(/No property 'does-not-exist'/);
    });
});

describe("Object.emit() typed signal emission", () => {
    it("emits a void signal with no arguments and invokes connected handlers", () => {
        const button = new Gtk.Button();
        const handler = vi.fn();
        button.on("clicked", handler);

        button.emit("clicked");

        expect(handler).toHaveBeenCalledOnce();
        expect(handler).toHaveBeenCalledWith(button);
    });

    it("emits a signal with primitive arguments and forwards them to the handler", () => {
        const window = new Gtk.Window();
        const handler = vi.fn();
        window.on("enable-debugging", handler);

        window.emit("enable-debugging", true);

        expect(handler).toHaveBeenCalledOnce();
        expect(handler).toHaveBeenCalledWith(window, true);
    });

    it("returns the boolean result from a return-value signal", () => {
        const window = new Gtk.Window();
        window.on("close-request", () => true);

        const result = window.emit("close-request");

        expect(result).toBe(true);
    });

    it("returns undefined from a void-return signal", () => {
        const button = new Gtk.Button();
        button.on("clicked", () => {});

        const result = button.emit("clicked");

        expect(result).toBeUndefined();
    });

    it("emits an inherited signal via super.emit fallthrough", () => {
        const button = new Gtk.Button();
        const handler = vi.fn();
        button.on("destroy", handler);

        button.emit("destroy");

        expect(handler).toHaveBeenCalledOnce();
    });

    it("emits a signal with a GObject argument", () => {
        const listBox = new Gtk.ListBox();
        const row = new Gtk.ListBoxRow();
        listBox.append(row);
        const handler = vi.fn();
        listBox.on("row-activated", handler);

        listBox.emit("row-activated", row);

        expect(handler).toHaveBeenCalledOnce();
        expect(handler).toHaveBeenCalledWith(listBox, row);
    });

    it("throws on an unknown signal at the GObject root", () => {
        const button = new Gtk.Button();
        expect(() => (button as unknown as { emit(s: string): unknown }).emit("not-a-real-signal")).toThrow(
            /Unknown signal 'not-a-real-signal'/,
        );
    });
});
