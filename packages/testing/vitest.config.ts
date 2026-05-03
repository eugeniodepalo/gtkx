import gtkx from "@gtkx/vitest";
import { defineConfig, mergeConfig } from "vitest/config";
import { packageVitestConfig } from "../../vitest.shared.js";

export default mergeConfig(
    packageVitestConfig(import.meta.url),
    defineConfig({
        plugins: [gtkx()],
        test: {
            setupFiles: ["packages/testing/tests/setup.ts"],
        },
    }),
);
