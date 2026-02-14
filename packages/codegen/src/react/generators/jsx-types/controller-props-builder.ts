/**
 * Controller Props Builder
 *
 * Builds controller props interfaces from GIR-derived metadata.
 * Generates pure GIR translations — no reconciler-specific knowledge.
 */

import type { SourceFile } from "ts-morph";
import type { CodegenControllerMeta } from "../../../core/codegen-metadata.js";
import { toPascalCase } from "../../../core/utils/naming.js";
import { qualifyType } from "../../../core/utils/type-qualification.js";
import { type PropInfo, PropsBuilderBase } from "./props-builder-base.js";

export class ControllerPropsBuilder extends PropsBuilderBase {
    buildBaseControllerPropsInterface(sourceFile: SourceFile, eventControllerMeta: CodegenControllerMeta): void {
        const { namespace } = eventControllerMeta;
        const allProps: PropInfo[] = [];

        for (const prop of eventControllerMeta.properties) {
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

        for (const signal of eventControllerMeta.signals) {
            this.trackNamespacesFromAnalysis(signal.referencedNamespaces);
            allProps.push({
                name: signal.handlerName,
                type: `${this.buildHandlerType(signal, "EventController", namespace)} | null`,
                optional: true,
                doc: signal.doc ? this.formatDocDescription(signal.doc, namespace) : undefined,
            });
        }

        allProps.push({
            name: "children",
            type: "ReactNode",
            optional: true,
        });

        sourceFile.addInterface({
            name: "EventControllerBaseProps",
            isExported: true,
            docs: [
                {
                    description: eventControllerMeta.doc
                        ? this.formatDocDescription(eventControllerMeta.doc, namespace)
                        : "Base props for all event controller elements.",
                },
            ],
            properties: this.buildInterfaceProperties(allProps),
        });
    }

    buildControllerPropsInterface(sourceFile: SourceFile, controller: CodegenControllerMeta): void {
        if (controller.className === "EventController") return;

        const { namespace, jsxName, className } = controller;
        const allProps: PropInfo[] = [];

        for (const prop of controller.properties) {
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

        for (const signal of controller.signals) {
            this.trackNamespacesFromAnalysis(signal.referencedNamespaces);
            allProps.push({
                name: signal.handlerName,
                type: `${this.buildHandlerType(signal, className, namespace)} | null`,
                optional: true,
                doc: signal.doc ? this.formatDocDescription(signal.doc, namespace) : undefined,
            });
        }

        const controllerName = toPascalCase(className);

        allProps.push({
            name: "ref",
            type: `Ref<${namespace}.${controllerName}>`,
            optional: true,
        });

        const parentPropsName = this.getParentPropsName(controller);

        sourceFile.addInterface({
            name: `${jsxName}Props`,
            isExported: true,
            extends: [parentPropsName],
            docs: [{ description: `Props for the {@link ${jsxName}} controller element.` }],
            properties: this.buildInterfaceProperties(allProps),
        });
    }

    private getParentPropsName(controller: CodegenControllerMeta): string {
        const { parentClassName, parentNamespace } = controller;

        if (!parentClassName || parentClassName === "EventController") {
            return "EventControllerBaseProps";
        }

        const baseName = toPascalCase(parentClassName);
        const ns = parentNamespace ?? controller.namespace;
        return `${ns}${baseName}Props`;
    }
}
