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
 * namespace, that the runtime module is structurally interchangeable with its
 * declared contract in both directions: a forward assertion that the runtime
 * satisfies the whole contract, and one reverse assertion per shared class that
 * the contract's instance type satisfies the runtime's:
 *
 *     import * as impl from "<ns>";
 *     const _forward = impl satisfies typeof import("<ns>.d.ts");
 *     // per class C exported by both:
 *     const _reverseC = (undefined as InstanceType<Contract["C"]>) satisfies
 *         Pick<InstanceType<(typeof impl)["C"]>, keyof InstanceType<Contract["C"]>>;
 *     // per class C: the runtime adds no static/instance member the contract omits:
 *     type _StaticExtraC = Exclude<keyof (typeof impl)["C"], keyof Contract["C"]>;
 *     type _InstanceExtraC = Exclude<keyof InstanceType<(typeof impl)["C"]>, keyof InstanceType<Contract["C"]>>;
 *
 * The impl side is the full shipping `@gtkx/ffi/<ns>` surface, not the bare
 * generated `<ns>.js`. A namespace with a hand-written runtime directory
 * (`src/<ns>/` with an `index.ts`) ships generated code plus hand-written
 * overrides and `declare module` augmentations; for those the impl resolves to
 * `src/<ns>/index.ts`, which re-exports the generated `<ns>.js` and layers the
 * overrides on top. A namespace without such a directory resolves to the bare
 * generated `<ns>.js`. Either way the generated `<ns>.js` is still pulled into
 * the program — directly or transitively through the `index.ts` re-export — so
 * an override layer cannot mask a genuine gap in the generated code.
 *
 * A custom compiler host hides every co-located generated declaration so that
 * importing `<ns>.js` is typed from the JavaScript itself instead of being
 * shadowed by its hand-supplied declaration; the contract is served separately
 * from memory. A namespace whose runtime omits a declared export or member —
 * or whose runtime declares a member with a drifting call shape — produces a
 * diagnostic and fails the build.
 *
 * Beyond member existence, the assertions verify call-convention SHAPE for
 * class and interface methods: parameter arity in both directions, the length
 * and order of out/inout-parameter return tuples, `Promise` wrapping of async
 * methods, and void-versus-value returns.
 *
 * Two extra-member directions assert per shared class that the runtime exposes
 * no member — static or instance — the contract omits: a binding must not
 * surface an API node-gtk's ts-for-gir contract never declared. `cairo` is
 * excluded from the gate entirely: ts-for-gir emits no cairo contract (its
 * cairo template is an unfinished stub), so the generated `cairo.d.ts` carries
 * only empty GObject-metadata shells. gtkx's cairo bindings are written against
 * node-gtk's cairo runtime directly and verified separately.
 *
 * Three source transforms make that possible without a primitive-precise type
 * model:
 *
 *  - The runtime `.js` is rewritten so a `return` of an array literal is typed
 *    as a fixed-length tuple (`/** @type {[any, any, …]} *\/`) instead of the
 *    `any[]` TypeScript otherwise infers, recovering out-parameter tuple arity.
 *  - The runtime `.js` is also rewritten so a `return promisify(...)` is typed
 *    as `Promise<any>`, since the `promisify` helper is imported from the
 *    unresolved FFI runtime barrel and would otherwise infer as `any`,
 *    erasing the `Promise` wrapping of async methods.
 *  - The contract `.d.ts` is normalized syntactically: primitives, `void`,
 *    `null`, `undefined`, tuples, array types, `Promise`, function signatures,
 *    and unions/intersections are kept, while every other type-reference
 *    identifier (nominal GObject, boxed, interface, enum, `GType`) is collapsed
 *    to `any`. This isolates call-convention shape from GObject identity.
 *
 * Free functions stay `any`-typed: the runtime cannot statically type a
 * marshaled FFI result, so their precise parameter and result types are out of
 * scope for this gate.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const FFI_ROOT = dirname(SCRIPT_DIR);
const SRC_DIR = join(FFI_ROOT, "src");
const GENERATED_DIR = join(SRC_DIR, "generated");
const VIRTUAL_ROOT = join(FFI_ROOT, "__conformance__");

