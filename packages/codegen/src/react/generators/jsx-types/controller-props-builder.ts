/**
 * Controller Props Builder
 *
 * Builds controller props type aliases using pre-computed metadata.
 * Works with CodegenControllerMeta from FFI generation.
 */

import type { CodeBlockWriter, SourceFile, WriterFunction } from "ts-morph";
import type { CodegenControllerMeta } from "../../../core/codegen-metadata.js";
import { toPascalCase } from "../../../core/utils/naming.js";
import { qualifyType } from "../../../core/utils/type-qualification.js";
import { type PropInfo, PropsBuilderBase } from "./props-builder-base.js";

export class ControllerPropsBuilder extends PropsBuilderBase {
    buildBaseControllerPropsType(sourceFile: SourceFile): void {
        sourceFile.addTypeAlias({
            name: "EventControllerBaseProps",
            isExported: true,
            docs: [{ description: "Base props for all event controller elements." }],
            type: this.buildBasePropsWriter(),
        });
    }

    buildControllerPropsInterface(sourceFile: SourceFile, controller: CodegenControllerMeta): void {
        const { namespace, jsxName, className } = controller;
        const allProps: PropInfo[] = [];

        for (const prop of controller.properties) {
            if (!prop.isWritable || !prop.setter) continue;
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

        this.addSpecialControllerProps(allProps, controller);

        const controllerName = toPascalCase(className);
        allProps.push({
            name: "ref",
            type: `Ref<${namespace}.${controllerName}>`,
            optional: true,
        });

        const parentPropsName = this.getParentPropsName(controller);

        sourceFile.addTypeAlias({
            name: `${jsxName}Props`,
            isExported: true,
            docs: [{ description: `Props for the {@link ${jsxName}} controller element.` }],
            type: this.buildIntersectionTypeWriter(parentPropsName, allProps),
        });
    }

    private addSpecialControllerProps(allProps: PropInfo[], controller: CodegenControllerMeta): void {
        if (controller.className === "DragSource") {
            this.usedNamespaces.add("Gdk");
            allProps.push(
                {
                    name: "icon",
                    type: "Gdk.Paintable | null",
                    optional: true,
                    doc: "Paintable to use as the drag icon during DND operations.",
                },
                {
                    name: "iconHotX",
                    type: "number",
                    optional: true,
                    doc: "X coordinate of the hotspot relative to the drag icon's top-left corner.",
                },
                {
                    name: "iconHotY",
                    type: "number",
                    optional: true,
                    doc: "Y coordinate of the hotspot relative to the drag icon's top-left corner.",
                },
            );
        }

        if (controller.className === "DropTarget") {
            allProps.push({
                name: "types",
                type: "number[]",
                optional: true,
                doc: "Array of GTypes that this drop target accepts. Use typeFromName() to get GType values.",
            });
        }

        if (controller.className === "ShortcutController") {
            allProps.push({
                name: "children",
                type: "ReactNode",
                optional: true,
                doc: "Shortcut children (x.Shortcut elements).",
            });
        }
    }

    private getParentPropsName(controller: CodegenControllerMeta): string {
        const { parentClassName, parentNamespace } = controller;

        if (!parentClassName || parentClassName === "EventController") {
            return "EventControllerBaseProps";
        }

        const abstractControllers = new Set(["Gesture", "GestureSingle"]);
        if (abstractControllers.has(parentClassName)) {
            return "EventControllerBaseProps";
        }

        const baseName = toPascalCase(parentClassName);
        const ns = parentNamespace ?? controller.namespace;
        return `Omit<${ns}${baseName}Props, "ref">`;
    }

    private buildBasePropsWriter(): WriterFunction {
        return (writer: CodeBlockWriter) => {
            writer.write("{");
            writer.newLine();
            writer.indent(() => {
                writer.writeLine("/** Propagation phase for the controller. */");
                writer.writeLine("propagationPhase?: Gtk.PropagationPhase;");
                writer.writeLine("/** Propagation limit for the controller. */");
                writer.writeLine("propagationLimit?: Gtk.PropagationLimit;");
                writer.writeLine("/** Name for the controller (for debugging). */");
                writer.writeLine("name?: string | null;");
            });
            writer.write("}");
        };
    }
}
