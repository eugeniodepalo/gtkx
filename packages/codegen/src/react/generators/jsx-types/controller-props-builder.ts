/**
 * Controller Props Builder
 *
 * Builds controller props interfaces from GIR-derived metadata.
 * Generates pure GIR translations -- no reconciler-specific knowledge.
 */

import type { InterfaceDeclarationBuilder } from "../../../builders/index.js";
import { interfaceDecl } from "../../../builders/index.js";
import type { CodegenControllerMeta } from "../../../core/codegen-metadata.js";
import { toPascalCase } from "../../../core/utils/naming.js";
import { type PropInfo, PropsBuilderBase } from "./props-builder-base.js";

export class ControllerPropsBuilder extends PropsBuilderBase {
    buildBaseControllerPropsInterface(eventControllerMeta: CodegenControllerMeta): InterfaceDeclarationBuilder {
        const { namespace } = eventControllerMeta;

        const allProps: PropInfo[] = [
            ...this.collectPropInfos(eventControllerMeta.properties, namespace).map((p) => ({ ...p, optional: true })),
            ...this.collectSignalInfos(eventControllerMeta.signals, "EventController", namespace),
            { name: "children", type: "ReactNode", optional: true },
        ];

        const iface = interfaceDecl("EventControllerBaseProps", {
            exported: true,
            doc: eventControllerMeta.doc
                ? this.formatDocDescription(eventControllerMeta.doc, namespace)
                : "Base props for all event controller elements.",
        });

        this.applyProps(iface, allProps);
        return iface;
    }

    buildControllerPropsInterface(controller: CodegenControllerMeta): InterfaceDeclarationBuilder | null {
        if (controller.className === "EventController") return null;

        const { namespace, jsxName, className } = controller;
        const controllerName = toPascalCase(className);

        const allProps: PropInfo[] = [
            ...this.collectPropInfos(controller.properties, namespace).map((p) => ({ ...p, optional: true })),
            ...this.collectSignalInfos(controller.signals, className, namespace),
            { name: "ref", type: `Ref<${namespace}.${controllerName}>`, optional: true },
        ];

        const parentPropsName = this.resolveParentPropsName(
            {
                namespace,
                parentClassName: controller.parentClassName === "EventController" ? null : controller.parentClassName,
                parentNamespace: controller.parentNamespace,
            },
            "EventControllerBaseProps",
        );

        const iface = interfaceDecl(`${jsxName}Props`, {
            exported: true,
            extends: [parentPropsName],
            doc: `Props for the \`${jsxName}\` controller element.`,
        });

        this.applyProps(iface, allProps);
        return iface;
    }
}
