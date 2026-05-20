import { describe, expect, it } from "vitest";
import { SignalAnalyzer } from "../../src/analyzers/signal-analyzer.js";
import { createAnalyzerSetup } from "../fixtures/analyzer-harness.js";
import {
    createNormalizedClass,
    createNormalizedNamespace,
    createNormalizedParameter,
    createNormalizedSignal,
    createNormalizedType,
    createWidgetClass,
    gtkNamespaceWith,
    NULL_REPO,
    qualifiedName,
    singleClassRepo,
} from "../fixtures/gir-fixtures.js";

const createTestSetup = (namespaces: Map<string, ReturnType<typeof createNormalizedNamespace>>) =>
    createAnalyzerSetup(SignalAnalyzer, namespaces);

describe("SignalAnalyzer / analyzeWidgetSignals (1)", () => {
    it("returns empty array for class with no signals", () => {
        const cls = createNormalizedClass({ signals: [] });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetSignals(cls);

        expect(result).toHaveLength(0);
    });

    it("analyzes signal with no parameters", () => {
        const cls = createNormalizedClass({
            name: "Button",
            parent: null,
            signals: [createNormalizedSignal({ name: "clicked" })],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetSignals(cls);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            name: "clicked",
            camelName: "clicked",
            handlerName: "onClicked",
            parameters: [],
            returnType: "void",
        });
    });
});

