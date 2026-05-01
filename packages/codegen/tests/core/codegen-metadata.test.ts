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
    describe("addWidgetMeta / getAllWidgetMeta", () => {
        it("returns empty array when no metadata added", () => {
            const metadata = new CodegenMetadata();
            expect(metadata.getAllWidgetMeta()).toEqual([]);
        });

        it("returns all stored widget metadata in insertion order", () => {
            const metadata = new CodegenMetadata();

            metadata.addWidgetMeta(createButtonMeta());
            metadata.addWidgetMeta(createWindowMeta());
            metadata.addWidgetMeta(createLabelMeta());

            const result = metadata.getAllWidgetMeta();

            expect(result).toHaveLength(3);
            expect(result.map((m) => m.className)).toEqual(["Button", "Window", "Label"]);
        });

        it("preserves insertion order across multiple additions", () => {
            const metadata = new CodegenMetadata();
            const classNames = ["First", "Second", "Third"];

            for (const className of classNames) {
                metadata.addWidgetMeta(createCodegenWidgetMeta({ className }));
            }

            expect(metadata.getAllWidgetMeta().map((m) => m.className)).toEqual(classNames);
        });
    });

    describe("metadata structure", () => {
        it("stores all widget metadata properties", () => {
            const metadata = new CodegenMetadata();
            metadata.addWidgetMeta(createWidgetMeta());

            const [result] = metadata.getAllWidgetMeta();

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
            metadata.addWidgetMeta(
                createCodegenWidgetMeta({
                    className: "HeaderBar",
                    namespace: "Adw",
                    jsxName: "AdwHeaderBar",
                    parentClassName: "Widget",
                    parentNamespace: "Gtk",
                }),
            );

            const [result] = metadata.getAllWidgetMeta();

            expect(result?.namespace).toBe("Adw");
            expect(result?.parentClassName).toBe("Widget");
            expect(result?.parentNamespace).toBe("Gtk");
        });

        it("stores property and signal analysis results", () => {
            const metadata = new CodegenMetadata();
            metadata.addWidgetMeta(createButtonMeta());

            const [result] = metadata.getAllWidgetMeta();

            expect(result?.properties.map((p) => p.name)).toEqual(expect.arrayContaining(["label", "icon-name"]));
            expect(result?.signals.map((s) => s.name)).toContain("clicked");
            expect(result?.signals.map((s) => s.handlerName)).toContain("onClicked");
        });
    });

    describe("multiple metadata instances", () => {
        it("are independent", () => {
            const metadata1 = new CodegenMetadata();
            const metadata2 = new CodegenMetadata();

            metadata1.addWidgetMeta(createButtonMeta());

            expect(metadata1.getAllWidgetMeta()).toHaveLength(1);
            expect(metadata2.getAllWidgetMeta()).toHaveLength(0);
        });
    });
});
