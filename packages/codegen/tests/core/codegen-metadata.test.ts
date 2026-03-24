import { describe, expect, it } from "vitest";
import { CodegenMetadata } from "../../src/core/codegen-metadata.js";
import {
    createButtonMeta,
    createCodegenWidgetMeta,
    createLabelMeta,
    createWidgetMeta,
    createWindowMeta,
} from "../fixtures/metadata-fixtures.js";

describe("CodegenMetadata", () => {
    describe("setWidgetMeta / getWidgetMeta", () => {
        it("stores and retrieves widget metadata", () => {
            const metadata = new CodegenMetadata();
            const widgetMeta = createButtonMeta();

            metadata.setWidgetMeta("button.ts", widgetMeta);
            const result = metadata.getWidgetMeta("button.ts");

            expect(result).toEqual(widgetMeta);
        });

        it("returns null for unknown key", () => {
            const metadata = new CodegenMetadata();

            const result = metadata.getWidgetMeta("unknown.ts");

            expect(result).toBeNull();
        });

        it("overwrites existing metadata for same key", () => {
            const metadata = new CodegenMetadata();

            const firstMeta = createButtonMeta({ className: "OldButton" });
            const secondMeta = createButtonMeta({ className: "NewButton" });

            metadata.setWidgetMeta("button.ts", firstMeta);
            metadata.setWidgetMeta("button.ts", secondMeta);

            const result = metadata.getWidgetMeta("button.ts");
            expect(result?.className).toBe("NewButton");
        });

        it("stores metadata for different keys independently", () => {
            const metadata = new CodegenMetadata();

            const buttonMeta = createButtonMeta();
            const windowMeta = createWindowMeta();

            metadata.setWidgetMeta("button.ts", buttonMeta);
            metadata.setWidgetMeta("window.ts", windowMeta);

            expect(metadata.getWidgetMeta("button.ts")?.className).toBe("Button");
            expect(metadata.getWidgetMeta("window.ts")?.className).toBe("Window");
        });
    });

    describe("getAllWidgetMeta", () => {
        it("returns empty array when no metadata stored", () => {
            const metadata = new CodegenMetadata();

            const result = metadata.getAllWidgetMeta();

            expect(result).toEqual([]);
        });

        it("returns all stored widget metadata", () => {
            const metadata = new CodegenMetadata();

            metadata.setWidgetMeta("button.ts", createButtonMeta());
            metadata.setWidgetMeta("window.ts", createWindowMeta());
            metadata.setWidgetMeta("label.ts", createLabelMeta());

            const result = metadata.getAllWidgetMeta();

            expect(result).toHaveLength(3);
            expect(result.map((m) => m.className)).toContain("Button");
            expect(result.map((m) => m.className)).toContain("Window");
            expect(result.map((m) => m.className)).toContain("Label");
        });

        it("returns metadata in insertion order", () => {
            const metadata = new CodegenMetadata();

            const files = ["first.ts", "second.ts", "third.ts"];
            const classNames = ["First", "Second", "Third"];

            files.forEach((file, i) => {
                metadata.setWidgetMeta(file, createCodegenWidgetMeta({ className: classNames[i] }));
            });

            const result = metadata.getAllWidgetMeta();

            expect(result.map((m) => m.className)).toEqual(["First", "Second", "Third"]);
        });

        it("does not return overwritten metadata", () => {
            const metadata = new CodegenMetadata();

            metadata.setWidgetMeta("button.ts", createButtonMeta({ className: "OldButton" }));
            metadata.setWidgetMeta("button.ts", createButtonMeta({ className: "NewButton" }));

            const result = metadata.getAllWidgetMeta();

            expect(result).toHaveLength(1);
            expect(result[0]?.className).toBe("NewButton");
        });
    });

    describe("clear", () => {
        it("removes all stored metadata", () => {
            const metadata = new CodegenMetadata();

            metadata.setWidgetMeta("button.ts", createButtonMeta());
            metadata.setWidgetMeta("window.ts", createWindowMeta());

            metadata.clear();

            expect(metadata.getAllWidgetMeta()).toHaveLength(0);
            expect(metadata.getWidgetMeta("button.ts")).toBeNull();
            expect(metadata.getWidgetMeta("window.ts")).toBeNull();
        });

        it("allows adding metadata after clear", () => {
            const metadata = new CodegenMetadata();

            metadata.setWidgetMeta("button.ts", createButtonMeta());
            metadata.clear();
            metadata.setWidgetMeta("button.ts", createWindowMeta());

            expect(metadata.getWidgetMeta("button.ts")?.className).toBe("Window");
        });

        it("handles clear on empty metadata", () => {
            const metadata = new CodegenMetadata();

            expect(() => metadata.clear()).not.toThrow();
            expect(metadata.getAllWidgetMeta()).toHaveLength(0);
        });
    });

    describe("metadata structure", () => {
        it("stores all widget metadata properties", () => {
            const metadata = new CodegenMetadata();

            const widgetMeta = createWidgetMeta();
            metadata.setWidgetMeta("widget.ts", widgetMeta);

            const result = metadata.getWidgetMeta("widget.ts");

            expect(result).toMatchObject({
                className: "Widget",
                namespace: "Gtk",
                jsxName: "GtkWidget",
                parentClassName: null,
                parentNamespace: null,
            });
            expect(result?.propNames).toContain("visible");
            expect(result?.signalNames).toContain("destroy");
        });

        it("stores cross-namespace inheritance info", () => {
            const metadata = new CodegenMetadata();

            const adwMeta = createCodegenWidgetMeta({
                className: "HeaderBar",
                namespace: "Adw",
                jsxName: "AdwHeaderBar",
                parentClassName: "Widget",
                parentNamespace: "Gtk",
            });

            metadata.setWidgetMeta("header-bar.ts", adwMeta);
            const result = metadata.getWidgetMeta("header-bar.ts");

            expect(result?.namespace).toBe("Adw");
            expect(result?.parentClassName).toBe("Widget");
            expect(result?.parentNamespace).toBe("Gtk");
        });

        it("stores property analysis results", () => {
            const metadata = new CodegenMetadata();

            const buttonMeta = createButtonMeta();
            metadata.setWidgetMeta("button.ts", buttonMeta);

            const result = metadata.getWidgetMeta("button.ts");

            expect(result?.properties).toHaveLength(2);
            expect(result?.properties.map((p) => p.name)).toContain("label");
            expect(result?.properties.map((p) => p.name)).toContain("icon-name");
        });

        it("stores signal analysis results", () => {
            const metadata = new CodegenMetadata();

            const buttonMeta = createButtonMeta();
            metadata.setWidgetMeta("button.ts", buttonMeta);

            const result = metadata.getWidgetMeta("button.ts");

            expect(result?.signals).toHaveLength(2);
            expect(result?.signals.map((s) => s.name)).toContain("clicked");
            expect(result?.signals.map((s) => s.handlerName)).toContain("onClicked");
        });
    });

    describe("multiple metadata instances", () => {
        it("different CodegenMetadata instances are independent", () => {
            const metadata1 = new CodegenMetadata();
            const metadata2 = new CodegenMetadata();

            metadata1.setWidgetMeta("button.ts", createButtonMeta());

            expect(metadata1.getWidgetMeta("button.ts")).toBeDefined();
            expect(metadata2.getWidgetMeta("button.ts")).toBeNull();
        });
    });
});
