/**
 * Registry Generator
 *
 * Generates the registry.ts file containing namespace registry.
 */

import type { FileBuilder } from "../../builders/index.js";
import { typeAlias, variableStatement } from "../../builders/index.js";
import type { Writer } from "../../builders/writer.js";

export class RegistryGenerator {
    constructor(private readonly namespaceNames: string[]) {}

    generate(file: FileBuilder): void {
        file.addStatement("/** Generated namespace registry for widget class resolution. */\n");

        this.addImports(file, this.namespaceNames);
        this.addNamespaceType(file);
        this.addNamespaceRegistry(file, this.namespaceNames);
    }

    private addImports(file: FileBuilder, namespaces: string[]): void {
        const sorted = [...namespaces].sort((a, b) => a.localeCompare(b));
        for (const ns of sorted) {
            file.addNamespaceImport(`@gtkx/ffi/${ns.toLowerCase()}`, ns);
        }
    }

    private addNamespaceType(file: FileBuilder): void {
        file.add(typeAlias("Namespace", "Record<string, unknown>"));
    }

    private addNamespaceRegistry(file: FileBuilder, namespaces: string[]): void {
        const sortedByLength = [...namespaces].sort((a, b) => b.length - a.length || a.localeCompare(b));

        file.add(
            variableStatement("NAMESPACE_REGISTRY", {
                exported: true,
                kind: "const",
                type: "[string, Namespace][]",
                initializer: (writer: Writer) => {
                    writer.writeLine("[");
                    writer.withIndent(() => {
                        for (const ns of sortedByLength) {
                            writer.writeLine(`["${ns}", ${ns}],`);
                        }
                    });
                    writer.write("]");
                },
            }),
        );
    }
}