describe("SignalAnalyzer / analyzeWidgetSignals (2)", () => {
    it("generates correct handler name for hyphenated signal", () => {
        const cls = createNormalizedClass({
            name: "Window",
            parent: null,
            signals: [createNormalizedSignal({ name: "close-request" })],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetSignals(cls);

        expect(result[0]?.camelName).toBe("closeRequest");
        expect(result[0]?.handlerName).toBe("onCloseRequest");
    });
});

describe("SignalAnalyzer / analyzeWidgetSignals (3)", () => {
    it("analyzes signal parameters", () => {
        const cls = createNormalizedClass({
            name: "Scale",
            parent: null,
            signals: [
                createNormalizedSignal({
                    name: "change-value",
                    parameters: [
                        createNormalizedParameter({
                            name: "scroll",
                            type: createNormalizedType({ name: "gint" }),
                        }),
                        createNormalizedParameter({
                            name: "value",
                            type: createNormalizedType({ name: "gdouble" }),
                        }),
                    ],
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetSignals(cls);

        expect(result[0]?.parameters).toHaveLength(2);
        expect(result[0]?.parameters[0]).toMatchObject({
            name: "scroll",
            type: "number",
        });
        expect(result[0]?.parameters[1]).toMatchObject({
            name: "value",
            type: "number",
        });
    });
});

describe("SignalAnalyzer / analyzeWidgetSignals (4)", () => {
    it("converts parameter names to camelCase", () => {
        const cls = createNormalizedClass({
            name: "Widget",
            parent: null,
            signals: [
                createNormalizedSignal({
                    name: "query-tooltip",
                    parameters: [
                        createNormalizedParameter({
                            name: "keyboard_tooltip",
                            type: createNormalizedType({ name: "gboolean" }),
                        }),
                    ],
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetSignals(cls);

        expect(result[0]?.parameters[0]?.name).toBe("keyboardTooltip");
    });
});

describe("SignalAnalyzer / analyzeWidgetSignals (5)", () => {
    it("analyzes signal with return type", () => {
        const cls = createNormalizedClass({
            name: "Window",
            parent: null,
            signals: [
                createNormalizedSignal({
                    name: "close-request",
                    returnType: createNormalizedType({ name: "gboolean" }),
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetSignals(cls);

        expect(result[0]?.returnType).toBe("boolean");
    });
});

describe("SignalAnalyzer / analyzeWidgetSignals (6)", () => {
    it("excludes signals inherited from parent class", () => {
        const widgetClass = createWidgetClass({}, NULL_REPO);
        const buttonClass = createNormalizedClass(
            {
                name: "Button",
                qualifiedName: qualifiedName("Gtk", "Button"),
                parent: qualifiedName("Gtk", "Widget"),
                signals: [createNormalizedSignal({ name: "clicked" }), createNormalizedSignal({ name: "activate" })],
            },
            singleClassRepo(widgetClass),
        );

        const ns = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([
                ["Widget", widgetClass],
                ["Button", buttonClass],
            ]),
        });
        const { analyzer } = createTestSetup(new Map([["Gtk", ns]]));

        const result = analyzer.analyzeWidgetSignals(buttonClass);

        expect(result.map((s) => s.name)).toContain("clicked");
        expect(result.map((s) => s.name)).toContain("activate");
        expect(result.map((s) => s.name)).not.toContain("destroy");
        expect(result.map((s) => s.name)).not.toContain("show");
    });
});

describe("SignalAnalyzer / analyzeWidgetSignals (7)", () => {
    it("preserves documentation", () => {
        const cls = createNormalizedClass({
            name: "Button",
            parent: null,
            signals: [
                createNormalizedSignal({
                    name: "clicked",
                    doc: "Emitted when the button is clicked.",
                }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetSignals(cls);

        expect(result[0]?.doc).toBe("Emitted when the button is clicked.");
    });
});

describe("SignalAnalyzer / analyzeWidgetSignals (8)", () => {
    it("tracks external namespace references in parameters", () => {
        const gdkEvent = createNormalizedClass({
            name: "Event",
            qualifiedName: qualifiedName("Gdk", "Event"),
        });
        const gdkNs = createNormalizedNamespace({
            name: "Gdk",
            classes: new Map([["Event", gdkEvent]]),
        });

        const widgetClass = createNormalizedClass({
            name: "Widget",
            parent: null,
            signals: [
                createNormalizedSignal({
                    name: "event",
                    parameters: [
                        createNormalizedParameter({
                            name: "event",
                            type: createNormalizedType({ name: "Gdk.Event" }),
                        }),
                    ],
                }),
            ],
        });
        const gtkNs = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([["Widget", widgetClass]]),
        });

        const { analyzer } = createTestSetup(
            new Map([
                ["Gtk", gtkNs],
                ["Gdk", gdkNs],
            ]),
        );

        const result = analyzer.analyzeWidgetSignals(widgetClass);

        expect(result[0]?.referencedNamespaces).toContain("Gdk");
    });
});

describe("SignalAnalyzer / analyzeWidgetSignals (9)", () => {
    it("tracks external namespace references in return type", () => {
        const gdkDragSurface = createNormalizedClass({
            name: "DragSurface",
            qualifiedName: qualifiedName("Gdk", "DragSurface"),
        });
        const gdkNs = createNormalizedNamespace({
            name: "Gdk",
            classes: new Map([["DragSurface", gdkDragSurface]]),
        });

        const dndClass = createNormalizedClass({
            name: "DragSource",
            parent: null,
            signals: [
                createNormalizedSignal({
                    name: "drag-begin",
                    returnType: createNormalizedType({ name: "Gdk.DragSurface" }),
                }),
            ],
        });
        const gtkNs = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([["DragSource", dndClass]]),
        });

        const { analyzer } = createTestSetup(
            new Map([
                ["Gtk", gtkNs],
                ["Gdk", gdkNs],
            ]),
        );

        const result = analyzer.analyzeWidgetSignals(dndClass);

        expect(result[0]?.referencedNamespaces).toContain("Gdk");
    });
});

describe("SignalAnalyzer / analyzeWidgetSignals (10)", () => {
    it("handles multiple signals", () => {
        const cls = createNormalizedClass({
            name: "Entry",
            parent: null,
            signals: [
                createNormalizedSignal({ name: "activate" }),
                createNormalizedSignal({ name: "changed" }),
                createNormalizedSignal({ name: "icon-press" }),
            ],
        });
        const { analyzer } = createTestSetup(gtkNamespaceWith(cls));

        const result = analyzer.analyzeWidgetSignals(cls);

        expect(result).toHaveLength(3);
        expect(result.map((s) => s.name)).toContain("activate");
        expect(result.map((s) => s.name)).toContain("changed");
        expect(result.map((s) => s.name)).toContain("icon-press");
    });
});

describe("SignalAnalyzer / analyzeWidgetSignals (11)", () => {
    it("qualifies external types in parameter type", () => {
        const gdkDevice = createNormalizedClass({
            name: "Device",
            qualifiedName: qualifiedName("Gdk", "Device"),
        });
        const gdkNs = createNormalizedNamespace({
            name: "Gdk",
            classes: new Map([["Device", gdkDevice]]),
        });

        const gestureClass = createNormalizedClass({
            name: "Gesture",
            parent: null,
            signals: [
                createNormalizedSignal({
                    name: "begin",
                    parameters: [
                        createNormalizedParameter({
                            name: "device",
                            type: createNormalizedType({ name: "Gdk.Device" }),
                        }),
                    ],
                }),
            ],
        });
        const gtkNs = createNormalizedNamespace({
            name: "Gtk",
            classes: new Map([["Gesture", gestureClass]]),
        });

        const { analyzer } = createTestSetup(
            new Map([
                ["Gtk", gtkNs],
                ["Gdk", gdkNs],
            ]),
        );

        const result = analyzer.analyzeWidgetSignals(gestureClass);

        expect(result[0]?.parameters[0]?.type).toBe("Gdk.Device");
    });
});
