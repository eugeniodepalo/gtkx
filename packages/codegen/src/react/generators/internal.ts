/**
 * Internal Generator
 *
 * Generates internal.ts for the reconciler.
 * Contains runtime prop/signal resolution and construction metadata.
 */

import { type SourceFile, type WriterFunction, Writers } from "ts-morph";

import type { PropertyAnalysis, SignalAnalysis } from "../../core/generator-types.js";
import type { CodegenProject } from "../../core/project.js";
import { toCamelCase } from "../../core/utils/naming.js";
import { createConstExport, writeObjectOrEmpty } from "../../core/utils/structure-helpers.js";
import { type MetadataReader, sortWidgetsByClassName } from "../metadata-reader.js";

type ClassItem = {
    readonly jsxName: string;
    readonly properties: readonly PropertyAnalysis[];
    readonly signals: readonly SignalAnalysis[];
};

export class InternalGenerator {
    constructor(
        private readonly reader: MetadataReader,
        private readonly project: CodegenProject,
    ) {}

    generate(): SourceFile {
        const sourceFile = this.project.createReactSourceFile("internal.ts");

        sourceFile.addStatements(
            "/**\n * Internal metadata for the reconciler.\n * Runtime prop/signal resolution and construction metadata.\n * Not part of the public API.\n */\n",
        );

        const items = this.collectClassItems();

        this.addTypeImports(sourceFile);
        this.generateConstructionMeta(sourceFile, items);
        this.generatePropsMap(sourceFile, items);
        this.generateSignalsMap(sourceFile, items);

        return sourceFile;
    }

    private collectClassItems(): ClassItem[] {
        const widgets = sortWidgetsByClassName(this.reader.getAllWidgets());
        const controllers = this.project.metadata
            .getAllControllerMeta()
            .sort((a, b) => a.className.localeCompare(b.className));

        const metaByJsxName = new Map(this.reader.getAllCodegenMeta().map((m) => [m.jsxName, m]));

        const items: ClassItem[] = [];

        for (const widget of widgets) {
            const meta = metaByJsxName.get(widget.jsxName);
            if (meta) items.push(meta);
        }

        for (const controller of controllers) {
            items.push(controller);
        }

        return items;
    }

    private addTypeImports(sourceFile: SourceFile): void {
        sourceFile.addImportDeclaration({
            moduleSpecifier: "@gtkx/ffi",
            namedImports: ["Type"],
            isTypeOnly: true,
        });
    }

    private generateConstructionMeta(sourceFile: SourceFile, items: readonly ClassItem[]): void {
        const allEntries: Record<string, WriterFunction> = {};

        for (const item of items) {
            const propEntries: Record<string, string> = {};

            for (const prop of item.properties) {
                if (!prop.isWritable || !prop.ffiType) continue;
                const base = `{ girName: "${prop.name}", ffiType: ${JSON.stringify(prop.ffiType)}`;
                propEntries[`"${prop.camelName}"`] = prop.isConstructOnly
                    ? `${base}, constructOnly: true as const }`
                    : `${base} }`;
            }

            if (Object.keys(propEntries).length > 0) {
                allEntries[item.jsxName] = Writers.object(propEntries);
            }
        }

        sourceFile.addVariableStatement(
            createConstExport("CONSTRUCTION_META", writeObjectOrEmpty(allEntries, Writers), {
                type: "Record<string, Record<string, { girName: string; ffiType: Type; constructOnly?: true }>>",
                docs: "Construction metadata for all writable properties. Used by the reconciler to create widgets via g_object_new_with_properties.",
            }),
        );
    }

    private generatePropsMap(sourceFile: SourceFile, items: readonly ClassItem[]): void {
        const allEntries: Record<string, WriterFunction> = {};

        for (const item of items) {
            if (item.properties.length === 0) continue;

            const propEntries: Record<string, string> = {};

            for (const prop of item.properties) {
                if (!prop.isWritable || !prop.setter) continue;

                const getterName = prop.getter ? toCamelCase(prop.getter) : null;
                const setterName = toCamelCase(prop.setter);
                propEntries[`"${prop.camelName}"`] = `[${getterName ? `"${getterName}"` : "null"}, "${setterName}"]`;
            }

            if (Object.keys(propEntries).length > 0) {
                allEntries[item.jsxName] = Writers.object(propEntries);
            }
        }

        sourceFile.addVariableStatement(
            createConstExport("PROPS", writeObjectOrEmpty(allEntries, Writers), {
                type: "Record<string, Record<string, [string | null, string]>>",
            }),
        );
    }

    private generateSignalsMap(sourceFile: SourceFile, items: readonly ClassItem[]): void {
        const allEntries: Record<string, WriterFunction> = {};

        for (const item of items) {
            if (item.signals.length === 0) continue;

            const signalEntries: Record<string, string> = {};

            for (const signal of item.signals) {
                signalEntries[`"${signal.handlerName}"`] = `"${signal.name}"`;
            }

            if (Object.keys(signalEntries).length > 0) {
                allEntries[item.jsxName] = Writers.object(signalEntries);
            }
        }

        sourceFile.addVariableStatement(
            createConstExport("SIGNALS", writeObjectOrEmpty(allEntries, Writers), {
                type: "Record<string, Record<string, string>>",
                docs: "Signal handler prop name to GTK signal name mapping for widgets and controllers.",
            }),
        );
    }
}