const IMPL_PREFIX = "gtkx-conformance:impl:";
const CONTRACT_PREFIX = "gtkx-conformance:contract:";
const FFI_PACKAGE_PREFIX = "@gtkx/ffi/";

const TARGET_OPTIONS: ts.CompilerOptions = {
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

const FORMAT_HOST: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (fileName: string) => fileName,
    getCurrentDirectory: () => FFI_ROOT,
    getNewLine: () => ts.sys.newLine,
};

const implJsPath = (namespace: string): string => join(GENERATED_DIR, namespace, `${namespace}.js`);
const contractDtsPath = (namespace: string): string => join(VIRTUAL_ROOT, "contract", `${namespace}.d.ts`);
const checkTsPath = (namespace: string): string => join(VIRTUAL_ROOT, "check", `${namespace}.conformance.ts`);

/**
 * Path of the hand-written runtime entry for a namespace, if one exists.
 *
 * A namespace with a `src/<ns>/index.ts` ships its generated `<ns>.js` re-export
 * alongside hand-written overrides and `declare module` augmentations; that
 * `index.ts` is the real `@gtkx/ffi/<ns>` surface. A namespace without one
 * ships the generated `<ns>.js` unmodified.
 *
 * @param namespace - Namespace identifier.
 * @returns The hand-written entry path, or `undefined` when none exists.
 */
const handWrittenEntryPath = (namespace: string): string | undefined => {
    const entry = join(SRC_DIR, namespace, "index.ts");
    return existsSync(entry) ? entry : undefined;
};

/**
 * Path the impl side of a namespace's conformance assertion resolves to: the
 * hand-written runtime entry when one exists, otherwise the bare generated
 * `<ns>.js`. The generated `<ns>.js` is still type-checked either way — the
 * hand-written entry re-exports it — so the override layer cannot hide a gap
 * in the generated code.
 *
 * @param namespace - Namespace identifier.
 * @returns The absolute impl entry path.
 */
const implEntryPath = (namespace: string): string => handWrittenEntryPath(namespace) ?? implJsPath(namespace);

/**
 * Type-reference identifiers the contract normalization keeps verbatim. Every
 * other identifier is a nominal GObject, boxed, interface, enum or `GType`
 * reference and is collapsed to `any` so the gate measures call-convention
 * shape rather than GObject identity.
 */
const STRUCTURAL_TYPE_NAMES = new Set(["Array", "ReadonlyArray", "Promise", "PromiseLike"]);

/**
 * Picks the JSDoc `@type` annotation for a runtime `return` expression, or
 * `undefined` to leave the expression untouched.
 *
 * The annotation is the type written inside a `/** @type {...} *\/` cast that
 * wraps the parenthesized return expression.
 */
type ReturnAnnotation = (expression: ts.Expression) => string | undefined;

/**
 * Rewrites a runtime `.js` so each `return` expression an annotation picker
 * matches is wrapped in a JSDoc `@type` cast, controlling the type TypeScript
 * infers for the value the runtime returns.
 *
 * @param source - The runtime JavaScript source.
 * @param fileName - Absolute path of the runtime file, used for parsing.
 * @param annotate - Picks the cast type for a return expression, or skips it.
 * @returns The source with matched return expressions annotated.
 */
const annotateReturns = (source: string, fileName: string, annotate: ReturnAnnotation): string => {
    const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS);
    const edits: { start: number; end: number; text: string }[] = [];

    const visit = (node: ts.Node): void => {
        if (ts.isReturnStatement(node) && node.expression !== undefined) {
            const annotation = annotate(node.expression);
            if (annotation !== undefined) {
                edits.push(
                    {
                        start: node.expression.getStart(sourceFile),
                        end: node.expression.getStart(sourceFile),
                        text: `/** @type {${annotation}} */ (`,
                    },
                    { start: node.expression.getEnd(), end: node.expression.getEnd(), text: ")" },
                );
            }
        }
        ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    if (edits.length === 0) {
        return source;
    }

    edits.sort((a, b) => b.start - a.start);
    let result = source;
    for (const edit of edits) {
        result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
    }
    return result;
};

