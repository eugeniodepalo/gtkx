import { ModuleKind, ScriptTarget, transpileModule } from "typescript";

/**
 * Strips TypeScript-only constructs from a generated `.ts` source string and
 * returns the resulting JavaScript text. Generics, type annotations, type
 * aliases, interfaces, and `as` casts disappear; class and function bodies
 * survive intact along with their JSDoc comments.
 */
export function transpileToJs(tsSource: string): string {
    const result = transpileModule(tsSource, {
        compilerOptions: {
            target: ScriptTarget.ESNext,
            module: ModuleKind.ESNext,
            removeComments: false,
            isolatedModules: true,
            verbatimModuleSyntax: false,
        },
    });
    return result.outputText;
}
