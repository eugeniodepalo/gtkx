import type { Builder } from "./types.js";
import type { Writer } from "./writer.js";

/** Builds a barrel file consisting of sorted `export * from` re-exports. */
export class ExportFileBuilder implements Builder {
    private readonly specifiers: string[] = [];

    /** Add a module specifier to be re-exported. */
    addExportFrom(moduleSpecifier: string): this {
        this.specifiers.push(moduleSpecifier);
        return this;
    }

    /** Write all `export * from` statements, sorted alphabetically. */
    write(writer: Writer): void {
        const sorted = [...this.specifiers].sort();
        for (const specifier of sorted) {
            writer.writeLine(`export * from "${specifier}";`);
        }
    }
}

/** Create a new {@link ExportFileBuilder}. */
export function exportFileBuilder(): ExportFileBuilder {
    return new ExportFileBuilder();
}
