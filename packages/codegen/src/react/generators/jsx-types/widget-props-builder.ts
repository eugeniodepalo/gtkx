/**
 * Widget Props Builder
 *
 * Builds widget props interfaces from GIR-derived metadata.
 * Generates pure GIR translations — no reconciler-specific knowledge.
 */

import type { SourceFile } from "ts-morph";
import type { PropertyAnalysis, SignalAnalysis } from "../../../core/generator-types.js";
import { toPascalCase } from "../../../core/utils/naming.js";
import { qualifyType } from "../../../core/utils/type-qualification.js";
import type { JsxWidget } from "./generator.js";
import { type PropInfo, PropsBuilderBase } from "./props-builder-base.js";

export class WidgetPropsBuilder extends PropsBuilderBase {
    buildWidgetPropsInterface(
        sourceFile: SourceFile,
        namespace: string,
        properties: readonly PropertyAnalysis[],
        signals: readonly SignalAnalysis[],
        widgetDoc?: string,
    ): void {
        const allProps: PropInfo[] = [];

        for (const prop of properties) {
            if (!prop.isWritable || (!prop.setter && !prop.isConstructOnly)) continue;
            this.trackNamespacesFromAnalysis(prop.referencedNamespaces);
            const qualifiedType = qualifyType(prop.type, namespace);
            const typeWithNull = prop.isNullable ? `${qualifiedType} | null` : qualifiedType;
            allProps.push({
                name: prop.camelName,
                type: typeWithNull,
                optional: true,
                doc: prop.doc ? this.formatDocDescription(prop.doc, namespace) : undefined,
            });
        }

        for (const signal of signals) {
            this.trackNamespacesFromAnalysis(signal.referencedNamespaces);
            allProps.push({
                name: signal.handlerName,
                type: `(${this.buildHandlerType(signal, "Widget", namespace)}) | null`,
                optional: true,
                doc: signal.doc ? this.formatDocDescription(signal.doc, namespace) : undefined,
            });
        }

        allProps.push({
            name: "children",
            type: "ReactNode",
            optional: true,
            doc: "Children elements (child widgets or event controllers).",
        });

        sourceFile.addInterface({
            name: "WidgetProps",
            isExported: true,
            docs: [
                {
                    description: widgetDoc
                        ? this.formatDocDescription(widgetDoc, namespace)
                        : "Base props shared by all GTK widget elements.",
                },
            ],
            properties: this.buildInterfaceProperties(allProps),
        });
    }

    buildWidgetSpecificPropsInterface(
        sourceFile: SourceFile,
        widget: JsxWidget,
        properties: readonly PropertyAnalysis[],
        signals: readonly SignalAnalysis[],
    ): void {
        const { namespace, jsxName, className } = widget;
        const widgetName = toPascalCase(className);
        const parentPropsName = this.getParentPropsName(widget);

        const allProps: PropInfo[] = [];

        for (const prop of properties) {
            if (!prop.isWritable || (!prop.setter && !prop.isConstructOnly)) continue;
            this.trackNamespacesFromAnalysis(prop.referencedNamespaces);
            const qualifiedType = qualifyType(prop.type, namespace);
            const isOptional = !prop.isRequired;
            const typeWithNull = prop.isNullable ? `${qualifiedType} | null` : qualifiedType;
            allProps.push({
                name: prop.camelName,
                type: typeWithNull,
                optional: isOptional,
                doc: prop.doc ? this.formatDocDescription(prop.doc, namespace) : undefined,
            });
        }

        for (const signal of signals) {
            this.trackNamespacesFromAnalysis(signal.referencedNamespaces);
            allProps.push({
                name: signal.handlerName,
                type: `(${this.buildHandlerType(signal, className, namespace)}) | null`,
                optional: true,
                doc: signal.doc ? this.formatDocDescription(signal.doc, namespace) : undefined,
            });
        }

        allProps.push({
            name: "ref",
            type: `Ref<${namespace}.${widgetName}>`,
            optional: true,
        });

        sourceFile.addInterface({
            name: `${jsxName}Props`,
            isExported: true,
            extends: [parentPropsName],
            docs: [{ description: `Props for the {@link ${jsxName}} widget.` }],
            properties: this.buildInterfaceProperties(allProps),
        });
    }

    private getParentPropsName(widget: JsxWidget): string {
        const { meta } = widget;
        const parentClassName = meta.parentClassName;
        const parentNamespace = meta.parentNamespace ?? meta.namespace;

        if (!parentClassName || parentClassName === "Widget") {
            return "WidgetProps";
        }

        const baseName = toPascalCase(parentClassName);
        return `${parentNamespace}${baseName}Props`;
    }
}
