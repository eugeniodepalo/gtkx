#!/usr/bin/env node
import { createRequire } from "node:module";
import { defineCommand, runMain } from "citty";
import { all } from "./commands/all.js";
import { ffi } from "./commands/ffi.js";
import { jsx } from "./commands/jsx.js";
import { sync } from "./commands/sync.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const main = defineCommand({
    meta: {
        name: "gtkx-codegen",
        version,
        description: "Code generation tools for GTKX",
    },
    subCommands: {
        all,
        ffi,
        jsx,
        sync,
    },
});

runMain(main);
