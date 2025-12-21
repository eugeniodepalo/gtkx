import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { GirNamespace } from "@gtkx/gir";
import { GirParser, TypeRegistry } from "@gtkx/gir";
import { defineCommand } from "citty";
import { CodeGenerator } from "../ffi/index.js";
import { intro, log, outro, spinner } from "../progress.js";
import { GIRS_TO_SYNC } from "./sync.js";

export const ffi = defineCommand({
    meta: {
        name: "ffi",
        description: "Generate FFI bindings from GIR files",
    },
    args: {
        "girs-dir": {
            type: "string",
            description: "Directory containing GIR files",
            required: true,
        },
        "output-dir": {
            type: "string",
            description: "Output directory for generated bindings",
            required: true,
        },
    },
    run: async ({ args }) => {
        const girsDir = args["girs-dir"];
        const outputDir = args["output-dir"];

        intro("Generating FFI bindings");

        if (!existsSync(girsDir)) {
            log.error(`GIR directory not found: ${girsDir}`);
            log.info("Run 'gtkx-codegen sync' first to sync GIR files from system");
            process.exit(1);
        }

        if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
            log.info(`Created output directory: ${outputDir}`);
        }

        const girFiles = readdirSync(girsDir)
            .filter((f) => f.endsWith(".gir"))
            .filter((f) => GIRS_TO_SYNC.has(f));

        log.info(`Found ${girFiles.length} GIR files`);

        const parseSpinner = spinner("Parsing GIR files");
        const namespaces: GirNamespace[] = [];
        for (const file of girFiles) {
            try {
                const girContent = readFileSync(join(girsDir, file), "utf-8");
                const parser = new GirParser();
                const namespace = parser.parse(girContent);
                namespaces.push(namespace);
            } catch (error) {
                parseSpinner.stop(`Failed to parse ${file}`);
                throw error;
            }
        }
        parseSpinner.stop(`Parsed ${namespaces.length} namespaces`);

        const typeRegistry = TypeRegistry.fromNamespaces(namespaces);
        const allNamespaces = new Map(namespaces.map((ns) => [ns.name, ns]));

        log.info(`Built type registry with ${namespaces.length} namespaces`);

        const genSpinner = spinner("Generating bindings");

        for (const namespace of namespaces) {
            try {
                const generator = new CodeGenerator({
                    outputDir,
                    namespace: namespace.name,
                    typeRegistry,
                    allNamespaces,
                });
                const generatedFiles = await generator.generateNamespace(namespace);

                const namespaceOutputDir = join(outputDir, namespace.name.toLowerCase());
                rmSync(namespaceOutputDir, { recursive: true, force: true });
                mkdirSync(namespaceOutputDir, { recursive: true });

                for (const [filename, content] of generatedFiles) {
                    writeFileSync(join(namespaceOutputDir, filename), content);
                }

                genSpinner.message(`Generated ${namespace.name}`);
            } catch (error) {
                genSpinner.stop(`Failed to generate ${namespace.name}`);
                throw error;
            }
        }

        genSpinner.stop("Generated all bindings");
        outro("FFI generation complete");
    },
});
