import { mergeConfig } from "vitest/config";
import baseConfig from "../../vitest.config.js";

export default mergeConfig(baseConfig, {
    test: {
        pool: "forks",
        maxWorkers: 1,
        isolate: false,
        fileParallelism: false,
        sequence: {
            hooks: "list",
        },
        setupFiles: ["./tests/vitest-setup.ts"],
    },
});
