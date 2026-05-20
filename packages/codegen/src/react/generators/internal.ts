/**
 * Internal Generator
 *
 * Generates internal.ts for the reconciler.
 * Contains runtime prop/signal resolution maps, the construct-only set per
 * class, and a flat GLib-type-name to class registry used to instantiate
 * containers from JSX intrinsic type strings.
 */

import type { FileBuilder } from "../../builders/index.js";
import { raw, variableStatement } from "../../builders/index.js";
import type { Writer } from "../../builders/text-writer.js";
import type { CodegenControllerMeta } from "../../codegen-metadata.js";
import type { PropertyAnalysis, SignalAnalysis } from "../../generator-types.js";

import { type MetadataReader, sortWidgetsByClassName } from "../metadata-reader.js";

type ClassItem = {
    readonly jsxName: string;
    readonly className: string;
    readonly namespace: string;
    readonly properties: readonly PropertyAnalysis[];
    readonly signals: readonly SignalAnalysis[];
};

export class InternalGenerator {
    constructor(
        private readonly reader: MetadataReader,
        private readonly controllers: readonly CodegenControllerMeta[],
    ) {}

    generate(file: FileBuilder): void {
        file.add(
            raw(
                "/**\n" +
                    " * Internal metadata for the reconciler: runtime prop/signal resolution,\n" +
                    " * construct-only property sets, and the GLib-type-name to class registry.\n" +
                    " *\n" +
                    " * Also namespace-imports every FFI namespace that contributes a\n" +
                    " * reconcilable element, so importing this module registers their GLib\n" +
                    " * types and the reconciler can resolve any generated intrinsic element\n" +
                    " * by name. The package marks this module in `sideEffects` so bundlers\n" +
                    " * preserve those imports.\n" +
                    " *\n" +
                    " * Not part of the public API.\n" +
                    " */\n",
            ),
        );

        const items = this.collectClassItems();

        this.addNamespaceImports(file);
        this.emitNativeClassType(file);
        this.generatePropsMap(file, items);
        this.generateSignalsMap(file, items);
        this.generateConstructOnlyMap(file, items);
        this.generateClassByTypeName(file, items);
    }

