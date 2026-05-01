import { existsSync } from "node:fs";
import { defineCommand } from "citty";
import { CodegenOrchestrator } from "../core/codegen-orchestrator.js";
import { intro, log, outro, spinner } from "../core/utils/progress.js";
import { writeGeneratedDir } from "../core/utils/writer.js";
import { FFI_OUTPUT_DIR, GIRS_DIR, REACT_OUTPUT_DIR } from "./constants.js";

export const run = defineCommand({
    meta: {
        name: "run",
        description: "Run code generation (FFI and React bindings)",
    },
    args: {
        "girs-dir": {
            type: "string",
            description: "Directory containing GIR files",
            default: GIRS_DIR,
        },
        "ffi-output-dir": {
            type: "string",
            description: "Output directory for FFI bindings",
            default: FFI_OUTPUT_DIR,
        },
        "react-output-dir": {
            type: "string",
            description: "Output directory for React bindings",
            default: REACT_OUTPUT_DIR,
        },
    },
    run: async ({ args }) => {
        const girsDir = args["girs-dir"];
        const ffiOutputDir = args["ffi-output-dir"];
        const reactOutputDir = args["react-output-dir"];

        intro("Running code generation");

        if (!existsSync(girsDir)) {
            log.error(`GIR directory not found: ${girsDir}`);
            log.info("Run 'gtkx-codegen sync' first to sync GIR files from system");
            process.exit(1);
        }

        const orchestrator = new CodegenOrchestrator({
            girsDir,
        });

        const genSpinner = spinner("Generating bindings");

        const result = await orchestrator.generate();

        genSpinner.stop(`Generated ${result.stats.widgets} widgets from ${result.stats.namespaces} namespaces`);

        const ffiSpinner = spinner("Writing FFI files");
        writeGeneratedDir(ffiOutputDir, result.ffiFiles);
        ffiSpinner.stop(`Wrote ${result.ffiFiles.size} FFI files`);

        const reactSpinner = spinner("Writing React files");
        writeGeneratedDir(reactOutputDir, result.reactFiles);
        reactSpinner.stop(`Wrote ${result.reactFiles.size} React files`);

        log.success(`Completed in ${result.stats.duration}ms`);
        outro("Code generation complete");
    },
});
