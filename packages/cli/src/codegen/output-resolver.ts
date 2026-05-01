import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Resolved output directories for the codegen pipeline.
 *
 * Both directories live inside the user's `node_modules`, under the installed
 * package's `dist/generated/` subtree. Codegen overwrites them on every run.
 */
export type OutputDirs = {
    /** Absolute path to `node_modules/@gtkx/ffi/dist/generated/`. Always present. */
    ffiOutputDir: string;
    /**
     * Absolute path to `node_modules/@gtkx/react/dist/generated/`, or `null`
     * if `@gtkx/react` is not a dependency of the user's project.
     */
    reactOutputDir: string | null;
};

/**
 * Resolves the absolute output directories where codegen should write
 * generated files in the user's project.
 *
 * Uses Node's module resolver anchored at the project root so that the
 * resolution mirrors what the user's runtime imports will find. In a pnpm
 * workspace this returns the per-project copy under `node_modules/.pnpm/`,
 * which is safe to mutate (each project has its own hard-linked copy).
 *
 * @param projectRoot - Absolute path to the user's project root
 * @returns Object containing absolute output directories
 * @throws If `@gtkx/ffi` is not installed in the project
 */
export const resolveOutputDirs = (projectRoot: string): OutputDirs => {
    const require = createRequire(pathToFileURL(join(projectRoot, "__gtkx_resolver__.js")).href);

    const ffiPkgPath = require.resolve("@gtkx/ffi/package.json");
    const ffiOutputDir = join(dirname(ffiPkgPath), "dist", "generated");

    let reactOutputDir: string | null = null;
    try {
        const reactPkgPath = require.resolve("@gtkx/react/package.json");
        reactOutputDir = join(dirname(reactPkgPath), "dist", "generated");
    } catch {
        reactOutputDir = null;
    }

    return { ffiOutputDir, reactOutputDir };
};
