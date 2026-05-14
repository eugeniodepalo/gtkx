import { Node, Project, type SourceFile, SyntaxKind } from "ts-morph";

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
const LEGACY_MODULE_KEYWORD_PATTERN = /^(\s*)((?:export\s+)?)module(\s+\w+\s*\{)/gm;

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
    return source.replace(
        LEGACY_MODULE_KEYWORD_PATTERN,
        (_match, indent: string, exportPrefix: string, rest: string) => {
            return `${indent}${exportPrefix}namespace${rest}`;
        },
    );
}

/**
 * Lifts every declaration inside the file's outer `export namespace <ns> { ... }`
 * to the source-file top level with an `export` keyword, then removes the now-empty
 * namespace wrapper and any `export default <ns>;` statement.
 *
 * ts-for-gir wraps every per-namespace `.d.ts` in a single outer namespace declaration.
 * That shape forces consumers to write `M.cairo.Status` after
 * `import * as M from "@gtkx/ffi/cairo"`. Lifting the contents removes the redundant
 * outer layer so callers can write `M.Status` directly.
 */
export function unwrapOuterNamespace(sourceFile: SourceFile): void {
    const moduleDecls = sourceFile.getChildrenOfKind(SyntaxKind.ModuleDeclaration);
    for (const ns of moduleDecls) {
        if (!ns.hasExportKeyword()) continue;
        const body = ns.getBody();
        if (!body || !Node.isModuleBlock(body)) continue;
        const liftedText = body
            .getStatements()
            .map((stmt) => prefixWithExport(stmt.getText()))
            .join("\n\n");
        ns.replaceWithText(liftedText);
        break;
    }

    for (const exportAssignment of sourceFile.getExportAssignments()) {
        exportAssignment.remove();
    }
}

const EXPORT_PREFIX_PATTERN = /^\s*export\b/;

function prefixWithExport(statementText: string): string {
    if (EXPORT_PREFIX_PATTERN.test(statementText)) return statementText;
    return `export ${statementText}`;
}

/**
 * Converts each `enum Foo { A, B }` declaration into a structural
 * `const Foo: { readonly A: 0; readonly B: 1; }` plus a sibling
 * `type Foo = (typeof Foo)[keyof typeof Foo]` alias.
 *
 * ts-for-gir emits numeric TypeScript enums, which are nominally branded and
 * cannot be satisfied by a plain `Object.freeze({ ... })` value emitted from
 * the raw-`.js` codegen side. The const-object shape produced here accepts
 * the frozen object while preserving consumer-facing usage: `M.Foo.A` reads
 * the constant and `Foo` continues to work as a type in function signatures.
 *
 * Member values are taken from ts-for-gir's declared values verbatim — if a
 * member lacks an explicit initializer, the computed ordinal is used.
 */
export function rewriteEnumsToConstObjects(sourceFile: SourceFile): void {
    const enums = sourceFile.getDescendantsOfKind(SyntaxKind.EnumDeclaration);
    for (const enumDecl of enums) {
        const name = enumDecl.getName();
        const exportKeyword = enumDecl.hasExportKeyword() ? "export " : "";

        let nextOrdinal = 0;
        const memberLines: string[] = [];
        for (const member of enumDecl.getMembers()) {
            const memberName = member.getName();
            const initializer = member.getInitializer();
            let literal: string;
            if (initializer) {
                literal = initializer.getText();
                const numeric = parseNumericLiteral(literal);
                if (numeric !== null) nextOrdinal = numeric + 1;
            } else {
                literal = String(nextOrdinal);
                nextOrdinal += 1;
            }
            memberLines.push(`    readonly ${memberName}: ${literal};`);
        }

        const memberBlock = memberLines.join("\n");
        const constDeclaration = `${exportKeyword}const ${name}: {\n${memberBlock}\n};`;
        const typeDeclaration = `${exportKeyword}type ${name} = (typeof ${name})[keyof typeof ${name}];`;

        enumDecl.replaceWithText(`${constDeclaration}\n${typeDeclaration}`);
    }
}

function parseNumericLiteral(text: string): number | null {
    const trimmed = text.trim();
    if (trimmed === "") return null;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : null;
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
        unwrapOuterNamespace(sourceFile);
        rewriteEnumsToConstObjects(sourceFile);
        rewriteNamespaceDeclarations(sourceFile);
        injectNativeObjectInheritance(sourceFile, namespace);
        injectClassStructRegistryShape(sourceFile);
        results.push({ namespace, sourceFile });
    }

    return results;
}

const CLASS_STRUCT_SUFFIXES = ["Class", "Iface", "Interface"] as const;

