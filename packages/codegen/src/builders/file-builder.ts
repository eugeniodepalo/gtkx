import { FfiDescriptorRegistry } from "../core/writers/descriptor-registry.js";
import { raw } from "./declarations/raw.js";
import { ImportRegistry } from "./import-registry.js";
import type { Builder } from "./types.js";
import { Writer } from "./writer.js";

/**
 * Builds a complete TypeScript source file with an import section, an
 * optional FFI-descriptor preamble (hoisted `fn(...)` consts), and top-level
 * declarations.
 *
 * The descriptor preamble is populated as a side effect of writing
 * declarations: each call expression that registers with the
 * {@link FfiDescriptorRegistry} contributes one hoisted const. Because that
 * registration only happens during declaration write, this builder writes
 * declarations to a temporary buffer first, then emits imports, descriptors,
 * and finally the buffered declarations to the real writer.
 */
export class FileBuilder implements Builder {
    private readonly imports = new ImportRegistry();
    private readonly declarations: Builder[] = [];
    /** Per-file FFI descriptor registry; emitted between imports and declarations. */
    readonly descriptors = new FfiDescriptorRegistry();

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

    /**
     * Write the complete file: imports, then any registered FFI descriptor
     * preamble, then declarations separated by blank lines.
     *
     * Declarations are rendered to a temporary writer first so that any
     * descriptors and imports they contribute as side effects are fully
     * collected before the imports/preamble sections are emitted.
     */
    write(writer: Writer): void {
        const declarationsBuffer = new Writer();
        for (let i = 0; i < this.declarations.length; i++) {
            if (i > 0) declarationsBuffer.newLine();
            this.declarations[i]?.write(declarationsBuffer);
        }

        if (!this.imports.isEmpty) {
            this.imports.write(writer);
            writer.newLine();
        }

        if (!this.descriptors.isEmpty) {
            this.descriptors.write(writer);
            writer.newLine();
        }

        writer.write(declarationsBuffer.toString());
    }
}

/** Create a new {@link FileBuilder}. */
export function fileBuilder(): FileBuilder {
    return new FileBuilder();
}
