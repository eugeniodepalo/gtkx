import ts from "typescript";

/**
 * Result of transpiling a single TypeScript source file.
 */
export type TranspiledFile = {
    /** Stripped-types JavaScript output. */
    js: string;
    /** Generated TypeScript declaration output. */
    dts: string;
};

const COMPILER_OPTIONS: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
    declaration: true,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    removeComments: false,
    sourceMap: false,
    declarationMap: false,
};

/**
 * Transpiles a single TypeScript source file to a `.js` / `.d.ts` pair.
 *
 * Uses {@link ts.transpileModule} for the JS output (type-stripping only,
 * no type checking, very fast) and {@link ts.transpileDeclaration} for the
 * declaration output (single-file declaration emit, requires explicit type
 * annotations on all exports).
 *
 * The codegen output uses isolated-declaration-friendly patterns
 * (every export has an explicit type), so this fast path applies.
 *
 * Throws if the declaration emit reports any error-category diagnostic, since
 * silently emitting a `.d.ts` that types everything as `any` would degrade
 * downstream type-checking without notice.
 *
 * @param fileName - Source filename, used by TS for path resolution in the output
 * @param source - The TypeScript source code
 * @returns Object with `.js` and `.d.ts` content as strings
 * @throws If `ts.transpileDeclaration` reports any error-category diagnostic
 */
const transpileFile = (fileName: string, source: string): TranspiledFile => {
    const jsResult = ts.transpileModule(source, {
        compilerOptions: COMPILER_OPTIONS,
        fileName,
        reportDiagnostics: false,
    });

    const dtsResult = ts.transpileDeclaration(source, {
        compilerOptions: COMPILER_OPTIONS,
        fileName,
    });

    const errorDiagnostics = (dtsResult.diagnostics ?? []).filter(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    );
    if (errorDiagnostics.length > 0) {
        const messages = errorDiagnostics
            .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
            .join("\n  - ");
        throw new Error(`transpileDeclaration failed for ${fileName}:\n  - ${messages}`);
    }

    return {
        js: jsResult.outputText,
        dts: dtsResult.outputText,
    };
};

/**
 * Maps a `.ts` codegen output set to a `.js` + `.d.ts` output set.
 *
 * Each `*.ts` input produces a `*.js` and a `*.d.ts` entry. Non-`.ts`
 * inputs (if any) are passed through unchanged.
 *
 * @param tsFiles - Map of relative paths to TypeScript source content
 * @returns Map of relative paths to transpiled file content
 */
export const transpileCodegenFiles = (tsFiles: Map<string, string>): Map<string, string> => {
    const result = new Map<string, string>();

    for (const [filePath, source] of tsFiles) {
        if (!filePath.endsWith(".ts")) {
            result.set(filePath, source);
            continue;
        }

        const { js, dts } = transpileFile(filePath, source);
        const stem = filePath.slice(0, -".ts".length);
        result.set(`${stem}.js`, js);
        result.set(`${stem}.d.ts`, dts);
    }

    return result;
};
