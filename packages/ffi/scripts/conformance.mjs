#!/usr/bin/env node
/**
 * FFI runtime/declaration conformance gate.
 *
 * The generated FFI bindings come from two independent pipelines: the runtime
 * `<ns>.js` from gtkx's own codegen, and the `<ns>.d.ts` type contract from
 * ts-for-gir. The normal build never cross-checks them, so a class, method,
 * property, or constant the contract declares can be silently absent from the
 * runtime and surface only as an `undefined` at call time.
 *
 * This script builds an in-memory TypeScript program that asserts, per
 * namespace, that the runtime module satisfies its declared contract:
 *
 *     import * as impl from "<ns>.js";
 *     impl satisfies typeof import("<ns>.d.ts");
 *
 * A custom compiler host hides every co-located generated declaration so that
 * importing `<ns>.js` is typed from the JavaScript itself instead of being
 * shadowed by its hand-supplied declaration; the contract is served separately
 * from memory. A namespace whose runtime omits a declared export or member
 * produces a diagnostic and fails the build.
 *
 * Because the generated `.js` carries no type annotations, this reliably
 * enforces the existence of every declared class, member, and constant; it
 * does not verify parameter types.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const FFI_ROOT = dirname(SCRIPT_DIR);
const GENERATED_DIR = join(FFI_ROOT, "src", "generated");
const VIRTUAL_ROOT = join(FFI_ROOT, "__conformance__");

const IMPL_PREFIX = "gtkx-conformance:impl:";
const CONTRACT_PREFIX = "gtkx-conformance:contract:";
const FFI_PACKAGE_PREFIX = "@gtkx/ffi/";

const TARGET_OPTIONS = {
    allowJs: true,
    checkJs: false,
    noEmit: true,
    strict: true,
    noUncheckedIndexedAccess: true,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    resolveJsonModule: true,
    forceConsistentCasingInFileNames: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ESNext,
    lib: ["lib.esnext.d.ts"],
    types: ["node"],
};

const FORMAT_HOST = {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => FFI_ROOT,
    getNewLine: () => ts.sys.newLine,
};

const implJsPath = (namespace) => join(GENERATED_DIR, namespace, `${namespace}.js`);
const contractDtsPath = (namespace) => join(VIRTUAL_ROOT, "contract", `${namespace}.d.ts`);
const checkTsPath = (namespace) => join(VIRTUAL_ROOT, "check", `${namespace}.conformance.ts`);

/**
 * Enumerates every generated namespace that has both a runtime and a
 * declaration file under `src/generated/`.
 *
 * @returns {string[]} Sorted namespace identifiers.
 */