/**
 * Rewrites a runtime `.js` so every `return` whose argument is a non-empty
 * array literal is typed as a fixed-length tuple of `any`.
 *
 * TypeScript infers a bare array-literal return as `any[]`, discarding the
 * arity that an out/inout-parameter return tuple carries. Annotating the
 * parenthesized literal with a JSDoc `@type` cast of matching arity restores
 * that arity while keeping element types collapsed to `any`. Empty literals are
 * left untouched: a `return []` is a genuine empty-array fallback, not a tuple.
 *
 * @param source - The runtime JavaScript source.
 * @param fileName - Absolute path of the runtime file, used for parsing.
 * @returns The source with array-literal returns typed as tuples.
 */
const tupleAnnotateArrayReturns = (source: string, fileName: string): string =>
    annotateReturns(source, fileName, (expression) => {
        if (!ts.isArrayLiteralExpression(expression)) {
            return undefined;
        }
        const elementCount = expression.elements.length;
        if (elementCount === 0 || expression.elements.some(ts.isSpreadElement)) {
            return undefined;
        }
        return `[${Array.from({ length: elementCount }, () => "any").join(", ")}]`;
    });

/**
 * Rewrites a runtime `.js` so every `return` whose argument is a
 * `promisify(...)` call is typed as `Promise<any>`.
 *
 * A GIO-style async wrapper delegates to the `promisify` runtime helper.
 * That helper is imported from the FFI runtime barrel, which the conformance
 * host leaves unresolved, so its call result infers as `any` — erasing the
 * `Promise` wrapping the contract `.d.ts` declares for async methods.
 * Annotating the call expression with a JSDoc `@type` cast restores the
 * `Promise` shape, keeping async wrapping verified, while the resolved value
 * stays `any` — bidirectionally assignable — since the marshaled FFI result
 * is not statically typed, mirroring how array-literal returns collapse their
 * elements to `any`.
 *
 * @param source - The runtime JavaScript source.
 * @param fileName - Absolute path of the runtime file, used for parsing.
 * @returns The source with `promisify` returns typed as `Promise<any>`.
 */
const promisifyAnnotateReturns = (source: string, fileName: string): string =>
    annotateReturns(source, fileName, (expression) =>
        ts.isCallExpression(expression) &&
        ts.isIdentifier(expression.expression) &&
        expression.expression.text === "promisify"
            ? "Promise<any>"
            : undefined,
    );

/**
 * Rewrites a runtime `.js` so every `return` whose argument is a
 * `this.getProperty(...)` call is typed as `any`.
 *
 * A generated property accessor delegates to the hand-written `getProperty`
 * override, which marshals a GValue and is typed `unknown` — the FFI result
 * cannot be statically typed. The contract `.d.ts` declares each property with
 * its precise GIR type (`boolean`, `string | null`, …). Annotating the
 * `getProperty` call with a JSDoc `@type` cast keeps the accessor's
 * value-versus-void return shape verified while leaving the marshaled value
 * `any` — bidirectionally assignable — mirroring how `promisify` returns and
 * array-literal returns collapse their payloads to `any`.
 *
 * @param source - The runtime JavaScript source.
 * @param fileName - Absolute path of the runtime file, used for parsing.
 * @returns The source with `getProperty` returns typed as `any`.
 */
const getPropertyAnnotateReturns = (source: string, fileName: string): string =>
    annotateReturns(source, fileName, (expression) =>
        ts.isCallExpression(expression) &&
        ts.isPropertyAccessExpression(expression.expression) &&
        expression.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
        expression.expression.name.text === "getProperty"
            ? "any"
            : undefined,
    );

