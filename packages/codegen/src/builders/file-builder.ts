import { raw } from "./declarations/raw.js";
import { ImportRegistry } from "./import-registry.js";
import type { Builder } from "./types.js";
import type { Writer } from "./writer.js";

/**
 * Builds a complete TypeScript source file with an import section
 * followed by top-level declarations.
 */
export class FileBuilder implements Builder {
    private readonly imports = new ImportRegistry();
    private readonly declarations: Builder[] = [];

    /** Add value imports from a module specifier. */
    addImport(specifier: string, names: string[]): this {
        this.imports.add(specifier, names);
        return this;
    }

    /** Add type-only imports from a module specifier. */
    addTypeImport(specifier: string, names: string[]): this {
        this.imports.addTypeOnly(specifier, names);
        return this;
    }

    /** Add a namespace import (`import * as alias`) from a module specifier. */
    addNamespaceImport(specifier: string, alias: string): this {
        this.imports.addNamespace(specifier, alias);
        return this;
    }

    /** Add a type-only namespace import (`import type * as alias`) from a module specifier. */
    addTypeNamespaceImport(specifier: string, alias: string): this {
        this.imports.addTypeNamespace(specifier, alias);
        return this;
    }

    /** Append a top-level declaration builder to the file. */
    add(declaration: Builder): this {
        this.declarations.push(declaration);
        return this;
    }

    /** Append a raw text statement to the file. */
    addStatement(text: string): this {
        this.declarations.push(raw(text));
        return this;
    }

    /** Write the complete file: imports followed by declarations separated by blank lines. */
    write(writer: Writer): void {
        if (!this.imports.isEmpty) {
            this.imports.write(writer);
            writer.newLine();
        }

        for (let i = 0; i < this.declarations.length; i++) {
            if (i > 0) writer.newLine();
            this.declarations[i]?.write(writer);
        }
    }
}

/** Create a new {@link FileBuilder}. */
export function fileBuilder(): FileBuilder {
    return new FileBuilder();
}
