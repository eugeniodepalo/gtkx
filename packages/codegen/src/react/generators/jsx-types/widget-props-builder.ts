/**
 * Widget Props Builder
 *
 * Builds widget props interfaces from GIR-derived metadata.
 * Generates pure GIR translations -- no reconciler-specific knowledge.
 */

import type { InterfaceDeclarationBuilder } from "../../../builders/index.js";
import { interfaceDecl } from "../../../builders/index.js";
import type { PropertyAnalysis, SignalAnalysis } from "../../../core/generator-types.js";
import { toPascalCase } from "../../../core/utils/naming.js";
import type { JsxWidget } from "./generator.js";
import { type PropInfo, PropsBuilderBase } from "./props-builder-base.js";

export class WidgetPropsBuilder extends PropsBuilderBase {
    private slotPropNames = new Set<string>();

    setSlotPropNames(names: ReadonlySet<string>): void {
        this.slotPropNames = new Set(names);
    }

    buildWidgetPropsInterface(
        namespace: string,
        properties: readonly PropertyAnalysis[],
        signals: readonly SignalAnalysis[],
        widgetDoc?: string,
    ): InterfaceDeclarationBuilder {
        const allProps: PropInfo[] = [
            ...this.collectPropInfos(properties, namespace).map((p) => ({ ...p, optional: true })),
            ...this.collectSignalInfos(signals, "Widget", namespace, (h) => `(${h}) | null`),
            {
                name: "children",
                type: "ReactNode",
                optional: true,
                doc: "Children elements (child widgets or event controllers).",
            },
        ];

        const iface = interfaceDecl("WidgetProps", {
            exported: true,
            doc: widgetDoc
                ? this.formatDocDescription(widgetDoc, namespace)
                : "Base props shared by all GTK widget elements.",
        });

        this.applyProps(iface, allProps);
        return iface;
    }

    buildWidgetSpecificPropsInterface(
        widget: JsxWidget,
        properties: readonly PropertyAnalysis[],
        signals: readonly SignalAnalysis[],
    ): InterfaceDeclarationBuilder {
        const { namespace, jsxName, className } = widget;
        const widgetName = toPascalCase(className);
        const parentPropsName = this.resolveParentPropsName(
            {
                namespace,
                parentClassName: widget.meta.parentClassName === "Widget" ? null : widget.meta.parentClassName,
                parentNamespace: widget.meta.parentNamespace,
            },
            "WidgetProps",
        );

        const allProps: PropInfo[] = [
            ...this.collectPropInfos(properties, namespace, this.slotPropNames),
            ...this.collectSignalInfos(signals, className, namespace, (h) => `(${h}) | null`),
            { name: "ref", type: `Ref<${namespace}.${widgetName}>`, optional: true },
        ];

        const iface = interfaceDecl(`${jsxName}Props`, {
            exported: true,
            extends: [parentPropsName],
            doc: `Props for the \`${jsxName}\` widget.`,
        });

        this.applyProps(iface, allProps);
        return iface;
    }
}
