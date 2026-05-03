import { basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Shared per-package Vitest configuration.
 *
 * Roots Vitest at the monorepo so lcov SF paths emerge as
 * `packages/<name>/src/...` rather than `src/...`. That avoids cross-package
 * path collisions (e.g. `src/cli.ts` exists in `mcp/` and `codegen/`) which
 * SonarCloud cannot resolve unambiguously.
 *
 * @param configFileUrl - Pass `import.meta.url` from the package's `vitest.config.ts`.
 */
export const packageVitestConfig = (configFileUrl: string) => {
    const packageDir = dirname(fileURLToPath(configFileUrl));
    const packageName = basename(packageDir);

    return defineConfig({
        oxc: { jsx: "automatic" },
        test: {
            root: "../..",
            include: [`packages/${packageName}/tests/**/*.test.{ts,tsx}`],
            bail: 1,
            hookTimeout: 30000,
            coverage: {
                provider: "v8",
                reporter: ["lcov", "text-summary"],
                reportsDirectory: `packages/${packageName}/coverage`,
                include: [`packages/${packageName}/src/**/*.{ts,tsx}`],
                exclude: ["**/generated/**", "**/dist/**", "**/out-tsc/**", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
            },
        },
    });
};
