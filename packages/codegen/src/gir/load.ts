import { ModuleLoader } from "@ts-for-gir/cli";
import type { GenerateConfig, GirModule, GirModuleResolvedBy, GirModulesGrouped } from "@ts-for-gir/lib";
import { DependencyManager } from "@ts-for-gir/lib";
import { adaptNamespace } from "./internal/adapter.js";
import type { RawNamespace } from "./internal/raw-types.js";
import { GirRepository } from "./repository.js";

/**
 * A fully loaded GIR data set: the queryable {@link GirRepository} plus the
 * ts-for-gir module objects retained for the `.d.ts` type pipeline.
 *
 * Produced by {@link loadGir} from a single `ModuleLoader.getModulesResolved()`
 * pass, so every GIR file is discovered and parsed exactly once.
 */
export type LoadedGir = {
    /** The resolved, queryable GIR repository. */
    repository: GirRepository;
    /** Every loaded ts-for-gir module, in load order. */
    girModules: GirModule[];
    /** Loaded modules grouped by namespace, as `GenerationHandler` expects. */
    girModulesGrouped: GirModulesGrouped[];
    /** The ts-for-gir generation config shared by loading and type emission. */
    generateConfig: GenerateConfig;
};

/**
 * Builds the ts-for-gir generation config. Mirrors ts-for-gir's own CLI
 * defaults with the `node` environment and debug comments disabled; `outdir`
 * is left null because the type pipeline supplies a scratch directory per run.
 */
function makeGenerateConfig(girDirectories: string[]): GenerateConfig {
    return {
        environment: "node",
        girDirectories,
        root: process.cwd(),
        outdir: null,
        verbose: false,
        buildType: "lib",
        moduleType: "esm",
        noNamespace: false,
        noComments: false,
        noDebugComments: true,
        fixConflicts: true,
        generateAlias: false,
        promisify: true,
        npmScope: "@girs",
        package: false,
        packageYarn: false,
    };
}

/**
 * Throws a loud, actionable error when a requested library or one of its
 * transitive dependencies could not be resolved — `ModuleLoader` otherwise
 * only logs a warning and continues, which would silently truncate codegen.
 */
function assertAllResolved(
    libraries: string[],
    keep: GirModuleResolvedBy[],
    failed: ReadonlySet<string>,
    girPath: string[],
): void {
    const searchPaths = `[${girPath.join(", ")}]`;
    const resolved = new Set(keep.map((entry) => entry.packageName));

    for (const library of libraries) {
        if (!resolved.has(library)) {
            throw new Error(
                `Library "${library}" was requested for code generation but its GIR file ${library}.gir was not found in ${searchPaths}. Install the package that provides it, or adjust the \`libraries\` setting in gtkx.config.ts.`,
            );
        }
    }

    const [firstFailed] = failed;
    if (firstFailed !== undefined) {
        throw new Error(
            `GIR file not found for "${firstFailed}" in paths: ${searchPaths}. It is a transitive dependency of a requested library.`,
        );
    }
}

/**
 * Discovers, parses, and resolves the given GIR libraries and all their
 * transitive dependencies via ts-for-gir's `ModuleLoader`, then builds a
 * queryable {@link GirRepository} from the result.
 *
 * The loaded ts-for-gir modules are returned alongside the repository so the
 * `.d.ts` type pipeline can reuse them without re-parsing any GIR file.
 *
 * @param libraries - GIR namespace identifiers to generate (e.g. `"Gtk-4.0"`)
 * @param girPath - Directories to search for `.gir` files
 * @returns The repository and the retained ts-for-gir module data
 * @throws When a requested library or transitive dependency cannot be found
 */
export async function loadGir(libraries: string[], girPath: string[]): Promise<LoadedGir> {
    DependencyManager.instances = {};

    const generateConfig = makeGenerateConfig(girPath);
    const moduleLoader = new ModuleLoader(generateConfig);
    const { keep, grouped, failed } = await moduleLoader.getModulesResolved(libraries, [], true);

    assertAllResolved(libraries, keep, failed, girPath);

    const girModules = keep.map((entry) => entry.module);
    const rawNamespaces = new Map<string, RawNamespace>();
    for (const module of girModules) {
        const raw = adaptNamespace(module.ns);
        rawNamespaces.set(raw.name, raw);
    }

    return {
        repository: GirRepository.fromRawNamespaces(rawNamespaces),
        girModules,
        girModulesGrouped: Object.values(grouped),
        generateConfig,
    };
}