const collectNamespaces = () =>
    readdirSync(GENERATED_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter(
            (name) =>
                existsSync(join(GENERATED_DIR, name, `${name}.js`)) &&
                existsSync(join(GENERATED_DIR, name, `${name}.d.ts`)),
        )
        .sort();

/**
 * Renders the conformance assertion source for a single namespace.
 *
 * @param {string} namespace - Namespace identifier.
 * @returns {string} TypeScript source asserting the runtime satisfies the contract.
 */
const checkSource = (namespace) =>
    `import * as impl from ${JSON.stringify(IMPL_PREFIX + namespace)};\n` +
    `const _conformance = impl satisfies typeof import(${JSON.stringify(CONTRACT_PREFIX + namespace)});\n`;

/**
 * Resolves one module specifier, routing conformance and `@gtkx/ffi/<ns>`
 * specifiers to their in-memory targets and delegating everything else to
 * standard resolution against the declaration-hiding host.
 *
 * @param {string} specifier - The module specifier text.
 * @param {string} containingFile - Absolute path of the importing file.
 * @param {ts.CompilerOptions} options - Active compiler options.
 * @param {ts.SourceFile | undefined} containingSourceFile - Importing source file.
 * @param {ts.ModuleResolutionHost} host - Resolution host.
 * @param {Set<string>} namespaces - Known namespace identifiers.
 * @returns {ts.ResolvedModuleWithFailedLookupLocations} The resolution result.
 */
const resolveSpecifier = (specifier, containingFile, options, containingSourceFile, host, namespaces) => {
    if (specifier.startsWith(IMPL_PREFIX)) {
        return {
            resolvedModule: {
                resolvedFileName: implJsPath(specifier.slice(IMPL_PREFIX.length)),
                extension: ts.Extension.Js,
                isExternalLibraryImport: false,
            },
        };
    }

    const contractNamespace = specifier.startsWith(CONTRACT_PREFIX)
        ? specifier.slice(CONTRACT_PREFIX.length)
        : specifier.startsWith(FFI_PACKAGE_PREFIX)
          ? specifier.slice(FFI_PACKAGE_PREFIX.length)
          : undefined;

    if (contractNamespace !== undefined && namespaces.has(contractNamespace)) {
        return {
            resolvedModule: {
                resolvedFileName: contractDtsPath(contractNamespace),
                extension: ts.Extension.Dts,
                isExternalLibraryImport: false,
            },
        };
    }

    return ts.resolveModuleName(
        specifier,
        containingFile,
        options,
        host,
        undefined,
        undefined,
        containingSourceFile?.impliedNodeFormat,
    );
};

/**
 * Builds a compiler host that serves the in-memory contract and check files,
 * hides the co-located generated declarations so runtime modules are typed
 * from their JavaScript, and routes `@gtkx/ffi/<ns>` cross-references to the
 * in-memory contract.
 *
 * @param {Map<string, string>} virtualFiles - Absolute path to file content.
 * @param {Set<string>} namespaces - Known namespace identifiers.
 * @returns {ts.CompilerHost} The configured host.
 */
const createConformanceHost = (virtualFiles, namespaces) => {
    const host = ts.createCompilerHost(TARGET_OPTIONS, true);
    const isHiddenDeclaration = (fileName) => fileName.endsWith(".d.ts") && fileName.startsWith(`${GENERATED_DIR}/`);

    const baseGetSourceFile = host.getSourceFile.bind(host);
    const baseFileExists = host.fileExists.bind(host);
    const baseReadFile = host.readFile.bind(host);
    const baseDirectoryExists = host.directoryExists?.bind(host);
    const baseRealpath = host.realpath?.bind(host);

    host.getCurrentDirectory = () => FFI_ROOT;

    host.getSourceFile = (fileName, languageVersionOrOptions, onError, shouldCreate) => {
        const virtual = virtualFiles.get(fileName);
        if (virtual !== undefined) {
            return ts.createSourceFile(fileName, virtual, languageVersionOrOptions, true);
        }
        if (isHiddenDeclaration(fileName)) {
            return undefined;
        }
        return baseGetSourceFile(fileName, languageVersionOrOptions, onError, shouldCreate);
    };

    host.fileExists = (fileName) => {
        if (virtualFiles.has(fileName)) {
            return true;
        }
        if (isHiddenDeclaration(fileName)) {
            return false;
        }
        return baseFileExists(fileName);
    };

    host.readFile = (fileName) => {
        const virtual = virtualFiles.get(fileName);
        if (virtual !== undefined) {
            return virtual;
        }
        if (isHiddenDeclaration(fileName)) {
            return undefined;
        }
        return baseReadFile(fileName);
    };

    if (baseDirectoryExists) {
        host.directoryExists = (directory) => {
            for (const path of virtualFiles.keys()) {
                if (path.startsWith(`${directory}/`)) {
                    return true;
                }
            }
            return baseDirectoryExists(directory);
        };
    }

    if (baseRealpath) {
        host.realpath = (path) => (virtualFiles.has(path) ? path : baseRealpath(path));
    }

    host.resolveModuleNameLiterals = (moduleLiterals, containingFile, _redirected, options, containingSourceFile) =>
        moduleLiterals.map((literal) =>
            resolveSpecifier(literal.text, containingFile, options, containingSourceFile, host, namespaces),
        );

    return host;
};

const main = () => {
    if (!existsSync(GENERATED_DIR)) {
        console.error(`conformance: ${GENERATED_DIR} not found — run codegen first.`);
        process.exit(1);
    }

    const namespaces = collectNamespaces();
    if (namespaces.length === 0) {
        console.error("conformance: no generated namespaces found under src/generated.");
        process.exit(1);
    }

    const virtualFiles = new Map();
    const rootNames = [];
    for (const namespace of namespaces) {
        const declaration = readFileSync(join(GENERATED_DIR, namespace, `${namespace}.d.ts`), "utf8");
        virtualFiles.set(contractDtsPath(namespace), declaration);
        const checkPath = checkTsPath(namespace);
        virtualFiles.set(checkPath, checkSource(namespace));
        rootNames.push(checkPath);
    }

    const host = createConformanceHost(virtualFiles, new Set(namespaces));
    const program = ts.createProgram({ rootNames, options: TARGET_OPTIONS, host });

    const setupDiagnostics = [...program.getOptionsDiagnostics(), ...program.getGlobalDiagnostics()];
    if (setupDiagnostics.length > 0) {
        console.error(ts.formatDiagnosticsWithColorAndContext(setupDiagnostics, FORMAT_HOST));
        console.error("conformance: the check itself is misconfigured — see the diagnostics above.");
        process.exit(1);
    }

    const violations = [];
    for (const namespace of namespaces) {
        const checkFile = program.getSourceFile(checkTsPath(namespace));
        if (checkFile === undefined) {
            console.error(`conformance: internal error — check module for '${namespace}' was not created.`);
            process.exit(1);
        }
        violations.push(...program.getSyntacticDiagnostics(checkFile), ...program.getSemanticDiagnostics(checkFile));
    }

    if (violations.length > 0) {
        console.error(ts.formatDiagnosticsWithColorAndContext(violations, FORMAT_HOST));
        console.error(
            `conformance: ${violations.length} drift issue(s) — the generated runtime does not satisfy its .d.ts contract.`,
        );
        process.exit(1);
    }

    console.log(`conformance: ${namespaces.length} namespace(s) verified — runtime .js satisfies .d.ts contract.`);
};

main();
