import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { defineCommand } from "citty";
import { intro, log, outro, spinner } from "../core/utils/progress.js";
import { runTypesPipeline } from "../pipelines/types/index.js";
import { GIRS_DIR } from "./constants.js";

const SCRATCH_TYPES_OUTPUT_DIR = "packages/ffi/src/generated-new";

const enumerateNamespaceRoots = async (girsDir: string): Promise<string[]> => {
    const files = await readdir(girsDir);
    return files.filter((f) => f.endsWith(".gir")).map((f) => f.replace(/\.gir$/, ""));
};

export const types = defineCommand({
    meta: {
        name: "types",
        description: "Generate FFI type declarations via ts-for-gir (scratch output)",
    },
    args: {
        "girs-dir": {
            type: "string",
            description: "Directory containing GIR files",
            default: GIRS_DIR,
        },
        "output-dir": {
            type: "string",
            description: "Output directory for per-namespace .d.ts files",
            default: SCRATCH_TYPES_OUTPUT_DIR,
        },
    },
    run: async ({ args }) => {
        const girsDir = args["girs-dir"];
        const outputDir = args["output-dir"];

        intro("Generating FFI type declarations");

        if (!existsSync(girsDir)) {
            log.error(`GIR directory not found: ${girsDir}`);
            log.info("Run 'gtkx-codegen sync' first to sync GIR files from system");
            process.exit(1);
        }

        const genSpinner = spinner("Running ts-for-gir");
        const libraries = await enumerateNamespaceRoots(girsDir);
        const result = await runTypesPipeline(libraries, [girsDir], outputDir);
        genSpinner.stop(`Generated ${result.namespaces.length} namespaces`);

        log.success(`Wrote ${result.namespaces.length} type declarations to ${outputDir}`);
        outro("Types generation complete");
    },
});
