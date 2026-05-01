import { defineConfig } from "vitest/config";

export default defineConfig({
    oxc: {
        jsx: "automatic",
    },
    test: {
        include: ["tests/**/*.test.{ts,tsx}"],
        bail: 1,
        hookTimeout: 30000,
    },
});