    private collectClassItems(): ClassItem[] {
        const widgets = sortWidgetsByClassName(this.reader.getAllWidgets());
        const controllers = [...this.controllers].sort((a, b) => a.className.localeCompare(b.className));

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

    private collectNamespaces(): string[] {
        const namespaces = new Set<string>();
        for (const meta of this.reader.getAllCodegenMeta()) {
            namespaces.add(meta.namespace);
        }
        for (const controller of this.controllers) {
            namespaces.add(controller.namespace);
        }
        return [...namespaces].sort((a, b) => a.localeCompare(b));
    }

    private addNamespaceImports(file: FileBuilder): void {
        for (const namespace of this.collectNamespaces()) {
            file.addNamespaceImport(`@gtkx/ffi/${namespace.toLowerCase()}`, namespace);
        }
    }

    private emitNativeClassType(file: FileBuilder): void {
        file.add(raw("export type NativeClass = abstract new (...args: never[]) => unknown;\n"));
    }

    private generatePropsMap(file: FileBuilder, items: readonly ClassItem[]): void {
        this.emitNestedMap(file, "PROPS", {
            type: "Record<string, Record<string, string>>",
            items,
            skipIf: (item) => item.properties.length === 0,
            collect: (item) => {
                const entries: Array<[string, string]> = [];
                for (const prop of item.properties) {
                    if (!prop.isWritable || (!prop.setter && !prop.isConstructOnly)) continue;
                    entries.push([`"${prop.camelName}"`, `"${prop.camelName}"`]);
                }
                return entries;
            },
        });
    }

    private generateSignalsMap(file: FileBuilder, items: readonly ClassItem[]): void {
        this.emitNestedMap(file, "SIGNALS", {
            type: "Record<string, Record<string, string>>",
            doc: "Signal handler prop name to GTK signal name mapping for widgets and controllers.",
            items,
            skipIf: (item) => item.signals.length === 0,
            collect: (item) =>
                item.signals.map((signal) => [`"${signal.handlerName}"`, `"${signal.name}"`] as [string, string]),
        });
    }

    private generateConstructOnlyMap(file: FileBuilder, items: readonly ClassItem[]): void {
        const entries: Array<{ jsxName: string; names: readonly string[] }> = [];
        for (const item of items) {
            const constructOnlyNames = item.properties
                .filter((prop) => prop.isWritable && prop.isConstructOnly === true)
                .map((prop) => prop.camelName);
            if (constructOnlyNames.length === 0) continue;
            entries.push({ jsxName: item.jsxName, names: constructOnlyNames });
        }

        file.add(
            variableStatement("CONSTRUCT_ONLY", {
                exported: true,
                kind: "const",
                type: "Record<string, ReadonlySet<string>>",
                doc: "Construct-only camelCase prop names per GLib type name.",
                initializer: (writer: Writer) => writeConstructOnlyObject(writer, entries),
            }),
        );
    }

    private generateClassByTypeName(file: FileBuilder, items: readonly ClassItem[]): void {
        file.add(
            variableStatement("CLASS_BY_TYPE_NAME", {
                exported: true,
                kind: "const",
                type: "ReadonlyMap<string, NativeClass>",
                doc: "GLib type name to JS class registry for every reconcilable element.",
                initializer: (writer: Writer) => writeClassByTypeName(writer, items),
            }),
        );
    }

    private emitNestedMap(
        file: FileBuilder,
        name: string,
        opts: {
            type: string;
            doc?: string;
            items: readonly ClassItem[];
            skipIf?: (item: ClassItem) => boolean;
            collect: (item: ClassItem) => Array<[string, string]>;
        },
    ): void {
        const entries: Array<{ jsxName: string; propEntries: Array<[string, string]> }> = [];

        for (const item of opts.items) {
            if (opts.skipIf?.(item)) continue;
            const propEntries = opts.collect(item);
            if (propEntries.length > 0) {
                entries.push({ jsxName: item.jsxName, propEntries });
            }
        }

        file.add(
            variableStatement(name, {
                exported: true,
                kind: "const",
                type: opts.type,
                initializer: (writer: Writer) => {
                    writeNestedObject(writer, entries);
                },
                doc: opts.doc,
            }),
        );
    }
}

function writeNestedObject(
    writer: Writer,
    entries: Array<{ jsxName: string; propEntries: Array<[string, string]> }>,
): void {
    if (entries.length === 0) {
        writer.write("{}");
        return;
    }

    writer.writeBlock(() => {
        for (const { jsxName, propEntries } of entries) {
            writer.write(`${jsxName}: `);
            writer.writeBlock(() => {
                for (const [key, value] of propEntries) {
                    writer.writeLine(`${key}: ${value},`);
                }
            });
            writer.writeLine(",");
        }
    });
}

function writeConstructOnlyObject(
    writer: Writer,
    entries: ReadonlyArray<{ jsxName: string; names: readonly string[] }>,
): void {
    if (entries.length === 0) {
        writer.write("{}");
        return;
    }

    writer.writeBlock(() => {
        for (const { jsxName, names } of entries) {
            const setLiteral = names.map((name) => `"${name}"`).join(", ");
            writer.writeLine(`${jsxName}: new Set([${setLiteral}]),`);
        }
    });
}

function writeClassByTypeName(writer: Writer, items: readonly ClassItem[]): void {
    if (items.length === 0) {
        writer.write("new Map()");
        return;
    }

    writer.writeLine("new Map([");
    writer.withIndent(() => {
        for (const { jsxName, namespace, className } of items) {
            writer.writeLine(`["${jsxName}", ${namespace}.${className}],`);
        }
    });
    writer.write("])");
}
