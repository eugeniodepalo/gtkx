/**
 * Represents a single generated file with its relative path and content.
 */
export type GeneratedFile = {
    /** Relative path within the output group (e.g., `"gtk/button.ts"`). */
    path: string;
    /** Raw TypeScript source content (unformatted). */
    content: string;
};

/**
 * Collects generated files grouped by output target (FFI or React).
 */
export class GeneratedFileSet {
    private readonly ffi: GeneratedFile[] = [];
    private readonly react: GeneratedFile[] = [];

    /** Adds a generated file to the FFI output group. */
    addFfi(file: GeneratedFile): void {
        this.ffi.push(file);
    }

    /** Adds a generated file to the React output group. */
    addReact(file: GeneratedFile): void {
        this.react.push(file);
    }

    /** Returns all FFI generated files. */
    getFfiFiles(): readonly GeneratedFile[] {
        return this.ffi;
    }

    /** Returns all React generated files. */
    getReactFiles(): readonly GeneratedFile[] {
        return this.react;
    }
}