const isClassStructName = (name: string): boolean =>
    CLASS_STRUCT_SUFFIXES.some((suffix) => name.endsWith(suffix) && name !== suffix);

/**
 * Augments class-struct records (names ending in `Class`, `Iface`, or
 * `Interface`) with a sibling `export const <Name>` declaration whose value
 * type matches the runtime registry the FFI codegen publishes: a map keyed
 * by camelCased vfunc names with `RegisterClassVfuncDescriptor` or
 * `RegisterClassInterfaceVfuncDescriptor` shapes as values.
 *
 * Without this augmentation, consumer code that spreads
 * `ObjectClass.setProperty` cannot satisfy the
 * `RegisterClassVfuncDefinition` parameter constraint because the .d.ts
 * only declares the GIR `interface` companion (with field function
 * signatures), not the runtime registry shape.
 */
export function injectClassStructRegistryShape(sourceFile: SourceFile): void {
    const registriesToEmit: Array<{ name: string; descriptorType: string; vfuncNames: readonly string[] }> = [];
    const interfaceDecls = sourceFile.getInterfaces();
    for (const iface of interfaceDecls) {
        const name = iface.getName();
        if (!isClassStructName(name)) continue;
        if (!iface.hasExportKeyword()) continue;

        const valueExists = sourceFile.getVariableDeclaration(name) !== undefined;
        if (valueExists) continue;

        const vfuncNames = iface
            .getProperties()
            .map((prop) => prop.getName())
            .filter((propName) => isMethodFieldName(propName, iface));

        const descriptorType = name.endsWith("Class")
            ? "__gtkx_RegisterClassVfuncDescriptor"
            : "__gtkx_RegisterClassInterfaceVfuncDescriptor";
        registriesToEmit.push({ name, descriptorType, vfuncNames });
    }

    if (registriesToEmit.length === 0) return;

    for (const { name } of registriesToEmit) {
        const classDecl = sourceFile.getClass(name);
        classDecl?.remove();
    }

    sourceFile.insertImportDeclaration(0, {
        moduleSpecifier: "../../register-class.js",
        namedImports: [
            { name: "RegisterClassVfuncDescriptor", alias: "__gtkx_RegisterClassVfuncDescriptor" },
            { name: "RegisterClassInterfaceVfuncDescriptor", alias: "__gtkx_RegisterClassInterfaceVfuncDescriptor" },
        ],
        isTypeOnly: true,
    });

    for (const { name, descriptorType, vfuncNames } of registriesToEmit) {
        if (vfuncNames.length === 0) {
            sourceFile.addStatements(`export const ${name}: Record<string, ${descriptorType}>;`);
            continue;
        }
        const lines = vfuncNames.map((vfuncName) => `    readonly ${camelize(vfuncName)}: ${descriptorType};`);
        const body = `{\n${lines.join("\n")}\n}`;
        sourceFile.addStatements(`export const ${name}: ${body};`);
    }
}

function isMethodFieldName(name: string, iface: import("ts-morph").InterfaceDeclaration): boolean {
    const prop = iface.getProperty(name);
    if (!prop) return false;
    const typeNode = prop.getTypeNode();
    if (!typeNode) return false;
    return typeNode.getText().includes("=>");
}

function camelize(snakeOrKebab: string): string {
    return snakeOrKebab.replace(/[-_]([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Adds an `extends NativeObject` clause to every class declaration that has
 * no existing extends clause, plus a type-only import for `NativeObject`.
 *
 * The runtime codegen emits every generated class as `class Foo extends
 * NativeObject`. The ts-for-gir-derived `.d.ts` contract elides that
 * inheritance because ts-for-gir is unaware of gtkx's runtime base. Without
 * this augmentation, consumer code that subclasses a generated class
 * (e.g. `class CustomLabel extends Gtk.Label {}`) cannot satisfy
 * constraints like `T extends typeof NativeObject` because the .d.ts class
 * has no inherited `handle` / `__gtype__` / `_init` members.
 */
export function injectNativeObjectInheritance(sourceFile: SourceFile, _namespace: string): void {
    const classDecls = sourceFile.getClasses();
    let mutated = false;
    for (const cls of classDecls) {
        if (cls.getExtends()) continue;
        cls.setExtends("__gtkx_NativeObject");
        mutated = true;
    }

    if (!mutated) return;

    sourceFile.insertImportDeclaration(0, {
        moduleSpecifier: "../../object.js",
        namedImports: [{ name: "NativeObject", alias: "__gtkx_NativeObject" }],
        isTypeOnly: true,
    });
}
