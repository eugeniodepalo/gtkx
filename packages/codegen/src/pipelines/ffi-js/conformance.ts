/**
 * Extracts the names of every value (class, enum, function, const) exported
 * from a transpiled FFI source file. Used by {@link appendConformanceFooter}
 * to emit a `@type` JSDoc assertion per export so `tsc --noEmit` can verify
 * the file conforms to the ts-for-gir-generated `.d.ts` contract.
 */
export function collectExportedNames(jsSource: string): string[] {
    const names = new Set<string>();
    const patterns = [
        /^export\s+class\s+(\w+)/gm,
        /^export\s+function\s+(\w+)/gm,
        /^export\s+const\s+(\w+)/gm,
        /^export\s+let\s+(\w+)/gm,
        /^export\s+var\s+(\w+)/gm,
        /^export\s+(?:enum|namespace)\s+(\w+)/gm,
    ];
    for (const pattern of patterns) {
        for (const match of jsSource.matchAll(pattern)) {
            const name = match[1];
            if (name) names.add(name);
        }
    }
    return [...names].sort();
}

/**
 * Builds the namespace-qualified type reference for a single exported name.
 * `Button` in namespace `Gtk` becomes
 * `import("./gtk.d.ts").Gtk.Button`, suitable for use inside a `@type`
 * JSDoc tag.
 */
export function namespaceTypeRef(namespace: string, exportName: string, declarationModulePath: string): string {
    return `import("${declarationModulePath}").${namespace}.${exportName}`;
}

/**
 * Appends per-export `@type` JSDoc conformance assertions to a transpiled
 * JS source. Each assertion declares a `_conforms_<name>` constant typed as
 * the ts-for-gir-published type and assigns the local export to it; if the
 * shapes diverge `tsc --noEmit` fails the conformance gate.
 *
 * @param jsSource Transpiled JavaScript text.
 * @param namespace PascalCase namespace identifier exported by the `.d.ts`
 *   contract (e.g. `Gtk`, `GLib`).
 * @param declarationModulePath Specifier the assertions should `import(...)`
 *   from to resolve the namespace contract.
 */
export function appendConformanceFooter(jsSource: string, namespace: string, declarationModulePath: string): string {
    const names = collectExportedNames(jsSource);
    if (names.length === 0) return jsSource;

    const lines: string[] = ["", "// @ts-check conformance assertions against ts-for-gir contract"];
    for (const name of names) {
        const typeRef = namespaceTypeRef(namespace, name, declarationModulePath);
        lines.push(`/** @type {typeof ${typeRef}} */`);
        lines.push(`const _conforms_${name} = ${name};`);
        lines.push(`void _conforms_${name};`);
    }
    return `${jsSource}\n${lines.join("\n")}\n`;
}
