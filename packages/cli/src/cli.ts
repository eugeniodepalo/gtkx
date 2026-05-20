import { createRequire } from "node:module";
import { defineCommand } from "citty";
import { buildCmd } from "./commands/build.js";
import { codegen } from "./commands/codegen.js";
import { create } from "./commands/create.js";
import { dev } from "./commands/dev.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

/**
 * Top-level `gtkx` command, assembled from the per-command modules in
 * `src/commands/`. Execution happens at the binary edge in
 * `bin/gtkx.js`.
 */
export const main = defineCommand({
    meta: {
        name: "gtkx",
        version,
        description: "CLI for GTKX - create and develop GTK4 React applications",
    },
    subCommands: {
        dev,
        build: buildCmd,
        codegen,
        create,
    },
});
