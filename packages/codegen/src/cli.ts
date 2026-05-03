#!/usr/bin/env node
import { createRequire } from "node:module";
import { defineCommand, runMain } from "citty";
import { run } from "./commands/run.js";
import { sync } from "./commands/sync.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

export const main = defineCommand({
    meta: {
        name: "gtkx-codegen",
        version,
        description: "Code generation tools for GTKX",
    },
    subCommands: {
        run,
        sync,
    },
});

if (import.meta.main) {
    runMain(main);
}
