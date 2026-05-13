import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTsForGir } from "./invoke-cli.js";
import { loadAndRewrite, rewriteDefaultImportsToNamespace, rewriteModuleKeywordToNamespace } from "./rewrite.js";

/**
 * Runs the full types pipeline: spawns ts-for-gir against the GIR directory,
 * loads every per-namespace output into ts-morph, rewrites module specifiers
 * into the gtkx shape, and writes one `<ns>/<ns>.d.ts` per namespace under
 * `outDir`. The intermediate ts-for-gir scratch directory is cleaned up
 * regardless of success or failure.
 *
 * @param girsDir Directory containing the GIR XML files to process.
 * @param outDir Final destination for the per-namespace `.d.ts` files.
 */
export async function runTypesPipeline(girsDir: string, outDir: string): Promise<TypesPipelineResult> {
    const scratchDir = await mkdtemp(join(tmpdir(), "gtkx-tsforgir-"));
    try {
        await runTsForGir(girsDir, scratchDir);

        const filenames = await readdir(scratchDir);
        const rawFilesByName = new Map<string, string>();
        for (const filename of filenames) {
            if (!filename.endsWith(".d.ts")) continue;
            const contents = await readFile(join(scratchDir, filename), "utf-8");
            rawFilesByName.set(filename, contents);
        }

        const rewritten = loadAndRewrite(rawFilesByName);

        await mkdir(outDir, { recursive: true });
        const namespacesWritten: string[] = [];
        for (const { namespace, sourceFile } of rewritten) {
            const nsDir = join(outDir, namespace);
            await mkdir(nsDir, { recursive: true });
            const withNamespaceImports = rewriteDefaultImportsToNamespace(sourceFile.getFullText());
            const finalSource = rewriteModuleKeywordToNamespace(withNamespaceImports);
            await writeFile(join(nsDir, `${namespace}.d.ts`), finalSource, "utf-8");
            namespacesWritten.push(namespace);
        }

        return { namespaces: namespacesWritten.sort() };
    } finally {
        await rm(scratchDir, { recursive: true, force: true });
    }
}

/**
 * Summary returned by {@link runTypesPipeline}.
 */
export interface TypesPipelineResult {
    /** Sorted list of namespace identifiers for which a `.d.ts` was emitted. */
    namespaces: string[];
}