/**
 * Normalizes a contract `.d.ts` so the gate measures call-convention shape
 * rather than GObject identity: every nominal type-reference identifier
 * collapses to `any`, while parameter arity, return-tuple structure, `Promise`
 * wrapping, function signatures, primitives and unions/intersections are
 * preserved by structural recursion.
 *
 * A `Promise<T>`, `Array<T>`, `ReadonlyArray<T>` keeps its constructor name so
 * async wrapping and array-ness survive; its type arguments are still
 * normalized. A bare nominal reference — `Widget`, `GType`, `File` — becomes
 * `any`. Compound type nodes (tuples, array types, function types, type
 * literals, indexed accesses) are recursed into so nested nominal references
 * inside them collapse as well.
 *
 * Literal types — numeric, string, bigint, boolean — are widened to their
 * primitive keyword: literal precision is a primitive-type concern outside the
 * scope of a call-convention shape gate, and the untyped runtime exposes such
 * values only as their primitive. `null` and `undefined` literals are kept.
 *
 * @param source - The contract declaration source.
 * @param fileName - Absolute path of the contract file, used for parsing.
 * @returns The normalized declaration source.
 */
const widenLiteralType = (node: ts.LiteralTypeNode, factory: ts.NodeFactory): ts.TypeNode | undefined => {
    const literal = node.literal;
    if (literal.kind === ts.SyntaxKind.NullKeyword) {
        return undefined;
    }
    if (ts.isStringLiteral(literal)) {
        return factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
    }
    if (ts.isBigIntLiteral(literal)) {
        return factory.createKeywordTypeNode(ts.SyntaxKind.BigIntKeyword);
    }
    if (ts.isNumericLiteral(literal) || (ts.isPrefixUnaryExpression(literal) && ts.isNumericLiteral(literal.operand))) {
        return factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    }
    if (literal.kind === ts.SyntaxKind.TrueKeyword || literal.kind === ts.SyntaxKind.FalseKeyword) {
        return factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
    }
    return undefined;
};

const normalizeContract = (source: string, fileName: string): string => {
    const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);

    const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
        const { factory } = context;
        const visit = (node: ts.Node): ts.Node => {
            if (ts.isTypeReferenceNode(node) && !ts.isQualifiedName(node.typeName)) {
                if (STRUCTURAL_TYPE_NAMES.has(node.typeName.text)) {
                    return ts.visitEachChild(node, visit, context);
                }
                return factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
            }
            if (ts.isTypeReferenceNode(node)) {
                return factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
            }
            if (ts.isLiteralTypeNode(node)) {
                return widenLiteralType(node, factory) ?? node;
            }
            return ts.visitEachChild(node, visit, context);
        };
        return (file) => ts.visitNode(file, visit) as ts.SourceFile;
    };

    const result = ts.transform(sourceFile, [transformer]);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const printed = printer.printFile(result.transformed[0] ?? sourceFile);
    result.dispose();
    return printed;
};

/**
 * Namespaces excluded from the conformance gate because ts-for-gir produces
 * no usable contract for them.
 *
 * `cairo` has no ts-for-gir contract: ts-for-gir's cairo template is an
 * unfinished stub, so the generated `cairo.d.ts` carries only empty
 * GObject-metadata shells. gtkx's cairo bindings are written against node-gtk's
 * cairo runtime directly and are verified separately, not against a contract.
 */
const UNCONTRACTED_NAMESPACES = new Set(["cairo"]);

/**
 * Enumerates every generated namespace that has both a runtime and a
 * declaration file under `src/generated/`.
 *
 * @returns Sorted namespace identifiers.
 */
const collectNamespaces = (): string[] =>
    readdirSync(GENERATED_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter(
            (name) =>
                existsSync(join(GENERATED_DIR, name, `${name}.js`)) &&
                existsSync(join(GENERATED_DIR, name, `${name}.d.ts`)),
        )
        .sort((a, b) => a.localeCompare(b));

/**
 * Collects the names of every exported `class` declaration in a source file.
 *
 * @param source - The module source.
 * @param fileName - Absolute path of the source, used for parsing.
 * @param scriptKind - Whether the source is TypeScript or JavaScript.
 * @returns The set of exported class identifiers.
 */
const collectExportedClassNames = (source: string, fileName: string, scriptKind: ts.ScriptKind): Set<string> => {
    const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.ESNext, true, scriptKind);
    const names = new Set<string>();
    for (const statement of sourceFile.statements) {
        if (
            ts.isClassDeclaration(statement) &&
            statement.name !== undefined &&
            statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true
        ) {
            names.add(statement.name.text);
        }
    }
    return names;
};

