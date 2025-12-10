import * as Gtk from "@gtkx/ffi/gtk";
import { describe, expect, it } from "vitest";
import { createNode } from "../src/factory.js";
import { WidgetNode } from "../src/nodes/widget.js";
import { WindowNode } from "../src/nodes/window.js";
import { setupTests } from "./test-setup.js";

setupTests();

describe("createNode", () => {
    it("returns WindowNode for Window type", () => {
        const node = createNode("Window", {});

        expect(node).toBeInstanceOf(WindowNode);
        expect(node.getWidget()).toBeInstanceOf(Gtk.Window);
    });

    it("returns WindowNode for ApplicationWindow type", () => {
        const node = createNode("ApplicationWindow", { title: "Test" });

        expect(node).toBeInstanceOf(WindowNode);
        expect(node.getWidget()).toBeInstanceOf(Gtk.ApplicationWindow);
    });

    it("returns WidgetNode as fallback for standard widget types", () => {
        const node = createNode("Button", { label: "Click" });

        expect(node).toBeInstanceOf(WidgetNode);
        expect(node.getWidget()).toBeInstanceOf(Gtk.Button);
    });

    it("returns WidgetNode for Label type", () => {
        const node = createNode("Label", { label: "Text" });

        expect(node).toBeInstanceOf(WidgetNode);
        expect(node.getWidget()).toBeInstanceOf(Gtk.Label);
    });

    it("returns WidgetNode for Box type", () => {
        const node = createNode("Box", { orientation: Gtk.Orientation.VERTICAL, spacing: 5 });

        expect(node).toBeInstanceOf(WidgetNode);
        expect(node.getWidget()).toBeInstanceOf(Gtk.Box);
    });

    it("initializes widget with provided props", () => {
        const node = createNode("Button", { label: "Hello", sensitive: false });
        const widget = node.getWidget() as Gtk.Button;

        expect(widget.getLabel()).toBe("Hello");
        expect(widget.getSensitive()).toBe(false);
    });

    it("creates virtual node for Grid.Child", () => {
        const node = createNode("Grid.Child", { column: 1, row: 2 });

        expect(node.getWidget()).toBeUndefined();
    });

    it("creates virtual node for Slot types", () => {
        const node = createNode("Expander.Child", {});

        expect(node.getWidget()).toBeUndefined();
    });
});
