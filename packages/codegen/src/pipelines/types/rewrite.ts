import { Project, type SourceFile } from "ts-morph";

const RAW_FILE_PATTERN = /^node-(.+?)-\d+(?:\.\d+)*\.d\.ts$/;
const RELATIVE_IMPORT_PATTERN = /^\.\/node-(.+?)-\d+(?:\.\d+)*\.js$/;
const IMPORT_SHIM_PATTERN = /^\.\/node-.+?-\d+(?:\.\d+)*-import\.d\.ts$/;

/**
 * Maps a ts-for-gir raw output filename (e.g. `node-glib-2.0.d.ts`) to the
 * lowercase gtkx namespace identifier (e.g. `glib`). Returns `null` for files
 * that do not match the per-namespace output shape — companion `-import`
 * stubs, the `node-ambient` shim, the bare `node-gtk` namespace augmentor.
 */
export function namespaceFromRawFilename(filename: string): string | null {
    const match = filename.match(RAW_FILE_PATTERN);
    if (!match) return null;
    if (filename.endsWith("-import.d.ts")) return null;
    return match[1] ?? null;
}

/**
 * Rewrites a single ts-for-gir generated `.d.ts` file in-place to use the
 * gtkx import shape. Drops the per-namespace import-shim augmentation and
 * rewrites every `./node-<ns>-<ver>.js` module specifier into
 * `@gtkx/ffi/<ns>`.
 */
export function rewriteNamespaceDeclarations(sourceFile: SourceFile): void {
    for (const decl of sourceFile.getImportDeclarations()) {
        const specifier = decl.getModuleSpecifierValue();
        if (IMPORT_SHIM_PATTERN.test(specifier)) {
            decl.remove();
            continue;
        }
        const match = specifier.match(RELATIVE_IMPORT_PATTERN);
        if (match?.[1]) {
            decl.setModuleSpecifier(`@gtkx/ffi/${match[1]}`);
        }
    }
}

const DEFAULT_IMPORT_PATTERN = /^import type (\w+) from (['"]@gtkx\/ffi\/[a-z0-9]+['"]);?$/gm;
const LEGACY_MODULE_KEYWORD_PATTERN = /^(\s*)module\s+(\w+)\s*\{/gm;

/**
 * Converts each `import type <Name> from '@gtkx/ffi/<ns>'` line into the
 * equivalent `import type * as <Name> from '@gtkx/ffi/<ns>'` so that type
 * expressions like `Gdk.RGBA` inside the .d.ts resolve against the imported
 * module's class declarations rather than the default-export value type.
 */
export function rewriteDefaultImportsToNamespace(source: string): string {
    return source.replace(DEFAULT_IMPORT_PATTERN, (_match, name: string, specifier: string) => {
        return `import type * as ${name} from ${specifier};`;
    });
}

/**
 * Replaces the legacy `module <Name> { ... }` keyword form ts-for-gir 3.x
 * emits for per-class signal/constructor companion blocks with the modern
 * `namespace <Name> { ... }` form. The former is rejected under strict TS
 * 6+ as a stylistic legacy of internal modules.
 */
export function rewriteModuleKeywordToNamespace(source: string): string {
    return source.replace(LEGACY_MODULE_KEYWORD_PATTERN, (_match, indent: string, name: string) => {
        return `${indent}namespace ${name} {`;
    });
}

/**
 * Loads every per-namespace `.d.ts` under `rawDir` into a ts-morph project,
 * applies the gtkx import rewrites, and returns the project for callers to
 * iterate over. Files outside the per-namespace pattern (ambient shims, the
 * bare `node-gtk` augmentor, `-import` stubs) are ignored.
 *
 * @returns A list of `(namespace, sourceFile)` tuples for the rewritten files.
 */
export function loadAndRewrite(
    rawFilesByName: Map<string, string>,
): Array<{ namespace: string; sourceFile: SourceFile }> {
    const project = new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });
    const results: Array<{ namespace: string; sourceFile: SourceFile }> = [];

    for (const [filename, contents] of rawFilesByName) {
        const namespace = namespaceFromRawFilename(filename);
        if (!namespace) continue;
        const sourceFile = project.createSourceFile(filename, contents, { overwrite: true });
        rewriteNamespaceDeclarations(sourceFile);
        results.push({ namespace, sourceFile });
    }

    return results;
}
