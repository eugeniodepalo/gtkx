import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GenerationHandler } from "@ts-for-gir/cli";
import { GeneratorType } from "@ts-for-gir/generator-base";
import { isClassVtable } from "../../core/utils/record-filter.js";
import type { GirRepository, LoadedGir } from "../../gir/index.js";
import { type EnumValueMap, type GtypeStructMap, loadAndRewrite } from "./rewrite.js";

/**
 * Builds the real enum member values for every namespace from the loaded GIR
 * repository, keyed as {@link EnumValueMap} expects.
 *
 * ts-for-gir emits enum members without initializers; supplying these GIR
 * values lets the enum rewrite reproduce the runtime's actual numbers (offset
 * enums, bitfields) instead of falling back to ordinal indices.
 *
 * @param repository - The loaded GIR repository.
 * @returns Enum member values keyed namespace → enum name → member name.
 */
const collectEnumValues = (repository: GirRepository): EnumValueMap => {
    const namespaces = new Map<string, Map<string, Map<string, number>>>();
    for (const namespaceName of repository.getNamespaceNames()) {
        const namespace = repository.getNamespace(namespaceName);
        if (!namespace) continue;
        const enumerations = new Map<string, Map<string, number>>();
        for (const enumeration of [...namespace.enumerations.values(), ...namespace.bitfields.values()]) {
            const members = new Map<string, number>();
            for (const member of enumeration.members) {
                const value = Number(member.value);
                if (Number.isFinite(value)) {
                    members.set(member.name.toUpperCase(), value);
                }
            }
            enumerations.set(enumeration.name, members);
        }
        namespaces.set(namespaceName.toLowerCase(), enumerations);
    }
    return namespaces;
};

/**
 * Collects every gtype-struct (class/interface vtable) record name per
 * namespace from the loaded GIR repository, keyed as {@link GtypeStructMap}
 * expects.
 *
 * @param repository - The loaded GIR repository.
 * @returns Gtype-struct record names keyed lowercase namespace identifier.
 */
const collectGtypeStructNames = (repository: GirRepository): GtypeStructMap => {
    const namespaces = new Map<string, Set<string>>();
    for (const namespaceName of repository.getNamespaceNames()) {
        const namespace = repository.getNamespace(namespaceName);
        if (!namespace) continue;
        const names = new Set<string>();
        for (const record of namespace.records.values()) {
            if (isClassVtable(record)) {
                names.add(record.name);
            }
        }
        namespaces.set(namespaceName.toLowerCase(), names);
    }
    return namespaces;
};

/**
 * Generates the per-namespace `.d.ts` type bindings from already-loaded GIR
 * modules and writes them under `outDir`.
 *
 * Runs ts-for-gir's `GenerationHandler` in-process against the modules in
 * {@link LoadedGir} — reusing the single GIR parse performed at load time —
 * emits the raw output into a scratch directory, applies the gtkx rewrites,
 * and writes one `<ns>/<ns>.d.ts` per namespace. The scratch directory is
 * removed regardless of success or failure.
 *
 * @param loaded - The loaded GIR data set produced by `loadGir`
 * @param outDir - Final destination for the per-namespace `.d.ts` files
 */
export async function runTypesPipeline(loaded: LoadedGir, outDir: string): Promise<TypesPipelineResult> {
    const scratchDir = await mkdtemp(join(tmpdir(), "gtkx-tsforgir-"));
    try {
        const handler = new GenerationHandler({ ...loaded.generateConfig, outdir: scratchDir }, GeneratorType.TYPES);
        await handler.start(loaded.girModules, loaded.girModulesGrouped);

        const filenames = await readdir(scratchDir);
        const rawFilesByName = new Map<string, string>();
        for (const filename of filenames) {
            if (!filename.endsWith(".d.ts")) continue;
            const contents = await readFile(join(scratchDir, filename), "utf-8");
            rawFilesByName.set(filename, contents);
        }

        const rewritten = loadAndRewrite(
            rawFilesByName,
            collectEnumValues(loaded.repository),
            collectGtypeStructNames(loaded.repository),
        );

        await mkdir(outDir, { recursive: true });
        const namespacesWritten: string[] = [];
        for (const { namespace, content } of rewritten) {
            const nsDir = join(outDir, namespace);
            await mkdir(nsDir, { recursive: true });
            await writeFile(join(nsDir, `${namespace}.d.ts`), content, "utf-8");
            namespacesWritten.push(namespace);
        }

        return { namespaces: namespacesWritten.sort() };
    } finally {
        await rm(scratchDir, { recursive: true, force: true });
    }
}

/**
 * Summary returned by {@link runTypesPipeline}.
 */
export interface TypesPipelineResult {
    /** Sorted list of namespace identifiers for which a `.d.ts` was emitted. */
    namespaces: string[];
}
