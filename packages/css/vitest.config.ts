import { mergeConfig } from "vitest/config";
import baseConfig from "../../vitest.config.js";

export default mergeConfig(baseConfig, {
    test: {
        include: ["tests/**/*.test.ts"],
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
        setupFiles: ["./tests/vitest-setup.ts"],
    },
});
