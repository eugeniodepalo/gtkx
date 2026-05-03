import { fileURLToPath } from "node:url";
import gtkx from "@gtkx/vitest";
import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "../../vitest.config.js";

const reactSrc = fileURLToPath(new URL("../react/src/index.ts", import.meta.url));

export default mergeConfig(
    baseConfig,
    defineConfig({
        plugins: [gtkx()],
        resolve: {
            alias: {
                "@gtkx/react": reactSrc,
            },
        },
        test: {
            setupFiles: ["./tests/setup.ts"],
            coverage: {
                include: ["../react/src/**/*.{ts,tsx}"],
                allowExternal: true,
            },
        },
    }),
);
