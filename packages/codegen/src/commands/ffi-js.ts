import { existsSync } from "node:fs";
import { defineCommand } from "citty";
import { intro, log, outro, spinner } from "../core/utils/progress.js";
import { runFfiJsPipeline } from "../pipelines/ffi-js/index.js";
import { GIRS_DIR } from "./constants.js";

const SCRATCH_FFI_JS_OUTPUT_DIR = "packages/ffi/src/generated-new";

export const ffiJs = defineCommand({
    meta: {
        name: "ffi-js",
        description: "Generate raw .js FFI bindings via the existing codegen + post-processor (scratch output)",
    },
    args: {
        "girs-dir": {
            type: "string",
            description: "Directory containing GIR files",
            default: GIRS_DIR,
        },
        "output-dir": {
            type: "string",
            description: "Output directory for per-namespace .js files",
            default: SCRATCH_FFI_JS_OUTPUT_DIR,
        },
    },
    run: async ({ args }) => {
        const girsDir = args["girs-dir"];
        const outputDir = args["output-dir"];

        intro("Generating FFI .js bindings");

        if (!existsSync(girsDir)) {
            log.error(`GIR directory not found: ${girsDir}`);
            log.info("Run 'gtkx-codegen sync' first to sync GIR files from system");
            process.exit(1);
        }

        const genSpinner = spinner("Running FFI codegen + transpile");
        const result = await runFfiJsPipeline(girsDir, outputDir);
        genSpinner.stop(`Generated ${result.totalFiles} files across ${result.namespaces.length} namespaces`);

        log.success(`Wrote ${result.totalFiles} .js files to ${outputDir}`);
        outro("FFI .js generation complete");
    },
});
