import { describe, expect, it } from "vitest";
import * as Gtk from "../src/generated/gtk/index.js";
import { beginBatch, call, endBatch, isBatching } from "../src/index.js";

describe("beginBatch", () => {
    it("enables batching mode", () => {
        expect(isBatching()).toBe(false);
        beginBatch();
        expect(isBatching()).toBe(true);
        endBatch();
    });
});

describe("endBatch", () => {
    it("disables batching mode", () => {
        beginBatch();
        expect(isBatching()).toBe(true);
        endBatch();
        expect(isBatching()).toBe(false);
    });

    it("executes queued void calls", () => {
        const label = new Gtk.Label("Before");
        beginBatch();
        call(
            "libgtk-4.so.1",
            "gtk_label_set_text",
            [
                { type: { type: "gobject", ownership: "none" }, value: label.id },
                { type: { type: "string", ownership: "full" }, value: "After" },
            ],
            { type: "undefined" },
        );
        expect(label.getText()).toBe("Before");
        endBatch();
        expect(label.getText()).toBe("After");
    });

    it("does nothing when not batching", () => {
        expect(() => endBatch()).not.toThrow();
    });
});

describe("isBatching", () => {
    it("returns false when not batching", () => {
        expect(isBatching()).toBe(false);
    });

    it("returns true when batching is active", () => {
        beginBatch();
        expect(isBatching()).toBe(true);
        endBatch();
    });

    describe("edge cases", () => {
        it("handles nested batching", () => {
            beginBatch();
            expect(isBatching()).toBe(true);
            beginBatch();
            expect(isBatching()).toBe(true);
            endBatch();
            expect(isBatching()).toBe(true);
            endBatch();
            expect(isBatching()).toBe(false);
        });
    });
});

describe("call", () => {
    it("calls native GTK functions", () => {
        const label = new Gtk.Label("Initial");
        call(
            "libgtk-4.so.1",
            "gtk_label_set_text",
            [
                { type: { type: "gobject", ownership: "none" }, value: label.id },
                { type: { type: "string", ownership: "full" }, value: "Updated" },
            ],
            { type: "undefined" },
        );
        expect(label.getText()).toBe("Updated");
    });

    it("returns values from native functions", () => {
        const label = new Gtk.Label("Test Text");
        const text = call(
            "libgtk-4.so.1",
            "gtk_label_get_text",
            [{ type: { type: "gobject", ownership: "none" }, value: label.id }],
            { type: "string", ownership: "none" },
        );
        expect(text).toBe("Test Text");
    });
});
