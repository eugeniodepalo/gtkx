import { describe, expect, it, vi } from "vitest";
import * as Gtk from "../../src/generated/gtk/index.js";

describe("on/off", () => {
    it("registers and removes handlers via callback identity", () => {
        const button = new Gtk.Button();
        const handler = vi.fn();

        button.on("clicked", handler);
        button.off("clicked", handler);

        expect(handler).not.toHaveBeenCalled();
    });

    it("returns this for chaining", () => {
        const button = new Gtk.Button();
        const handler = (): void => {};
        const result = button.on("clicked", handler);
        expect(result).toBe(button);
        button.off("clicked", handler);
    });

    it("off() after the handler was already disconnected is a no-op", () => {
        const button = new Gtk.Button();
        const handler = (): void => {};
        button.on("clicked", handler);
        button.off("clicked", handler);
        expect(() => button.off("clicked", handler)).not.toThrow();
    });
});

describe("once", () => {
    it("can be removed via off() before firing", () => {
        const button = new Gtk.Button();
        const handler = vi.fn();

        button.once("clicked", handler);
        button.off("clicked", handler);

        expect(handler).not.toHaveBeenCalled();
    });

    it("returns this for chaining", () => {
        const button = new Gtk.Button();
        const handler = (): void => {};
        const result = button.once("clicked", handler);
        expect(result).toBe(button);
        button.off("clicked", handler);
    });
});

describe("disconnect", () => {
    it("disconnects a handler by ID", () => {
        const button = new Gtk.Button();
        const handlerId = button.connect("clicked", () => {});
        expect(typeof handlerId).toBe("number");
        expect(handlerId).toBeGreaterThan(0);
        expect(() => button.disconnect(handlerId)).not.toThrow();
    });
});
