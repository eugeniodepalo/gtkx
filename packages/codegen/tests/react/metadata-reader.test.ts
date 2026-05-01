import { describe, expect, it } from "vitest";
import type { CodegenWidgetMeta } from "../../src/core/codegen-metadata.js";
import { MetadataReader, sortWidgetsByClassName } from "../../src/react/metadata-reader.js";

const createWidgetMeta = (overrides: Partial<CodegenWidgetMeta> = {}): CodegenWidgetMeta => ({
    className: "Button",
    jsxName: "GtkButton",
    namespace: "Gtk",
    propNames: ["label", "iconName"],
    signalNames: ["clicked"],
    parentClassName: "Widget",
    parentNamespace: "Gtk",
    modulePath: "./gtk/button.js",
    properties: [],
    signals: [],
    slots: [],
    hiddenPropNames: [],
    doc: undefined,
    ...overrides,
});

describe("sortWidgetsByClassName", () => {
    it("puts Widget first", () => {
        const widgets: { className: string }[] = [
            { className: "Button" },
            { className: "Widget" },
            { className: "Label" },
        ];
        const sorted = sortWidgetsByClassName(widgets);
        expect(sorted[0].className).toBe("Widget");
    });

    it("puts Window second after Widget", () => {
        const widgets: { className: string }[] = [
            { className: "Button" },
            { className: "Window" },
            { className: "Widget" },
        ];
        const sorted = sortWidgetsByClassName(widgets);
        expect(sorted[0].className).toBe("Widget");
        expect(sorted[1].className).toBe("Window");
    });

    it("sorts remaining widgets alphabetically", () => {
        const widgets: { className: string }[] = [
            { className: "Label" },
            { className: "Button" },
            { className: "Entry" },
        ];
        const sorted = sortWidgetsByClassName(widgets);
        expect(sorted.map((w) => w.className)).toEqual(["Button", "Entry", "Label"]);
    });

    it("handles empty array", () => {
        const sorted = sortWidgetsByClassName([]);
        expect(sorted).toEqual([]);
    });

    it("handles single widget", () => {
        const widgets: { className: string }[] = [{ className: "Button" }];
        const sorted = sortWidgetsByClassName(widgets);
        expect(sorted).toEqual([{ className: "Button" }]);
    });

    it("does not mutate original array", () => {
        const widgets: { className: string }[] = [
            { className: "Label" },
            { className: "Widget" },
            { className: "Button" },
        ];
        const original = [...widgets];
        sortWidgetsByClassName(widgets);
        expect(widgets).toEqual(original);
    });
});

describe("MetadataReader", () => {
    describe("constructor", () => {
        it("creates a reader from widget meta array", () => {
            const meta = [createWidgetMeta()];
            const reader = new MetadataReader(meta);
            expect(reader).toBeInstanceOf(MetadataReader);
        });

        it("handles empty meta array", () => {
            const reader = new MetadataReader([]);
            expect(reader.getAllWidgets()).toEqual([]);
        });
    });

    describe("getAllWidgets", () => {
        it("returns all widgets", () => {
            const meta = [
                createWidgetMeta({ className: "Button", jsxName: "GtkButton" }),
                createWidgetMeta({ className: "Label", jsxName: "GtkLabel" }),
            ];
            const reader = new MetadataReader(meta);
            const widgets = reader.getAllWidgets();
            expect(widgets).toHaveLength(2);
        });

        it("returns WidgetInfo without properties and signals", () => {
            const meta = [
                createWidgetMeta({
                    properties: [{ name: "label", type: "string" }] as CodegenWidgetMeta["properties"],
                    signals: [{ name: "clicked" }] as CodegenWidgetMeta["signals"],
                }),
            ];
            const reader = new MetadataReader(meta);
            const widgets = reader.getAllWidgets();
            expect(widgets[0]).not.toHaveProperty("properties");
            expect(widgets[0]).not.toHaveProperty("signals");
        });
    });

    describe("getAllCodegenMeta", () => {
        it("returns original meta array", () => {
            const meta = [createWidgetMeta(), createWidgetMeta({ className: "Label" })];
            const reader = new MetadataReader(meta);
            expect(reader.getAllCodegenMeta()).toBe(meta);
        });
    });
});