/**
 * Renders the conformance assertion source for a single namespace.
 *
 * The forward direction (`impl satisfies Contract`) catches a runtime missing a
 * declared member, a runtime method with surplus required parameters, and a
 * runtime return tuple shorter than the contract's.
 *
 * The reverse direction emits one assertion per class the contract and runtime
 * both export, comparing the contract's instance type against the runtime's
 * instance type restricted to the members the contract declares
 * (`Pick<ImplInstance, keyof ContractInstance>`). One concrete assertion per
 * class — rather than a single mapped-type comparison — keeps the class name a
 * literal key, so the relation is resolved eagerly instead of through the
 * homomorphic mapped-type fast path that elides deferred indexed accesses.
 * Restricting to shared members catches a contract method with surplus
 * parameters and a contract return tuple shorter than the runtime's.
 *
 * The extra-member directions emit, per shared class, two assertions that the
 * runtime exposes no member the contract omits — one for the constructor
 * (static) side, one for the instance side: `Exclude<keyof Impl, keyof
 * Contract>` must resolve to `never`. Any leftover key names a member the
 * binding exposes but node-gtk's ts-for-gir contract never declared, and fails
 * the build.
 *
 * @param namespace - Namespace identifier.
 * @param sharedClasses - Names of classes exported by both runtime and contract.
 * @returns TypeScript source asserting runtime and contract agree on shape.
 */
const checkSource = (namespace: string, sharedClasses: readonly string[]): string => {
    const classAssertions = sharedClasses
        .map((name, index) => {
            const key = JSON.stringify(name);
            return (
                `type _Contract${index} = InstanceType<Contract[${key}]>;\n` +
                `type _Impl${index} = InstanceType<(typeof impl)[${key}]>;\n` +
                `const _reverse${index} = (undefined as unknown as _Contract${index}) satisfies ` +
                `Pick<_Impl${index}, keyof _Contract${index}>;\n` +
                `const _noStaticExtra${index}: ` +
                `[Exclude<keyof (typeof impl)[${key}], keyof Contract[${key}]>] extends [never] ? true : ` +
                `{ class: ${key}; implOnlyStatic: Exclude<keyof (typeof impl)[${key}], keyof Contract[${key}]> } = true;\n` +
                `const _noInstanceExtra${index}: ` +
                `[Exclude<keyof _Impl${index}, keyof _Contract${index}>] extends [never] ? true : ` +
                `{ class: ${key}; implOnlyInstance: Exclude<keyof _Impl${index}, keyof _Contract${index}> } = true;`
            );
        })
        .join("\n");
    return (
        `import * as impl from ${JSON.stringify(IMPL_PREFIX + namespace)};\n` +
        `type Contract = typeof import(${JSON.stringify(CONTRACT_PREFIX + namespace)});\n` +
        `const _forward = impl satisfies Contract;\n` +
        `${classAssertions}\n`
    );
};

/**
 * Resolves one module specifier, routing conformance and `@gtkx/ffi/<ns>`
 * specifiers to their in-memory targets and delegating everything else to
 * standard resolution against the declaration-hiding host.
 *
 * An FFI-runtime import made by a generated module — anything that is not a
 * sibling generated namespace — is deliberately left unresolved so its
 * bindings type as `any`. The runtime cannot statically type a marshaled FFI
 * result, so the check verifies declared API existence and enum values
 * rather than unknowable FFI-result types.
 *
 * @param specifier - The module specifier text.
 * @param containingFile - Absolute path of the importing file.
 * @param options - Active compiler options.
 * @param containingSourceFile - Importing source file.
 * @param host - Resolution host.
 * @param namespaces - Known namespace identifiers.
 * @returns The resolution result.
 */
