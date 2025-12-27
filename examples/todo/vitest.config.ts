import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/**/*.test.{ts,tsx}"],
        globals: false,
        testTimeout: 30000,
    },
    esbuild: {
        jsx: "automatic",
    },
});
