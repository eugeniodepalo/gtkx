import { fileURLToPath } from "node:url";
import gtkx from "@gtkx/vitest";
import { defineConfig, mergeConfig } from "vitest/config";
import { packageVitestConfig } from "../../vitest.shared.js";

const reactSrc = fileURLToPath(new URL("../react/src/index.ts", import.meta.url));

export default mergeConfig(
    packageVitestConfig(import.meta.url),
    defineConfig({
        plugins: [gtkx()],
        resolve: {
            alias: {
                "@gtkx/react": reactSrc,
            },
        },
        test: {
            setupFiles: ["packages/e2e/tests/setup.ts"],
            coverage: {
                include: ["packages/react/src/**/*.{ts,tsx}"],
            },
        },
    }),
);