const resolveSpecifier = (
    specifier: string,
    containingFile: string,
    options: ts.CompilerOptions,
    containingSourceFile: ts.SourceFile | undefined,
    host: ts.ModuleResolutionHost,
    namespaces: Set<string>,
): ts.ResolvedModuleWithFailedLookupLocations => {
    if (specifier.startsWith(IMPL_PREFIX)) {
        const resolvedFileName = implEntryPath(specifier.slice(IMPL_PREFIX.length));
        return {
            resolvedModule: {
                resolvedFileName,
                extension: resolvedFileName.endsWith(".ts") ? ts.Extension.Ts : ts.Extension.Js,
                isExternalLibraryImport: false,
            },
        };
    }

    let contractNamespace: string | undefined;
    if (specifier.startsWith(CONTRACT_PREFIX)) {
        contractNamespace = specifier.slice(CONTRACT_PREFIX.length);
    } else if (specifier.startsWith(FFI_PACKAGE_PREFIX)) {
        contractNamespace = specifier.slice(FFI_PACKAGE_PREFIX.length);
    }

    if (contractNamespace !== undefined && namespaces.has(contractNamespace)) {
        return {
            resolvedModule: {
                resolvedFileName: contractDtsPath(contractNamespace),
                extension: ts.Extension.Dts,
                isExternalLibraryImport: false,
            },
        };
    }

    if (containingFile.startsWith(`${GENERATED_DIR}/`)) {
        const resolvedPath = specifier.startsWith(".") ? resolve(dirname(containingFile), specifier) : undefined;
        if (!resolvedPath?.startsWith(`${GENERATED_DIR}/`)) {
            return { resolvedModule: undefined };
        }
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
 * @param virtualFiles - Absolute path to file content.
 * @param namespaces - Known namespace identifiers.
 * @returns The configured host.
 */
const createConformanceHost = (virtualFiles: Map<string, string>, namespaces: Set<string>): ts.CompilerHost => {
    const host = ts.createCompilerHost(TARGET_OPTIONS, true);
    const isHiddenDeclaration = (fileName: string): boolean =>
        fileName.endsWith(".d.ts") && fileName.startsWith(`${GENERATED_DIR}/`);

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

const main = (): void => {
    if (!existsSync(GENERATED_DIR)) {
        console.error(`conformance: ${GENERATED_DIR} not found — run codegen first.`);
        process.exit(1);
    }

    const namespaces = collectNamespaces().filter((namespace) => !UNCONTRACTED_NAMESPACES.has(namespace));
    if (namespaces.length === 0) {
        console.error("conformance: no generated namespaces found under src/generated.");
        process.exit(1);
    }

    const virtualFiles = new Map<string, string>();
    const rootNames: string[] = [];
    for (const namespace of namespaces) {
        const declarationPath = join(GENERATED_DIR, namespace, `${namespace}.d.ts`);
        const declaration = readFileSync(declarationPath, "utf8");
        const normalizedDeclaration = normalizeContract(declaration, declarationPath);
        virtualFiles.set(contractDtsPath(namespace), normalizedDeclaration);

        const runtimePath = implJsPath(namespace);
        const runtime = readFileSync(runtimePath, "utf8");
        const annotatedRuntime = getPropertyAnnotateReturns(
            promisifyAnnotateReturns(tupleAnnotateArrayReturns(runtime, runtimePath), runtimePath),
            runtimePath,
        );
        virtualFiles.set(runtimePath, annotatedRuntime);

        const contractClasses = collectExportedClassNames(normalizedDeclaration, declarationPath, ts.ScriptKind.TS);
        const runtimeClasses = collectExportedClassNames(runtime, runtimePath, ts.ScriptKind.JS);
        const sharedClasses = [...contractClasses]
            .filter((name) => runtimeClasses.has(name))
            .sort((a, b) => a.localeCompare(b));

        const checkPath = checkTsPath(namespace);
        virtualFiles.set(checkPath, checkSource(namespace, sharedClasses));
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

    const violations: ts.Diagnostic[] = [];
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

    console.log(
        `conformance: ${namespaces.length} namespace(s) verified — runtime .js satisfies .d.ts contract ` +
            `(${[...UNCONTRACTED_NAMESPACES].toSorted((a, b) => a.localeCompare(b)).join(", ")} excluded — no contract).`,
    );
};

export {
    annotateReturns,
    checkSource,
    getPropertyAnnotateReturns,
    handWrittenEntryPath,
    implEntryPath,
    implJsPath,
    normalizeContract,
    promisifyAnnotateReturns,
    tupleAnnotateArrayReturns,
    UNCONTRACTED_NAMESPACES,
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
