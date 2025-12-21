import { defineCommand } from "citty";
import { intro, log, outro } from "../progress.js";
import { ffi } from "./ffi.js";
import { jsx } from "./jsx.js";

export const all = defineCommand({
    meta: {
        name: "all",
        description: "Run all code generation (FFI and JSX)",
    },
    args: {
        "girs-dir": {
            type: "string",
            description: "Directory containing GIR files",
            required: true,
        },
        "ffi-output-dir": {
            type: "string",
            description: "Output directory for FFI bindings",
            required: true,
        },
        "jsx-output-dir": {
            type: "string",
            description: "Output directory for JSX types",
            required: true,
        },
    },
    run: async ({ args }) => {
        intro("Running all code generation");

        log.step("Generating FFI bindings...");
        await ffi.run?.({
            args: {
                _: [],
                "girs-dir": args["girs-dir"],
                "output-dir": args["ffi-output-dir"],
            },
            rawArgs: [],
            cmd: ffi,
        });

        log.step("Generating JSX types...");
        await jsx.run?.({
            args: {
                _: [],
                "girs-dir": args["girs-dir"],
                "output-dir": args["jsx-output-dir"],
            },
            rawArgs: [],
            cmd: jsx,
        });

        outro("All code generation complete");
    },
});
