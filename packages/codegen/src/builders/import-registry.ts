import { CONSOLIDATED_RUNTIME_SPECIFIERS, RUNTIME_SPECIFIER } from "../core/writers/runtime-imports.js";
import type { Builder } from "./types.js";
import type { Writer } from "./writer.js";

type ImportEntry = {
    names: Set<string>;
    typeOnlyNames: Set<string>;
    namespaceAlias?: string;
    namespaceTypeOnly?: boolean;
};

/**
 * Collects and deduplicates import declarations, then writes them sorted by
 * specifier. Handles value imports, type-only imports, namespace imports,
 * and type-only namespace imports.
 *
 * When `mode` is `"js"`, type-only imports and intra-namespace `./*`
 * specifiers are dropped at write time because the consolidated
 * per-namespace JavaScript file collapses those imports into same-file
 * references and has no need for type-only declarations. Value imports of
 * the `@gtkx/ffi` runtime modules are redirected onto {@link RUNTIME_SPECIFIER}
 * so each generated file carries a single runtime import line.
 */
export class ImportRegistry implements Builder {
    private readonly entries = new Map<string, ImportEntry>();
    private readonly sideEffectImports = new Set<string>();
    private mode: "ts" | "js" = "ts";

    /** Configure the emission mode. */
    setMode(mode: "ts" | "js"): void {
        this.mode = mode;
    }

    /**
     * Register value imports for the given module specifier.
     *
     * In `"js"` mode, specifiers in {@link CONSOLIDATED_RUNTIME_SPECIFIERS}
     * are redirected to {@link RUNTIME_SPECIFIER} so generated files import
     * the runtime through a single barrel module.
     */
    add(specifier: string, names: string[]): void {
        const entry = this.getOrCreate(this.resolveValueSpecifier(specifier));
        for (const name of names) {
            entry.names.add(name);
        }
    }

    private resolveValueSpecifier(specifier: string): string {
        if (this.mode === "js" && CONSOLIDATED_RUNTIME_SPECIFIERS.has(specifier)) {
            return RUNTIME_SPECIFIER;
        }
        return specifier;
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

    /** Register a bare side-effect import (`import "specifier"`) for the given module specifier. */
    addSideEffect(specifier: string): void {
        this.sideEffectImports.add(specifier);
    }

    /** Whether the registry would emit any import statements at write time. */
    get isEmpty(): boolean {
        if (this.sideEffectImports.size > 0) {
            return false;
        }

        for (const [specifier, entry] of this.entries) {
            if (this.mode === "js" && specifier.startsWith("./")) continue;
            if (entry.namespaceAlias) {
                if (this.mode === "js" && entry.namespaceTypeOnly) continue;
                return false;
            }
            if (entry.names.size > 0) return false;
            if (this.mode !== "js" && entry.typeOnlyNames.size > 0) return false;
        }
        return true;
    }

    /** Write all collected imports, sorted alphabetically by specifier. */
    write(writer: Writer): void {
        for (const specifier of [...this.sideEffectImports].sort((a, b) => a.localeCompare(b))) {
            writer.writeLine(`import "${specifier}";`);
        }

        const sorted = [...this.entries.entries()].sort((a, b) => a[0].localeCompare(b[0]));

        for (const [specifier, entry] of sorted) {
            if (this.mode === "js" && specifier.startsWith("./")) continue;

            if (entry.namespaceAlias) {
                if (this.mode === "js" && entry.namespaceTypeOnly) continue;
                const typePrefix = entry.namespaceTypeOnly ? "type " : "";
                writer.writeLine(`import ${typePrefix}* as ${entry.namespaceAlias} from "${specifier}";`);
                continue;
            }

            const compareNames = (a: string, b: string): number => a.localeCompare(b);
            const valueNames = [...entry.names].filter((n) => !entry.typeOnlyNames.has(n)).sort(compareNames);
            const typeOnlyNames = [...entry.typeOnlyNames].filter((n) => !entry.names.has(n)).sort(compareNames);
            const bothNames = [...entry.names].filter((n) => entry.typeOnlyNames.has(n)).sort(compareNames);

            const parts: string[] = [];
            if (this.mode !== "js") {
                for (const name of typeOnlyNames) {
                    parts.push(`type ${name}`);
                }
                for (const name of bothNames) {
                    parts.push(`type ${name}`);
                }
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
