import { existsSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Resolved output directories for the codegen pipeline.
 *
 * For an installed dependency the generated files live under the package's
 * compiled `dist/generated/` subtree; for a workspace-linked package (the
 * gtkx monorepo itself) they live under `src/generated/`, where the package's
 * own `tsc` build expects them. Codegen overwrites them on every run.
 */
export type OutputDirs = {
    /** Absolute path to `@gtkx/ffi`'s `generated/` directory. Always present. */
    ffiOutputDir: string;
    /**
     * Absolute path to `@gtkx/react`'s `generated/` directory, or `null` if
     * `@gtkx/react` cannot be located from the project.
     */
    reactOutputDir: string | null;
};

/**
 * Locates the directory of `packageName` — either as a resolvable dependency
 * of the project, or, when that fails, as a workspace package under the
 * project's `packages/<name>/` directory (the gtkx monorepo layout).
 */
const resolvePackageDir = (require: NodeJS.Require, projectRoot: string, packageName: string): string | null => {
    try {
        return dirname(realpathSync(require.resolve(`${packageName}/package.json`)));
    } catch {
        const unscopedName = packageName.replace(/^@[^/]+\//, "");
        const workspaceDir = join(projectRoot, "packages", unscopedName);
        return existsSync(join(workspaceDir, "package.json")) ? realpathSync(workspaceDir) : null;
    }
};

/**
 * Resolves the `generated/` directory of `packageName`, choosing `src/` when
 * the package is workspace-linked (its real path is outside the project's
 * `node_modules`) and `dist/` when it is an installed dependency.
 */
const resolveGeneratedDir = (require: NodeJS.Require, projectRoot: string, packageName: string): string | null => {
    const packageDir = resolvePackageDir(require, projectRoot, packageName);
    if (packageDir === null) {
        return null;
    }
    const projectNodeModules = resolve(projectRoot, "node_modules");
    const isWorkspaceLinked = !packageDir.startsWith(`${projectNodeModules}/`);
    const subtree = isWorkspaceLinked ? "src" : "dist";
    return join(packageDir, subtree, "generated");
};

/**
 * Resolves the absolute output directories where codegen should write
 * generated files.
 *
 * @param projectRoot - Absolute path to the project root
 * @returns Object containing absolute output directories
 * @throws If `@gtkx/ffi` cannot be located from the project
 */
export const resolveOutputDirs = (projectRoot: string): OutputDirs => {
    const require = createRequire(pathToFileURL(join(projectRoot, "__gtkx_resolver__.js")).href);

    const ffiOutputDir = resolveGeneratedDir(require, projectRoot, "@gtkx/ffi");
    if (ffiOutputDir === null) {
        throw new Error("Cannot resolve @gtkx/ffi from the project; is it installed?");
    }

    return {
        ffiOutputDir,
        reactOutputDir: resolveGeneratedDir(require, projectRoot, "@gtkx/react"),
    };
};
