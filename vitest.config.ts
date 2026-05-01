import { defineConfig } from "vitest/config";

export default defineConfig({
    oxc: {
        jsx: "automatic",
    },
    test: {
        include: ["tests/**/*.test.{ts,tsx}"],
        bail: 1,
        hookTimeout: 30000,
        coverage: {
            provider: "v8",
            reporter: ["lcov", "text-summary"],
            reportsDirectory: "coverage",
            include: ["src/**/*.{ts,tsx}"],
            exclude: ["**/generated/**", "**/dist/**", "**/out-tsc/**", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
        },
    },
});
