import type { CodegenWidgetMeta } from "../../src/core/codegen-metadata.js";
import { getHiddenPropNames } from "../../src/core/config/index.js";
import type { PropertyAnalysis, SignalAnalysis } from "../../src/core/generator-types.js";

export function createPropertyAnalysis(overrides: Partial<PropertyAnalysis> = {}): PropertyAnalysis {
    return {
        name: "label",
        camelName: "label",
        type: "string",
        isRequired: false,
        isWritable: true,
        isNullable: false,
        getter: "getLabel",
        setter: "setLabel",
        referencedNamespaces: [],
        ...overrides,
    };
}

export function createSignalAnalysis(overrides: Partial<SignalAnalysis> = {}): SignalAnalysis {
    return {
        name: "clicked",
        camelName: "clicked",
        handlerName: "onClicked",
        parameters: [],
        returnType: "void",
        referencedNamespaces: [],
        ...overrides,
    };
}

export function createCodegenWidgetMeta(overrides: Partial<CodegenWidgetMeta> = {}): CodegenWidgetMeta {
    const className = overrides.className ?? "Button";
    return {
        className,
        namespace: "Gtk",
        jsxName: "GtkButton",
        slots: [],
        propNames: ["label", "icon-name"],
        signalNames: ["clicked"],
        parentClassName: "Widget",
        parentNamespace: "Gtk",
        modulePath: "./gtk/button.js",
        properties: [createPropertyAnalysis()],
        signals: [createSignalAnalysis()],
        doc: undefined,
        hiddenPropNames: getHiddenPropNames(className),
        ...overrides,
    };
}

export function createWidgetMeta(overrides: Partial<CodegenWidgetMeta> = {}): CodegenWidgetMeta {
    return createCodegenWidgetMeta({
        className: "Widget",
        jsxName: "GtkWidget",
        slots: [],
        parentClassName: null,
        parentNamespace: null,
        modulePath: "./gtk/widget.js",
        propNames: ["visible", "sensitive", "can-focus"],
        signalNames: ["destroy", "show", "notify"],
        properties: [
            createPropertyAnalysis({ name: "visible", camelName: "visible", type: "boolean" }),
            createPropertyAnalysis({ name: "sensitive", camelName: "sensitive", type: "boolean" }),
            createPropertyAnalysis({ name: "can-focus", camelName: "canFocus", type: "boolean" }),
        ],
        signals: [
            createSignalAnalysis({ name: "destroy", camelName: "destroy", handlerName: "onDestroy" }),
            createSignalAnalysis({ name: "show", camelName: "show", handlerName: "onShow" }),
            createSignalAnalysis({
                name: "notify",
                camelName: "notify",
                handlerName: "onNotify",
                parameters: [{ name: "pspec", type: "GObject.ParamSpec" }],
                referencedNamespaces: ["GObject"],
            }),
        ],
        ...overrides,
    });
}

export function createWindowMeta(overrides: Partial<CodegenWidgetMeta> = {}): CodegenWidgetMeta {
    return createCodegenWidgetMeta({
        className: "Window",
        jsxName: "GtkWindow",
        slots: ["child"],
        parentClassName: "Widget",
        parentNamespace: "Gtk",
        modulePath: "./gtk/window.js",
        propNames: ["title", "default-width", "default-height"],
        signalNames: ["close-request"],
        properties: [
            createPropertyAnalysis({ name: "title", camelName: "title", type: "string | null" }),
            createPropertyAnalysis({
                name: "default-width",
                camelName: "defaultWidth",
                type: "number",
            }),
            createPropertyAnalysis({
                name: "default-height",
                camelName: "defaultHeight",
                type: "number",
            }),
        ],
        signals: [
            createSignalAnalysis({
                name: "close-request",
                camelName: "closeRequest",
                handlerName: "onCloseRequest",
                returnType: "boolean",
            }),
        ],
        ...overrides,
    });
}

export function createButtonMeta(overrides: Partial<CodegenWidgetMeta> = {}): CodegenWidgetMeta {
    return createCodegenWidgetMeta({
        className: "Button",
        jsxName: "GtkButton",
        slots: ["child"],
        parentClassName: "Widget",
        parentNamespace: "Gtk",
        modulePath: "./gtk/button.js",
        propNames: ["label", "icon-name"],
        signalNames: ["clicked", "activate"],
        properties: [
            createPropertyAnalysis({ name: "label", camelName: "label", type: "string | null" }),
            createPropertyAnalysis({
                name: "icon-name",
                camelName: "iconName",
                type: "string | null",
            }),
        ],
        signals: [
            createSignalAnalysis({ name: "clicked", camelName: "clicked", handlerName: "onClicked" }),
            createSignalAnalysis({ name: "activate", camelName: "activate", handlerName: "onActivate" }),
        ],
        ...overrides,
    });
}

export function createLabelMeta(overrides: Partial<CodegenWidgetMeta> = {}): CodegenWidgetMeta {
    return createCodegenWidgetMeta({
        className: "Label",
        jsxName: "GtkLabel",
        slots: [],
        parentClassName: "Widget",
        parentNamespace: "Gtk",
        modulePath: "./gtk/label.js",
        propNames: ["label", "use-markup", "wrap"],
        signalNames: [],
        properties: [
            createPropertyAnalysis({ name: "label", camelName: "label", type: "string | null" }),
            createPropertyAnalysis({ name: "use-markup", camelName: "useMarkup", type: "boolean" }),
            createPropertyAnalysis({ name: "wrap", camelName: "wrap", type: "boolean" }),
        ],
        signals: [],
        ...overrides,
    });
}

