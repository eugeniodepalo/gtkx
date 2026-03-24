import type { Builder } from "./types.js";
import type { Writer } from "./writer.js";

type ImportEntry = {
    names: Set<string>;
    typeOnlyNames: Set<string>;
    namespaceAlias?: string;
    namespaceTypeOnly?: boolean;
};

/**
 * Collects and deduplicates import declarations, then writes them sorted by specifier.
 * Handles value imports, type-only imports, and namespace imports.
 */
export class ImportRegistry implements Builder {
    private readonly entries = new Map<string, ImportEntry>();

    /** Register value imports for the given module specifier. */
    add(specifier: string, names: string[]): void {
        const entry = this.getOrCreate(specifier);
        for (const name of names) {
            entry.names.add(name);
        }
    }

    /** Register type-only imports for the given module specifier. */
    addTypeOnly(specifier: string, names: string[]): void {
        const entry = this.getOrCreate(specifier);
        for (const name of names) {
            entry.typeOnlyNames.add(name);
        }
    }

    /** Register a namespace import (`import * as alias`) for the given module specifier. */
    addNamespace(specifier: string, alias: string): void {
        const entry = this.getOrCreate(specifier);
        entry.namespaceAlias = alias;
    }

    /** Register a type-only namespace import (`import type * as alias`) for the given module specifier. */
    addTypeNamespace(specifier: string, alias: string): void {
        const entry = this.getOrCreate(specifier);
        entry.namespaceAlias = alias;
        entry.namespaceTypeOnly = true;
    }

    /** Whether the registry contains no import entries. */
    get isEmpty(): boolean {
        return this.entries.size === 0;
    }

    /** Write all collected imports, sorted alphabetically by specifier. */
    write(writer: Writer): void {
        const sorted = [...this.entries.entries()].sort((a, b) => a[0].localeCompare(b[0]));

        for (const [specifier, entry] of sorted) {
            if (entry.namespaceAlias) {
                const typePrefix = entry.namespaceTypeOnly ? "type " : "";
                writer.writeLine(`import ${typePrefix}* as ${entry.namespaceAlias} from "${specifier}";`);
                continue;
            }

            const valueNames = [...entry.names].filter((n) => !entry.typeOnlyNames.has(n)).sort();
            const typeOnlyNames = [...entry.typeOnlyNames].filter((n) => !entry.names.has(n)).sort();
            const bothNames = [...entry.names].filter((n) => entry.typeOnlyNames.has(n)).sort();

            const parts: string[] = [];
            for (const name of typeOnlyNames) {
                parts.push(`type ${name}`);
            }
            for (const name of bothNames) {
                parts.push(`type ${name}`);
            }
            for (const name of valueNames) {
                parts.push(name);
            }

            if (parts.length > 0) {
                writer.writeLine(`import { ${parts.join(", ")} } from "${specifier}";`);
            }
        }
    }

    private getOrCreate(specifier: string): ImportEntry {
        let entry = this.entries.get(specifier);
        if (!entry) {
            entry = { names: new Set(), typeOnlyNames: new Set() };
            this.entries.set(specifier, entry);
        }
        return entry;
    }
}
