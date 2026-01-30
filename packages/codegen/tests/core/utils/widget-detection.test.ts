import { describe, expect, it } from "vitest";
import { isWidgetType } from "../../../src/core/utils/widget-detection.js";
import {
    createButtonClass,
    createNormalizedClass,
    createNormalizedNamespace,
    createWidgetClass,
    qualifiedName,
} from "../../fixtures/gir-fixtures.js";
import { createMockRepository } from "../../fixtures/mock-repository.js";

describe("isWidgetType", () => {
    const widgetQN = qualifiedName("Gtk", "Widget");

    it("returns true for Gtk.Widget string", () => {
        const repo = createMockRepository();
        expect(isWidgetType("Gtk.Widget", repo, widgetQN)).toBe(true);
    });

    it("returns true for widget qualified name", () => {
        const repo = createMockRepository();
        expect(isWidgetType(widgetQN, repo, widgetQN)).toBe(true);
    });

    it("returns true for widget subclass", () => {
        const widgetClass = createWidgetClass();
        widgetClass._setRepository({
            resolveClass: () => undefined,
            resolveInterface: () => undefined,
            findClasses: () => [],
        } as Parameters<typeof widgetClass._setRepository>[0]);

        const buttonClass = createButtonClass();
        buttonClass._setRepository({
            resolveClass: () => widgetClass,
            resolveInterface: () => undefined,
            findClasses: () => [],
        } as Parameters<typeof buttonClass._setRepository>[0]);

        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([
                ["Widget", widgetClass],
                ["Button", buttonClass],
            ]),
        });

        const repo = createMockRepository(new Map([["Gtk", ns]]));
        expect(isWidgetType(qualifiedName("Gtk", "Button"), repo, widgetQN)).toBe(true);
    });

    it("returns false for non-qualified type name", () => {
        const repo = createMockRepository();
        expect(isWidgetType("Button", repo, widgetQN)).toBe(false);
    });

    it("returns false for non-widget class", () => {
        const applicationClass = createNormalizedClass({
            name: "Application",
            qualifiedName: qualifiedName("Gio", "Application"),
            parent: qualifiedName("GObject", "Object"),
        });

        const ns = createNormalizedNamespace({
            name: "Gio",
            classes: new Map([["Application", applicationClass]]),
        });

        const repo = createMockRepository(new Map([["Gio", ns]]));
        expect(isWidgetType(qualifiedName("Gio", "Application"), repo, widgetQN)).toBe(false);
    });

    it("returns false for unknown class", () => {
        const repo = createMockRepository();
        expect(isWidgetType(qualifiedName("Gtk", "Unknown"), repo, widgetQN)).toBe(false);
    });

    it("returns false for non-string type", () => {
        const repo = createMockRepository();
        expect(isWidgetType(123 as unknown as string, repo, widgetQN)).toBe(false);
    });
});
