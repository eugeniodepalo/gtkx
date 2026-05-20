import { resolve } from "node:path";
import { defineCommand } from "citty";
import { runCodegen } from "../codegen/run-codegen.js";

/**
 * `gtkx codegen` — regenerate TypeScript bindings for the GIR libraries
 * declared in `gtkx.config.ts`.
 *
 * Skips work when the codegen cache reports the output is up to date,
 * unless `--force` is supplied.
 */
export const codegen = defineCommand({
    meta: {
        name: "codegen",
        description: "Generate TypeScript bindings for the GIR libraries declared in gtkx.config.ts",
    },
    args: {
        force: {
            type: "boolean",
            description: "Skip cache check and regenerate unconditionally",
            default: false,
        },
        cwd: {
            type: "string",
            description: "Project root (default: current working directory)",
        },
    },
    async run({ args }) {
        const cwd = args.cwd ? resolve(args.cwd) : process.cwd();
        const startedAt = Date.now();

        const result = await runCodegen({ cwd, force: args.force });

        if (!result.ran) {
            console.log("[gtkx] codegen: up to date (use --force to regenerate)");
            return;
        }

        if (result.configFile) {
            console.log(`[gtkx] codegen: config=${result.configFile}`);
        }
        if (result.libraries) {
            console.log(`[gtkx] codegen: libraries=${result.libraries.join(", ")}`);
        }
        if (result.girPath) {
            console.log(`[gtkx] codegen: girPath=${result.girPath.join(":")}`);
        }

        const total = Date.now() - startedAt;
        console.log(
            `[gtkx] codegen: ${result.namespaces} namespaces, ${result.widgets} widgets in ${result.duration}ms (total ${total}ms)`,
        );
    },
});
