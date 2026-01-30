/**
 * JSX Types Generator
 *
 * Generates JSX type definitions from:
 * - CodegenWidgetMeta: properties, signals, prop names, slots (from FFI generation)
 * - CodegenControllerMeta: properties, signals for event controllers
 */

import type { SourceFile } from "ts-morph";
import type { CodegenControllerMeta, CodegenWidgetMeta } from "../../../core/codegen-metadata.js";
import type { CodegenProject } from "../../../core/project.js";
import { toCamelCase } from "../../../core/utils/naming.js";
import { addNamespaceImports } from "../../../core/utils/structure-helpers.js";
import { type MetadataReader, sortWidgetsByClassName } from "../../metadata-reader.js";
import { ControllerPropsBuilder } from "./controller-props-builder.js";
import { IntrinsicElementsBuilder } from "./intrinsic-elements-builder.js";
import { WidgetPropsBuilder } from "./widget-props-builder.js";

export type JsxWidget = {
    className: string;
    jsxName: string;
    namespace: string;
    slots: readonly string[];
    hiddenProps: Set<string>;
    meta: CodegenWidgetMeta;
};

export class JsxTypesGenerator {
    private readonly propsBuilder = new WidgetPropsBuilder();
    private readonly controllerPropsBuilder = new ControllerPropsBuilder();
    private readonly intrinsicBuilder = new IntrinsicElementsBuilder();

    constructor(
        private readonly reader: MetadataReader,
        private readonly project: CodegenProject,
        private readonly namespaceNames: string[],
    ) {}

    generate(): void {
        const sourceFile = this.project.createReactSourceFile("jsx.ts");

        const widgets = this.getWidgets();
        const controllers = this.getControllers();
        this.propsBuilder.clearUsedNamespaces();
        this.controllerPropsBuilder.clearUsedNamespaces();

        this.generateBaseWidgetProps(sourceFile, widgets);
        this.generateWidgetPropsInterfaces(sourceFile, widgets);
        this.generateBaseControllerProps(sourceFile, controllers);
        this.generateControllerPropsInterfaces(sourceFile, controllers);
        this.addImports(sourceFile, widgets, controllers);

        this.intrinsicBuilder.buildWidgetSlotNamesType(sourceFile, widgets);
        this.intrinsicBuilder.buildWidgetExports(sourceFile, widgets);
        this.intrinsicBuilder.buildControllerExports(sourceFile, controllers);
        this.intrinsicBuilder.buildJsxNamespace(sourceFile, widgets, controllers);
        this.intrinsicBuilder.addModuleExport(sourceFile);
    }

    private getWidgets(): JsxWidget[] {
        const allMeta = this.reader.getAllCodegenMeta();

        const filtered = allMeta.filter((m) => this.namespaceNames.includes(m.namespace));
        const widgets = filtered.map((meta) => this.toJsxWidget(meta));

        return sortWidgetsByClassName(widgets);
    }

    private getControllers(): CodegenControllerMeta[] {
        return this.project.metadata
            .getAllControllerMeta()
            .filter((m) => this.namespaceNames.includes(m.namespace))
            .sort((a, b) => a.jsxName.localeCompare(b.jsxName));
    }

    private toJsxWidget(meta: CodegenWidgetMeta): JsxWidget {
        const hiddenProps = new Set(meta.hiddenPropNames);
        const filteredSlots = meta.slots.filter((slot) => !hiddenProps.has(toCamelCase(slot)));

        return {
            className: meta.className,
            jsxName: meta.jsxName,
            namespace: meta.namespace,
            slots: filteredSlots,
            hiddenProps,
            meta,
        };
    }

    private addImports(sourceFile: SourceFile, widgets: JsxWidget[], controllers: CodegenControllerMeta[]): void {
        sourceFile.addImportDeclaration({
            moduleSpecifier: "react",
            namedImports: ["ReactNode", "Ref"],
            isTypeOnly: true,
        });

        const usedNamespaces = new Set<string>(["Gtk"]);
        for (const widget of widgets) {
            usedNamespaces.add(widget.namespace);
        }

        for (const controller of controllers) {
            usedNamespaces.add(controller.namespace);
        }

        for (const ns of this.propsBuilder.getUsedNamespaces()) {
            usedNamespaces.add(ns);
        }

        for (const ns of this.controllerPropsBuilder.getUsedNamespaces()) {
            usedNamespaces.add(ns);
        }

        addNamespaceImports(sourceFile, usedNamespaces, { isTypeOnly: true });
    }

    private generateBaseWidgetProps(sourceFile: SourceFile, widgets: JsxWidget[]): void {
        const widgetMeta = widgets.find((w) => w.className === "Widget");
        if (!widgetMeta) return;

        this.propsBuilder.buildWidgetPropsInterface(
            sourceFile,
            "Gtk",
            widgetMeta.meta.properties,
            widgetMeta.meta.signals,
            undefined,
        );
    }

    private generateWidgetPropsInterfaces(sourceFile: SourceFile, widgets: JsxWidget[]): void {
        for (const widget of widgets) {
            if (widget.className === "Widget") continue;

            const filteredProperties = widget.meta.properties.filter((p) => !widget.hiddenProps.has(p.camelName));
            const filteredSignals = widget.meta.signals.filter((s) => !widget.hiddenProps.has(s.handlerName));

            this.propsBuilder.buildWidgetSpecificPropsInterface(
                sourceFile,
                widget,
                filteredProperties,
                filteredSignals,
            );
        }
    }

    private generateBaseControllerProps(sourceFile: SourceFile, controllers: CodegenControllerMeta[]): void {
        const eventControllerMeta = controllers.find((c) => c.className === "EventController");
        if (!eventControllerMeta) return;

        this.controllerPropsBuilder.buildBaseControllerPropsInterface(sourceFile, eventControllerMeta);
    }

    private generateControllerPropsInterfaces(sourceFile: SourceFile, controllers: CodegenControllerMeta[]): void {
        for (const controller of controllers) {
            this.controllerPropsBuilder.buildControllerPropsInterface(sourceFile, controller);
        }
    }
}
