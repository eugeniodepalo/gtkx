import gtkx from "@gtkx/vitest";
import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "../../vitest.config.js";

export default mergeConfig(
    baseConfig,
    defineConfig({
        plugins: [gtkx()],
        test: {
            include: ["**/*.test.{ts,tsx}"],
        },
    }),
);
