import { mergeConfig } from "vitest/config";
import baseConfig from "../../vitest.config.js";

export default mergeConfig(baseConfig, {
    test: {
        include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
        typecheck: {
            tsconfig: "tsconfig.test.json",
        },
        env: {
            GTK_A11Y: "none",
        },
        pool: "forks",
        poolOptions: {
            forks: {
                singleFork: true,
            },
        },
        fileParallelism: false,
        sequence: {
            hooks: "list",
        },
        globalSetup: "./tests/setup.ts",
    },
});
