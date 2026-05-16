import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GenerationHandler } from "@ts-for-gir/cli";
import { GeneratorType } from "@ts-for-gir/generator-base";
import { toCamelCase, toPascalCase } from "../../core/utils/naming.js";
import { isClassVtable } from "../../core/utils/record-filter.js";
import type { GirRepository, LoadedGir } from "../../gir/index.js";
import { type EnumValueMap, type FieldNameMap, type GtypeStructMap, loadAndRewrite } from "./rewrite.js";

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
 * One class or interface declaration, type-erased to the members the type
 * pipeline's per-owner collectors need.
 */
type OwnerDeclaration = {
    name: string;
    signals: readonly { name: string }[];
    methods: readonly { name: string }[];
    fieldNames: readonly string[];
    virtualMethodNames: readonly string[];
};

/**
 * Builds a {@link FieldNameMap} by applying `selectNames` to every class and
 * interface of every namespace in the repository.
 *
 * @param repository - The loaded GIR repository.
 * @param selectNames - Maps one owner declaration to the names to record.
 * @returns Names keyed lowercase namespace identifier then owner name.
 */
const collectByOwner = (
    repository: GirRepository,
    selectNames: (owner: OwnerDeclaration) => Iterable<string>,
): FieldNameMap => {
    const namespaces = new Map<string, Map<string, Set<string>>>();
    for (const namespaceName of repository.getNamespaceNames()) {
        const namespace = repository.getNamespace(namespaceName);
        if (!namespace) continue;
        const owners = new Map<string, Set<string>>();
        for (const owner of [...namespace.classes.values(), ...namespace.interfaces.values()]) {
            owners.set(toPascalCase(owner.name), new Set(selectNames(owner)));
        }
        namespaces.set(namespaceName.toLowerCase(), owners);
    }
    return namespaces;
};

/**
 * Collects the camelCased instance-struct field names of every class and
 * interface per namespace.
 *
 * The type pipeline uses these to strip the field declarations ts-for-gir
 * emits into GObject class and interface bodies, which node-gtk's runtime
 * never exposes.
 *
 * @param repository - The loaded GIR repository.
 * @returns Field names keyed lowercase namespace identifier then owner name.
 */
const collectClassFieldNames = (repository: GirRepository): FieldNameMap =>
    collectByOwner(repository, (owner) => owner.fieldNames.map(toCamelCase));

/**
 * Collects the camelCased member names that ts-for-gir emits into class and
 * interface bodies but node-gtk's runtime never exposes as callable members:
 * signal action methods and interface virtual methods.
 *
 * ts-for-gir emits an action-method declaration for every signal (e.g.
 * `committed(text: string): void` for the `committed` signal) and for every
 * interface `<virtual-method>`. node-gtk's runtime exposes signals only
 * through `connect` / `emit` and enumerates only `interface_info_get_method`,
 * so neither surface is callable. A name that also names a real GIR method is
 * left intact, because that method is genuinely exposed.
 *
 * @param repository - The loaded GIR repository.
 * @returns Strippable member names keyed namespace then owner name.
 */
const collectSignalActionMethodNames = (repository: GirRepository): FieldNameMap =>
    collectByOwner(repository, (owner) => {
        const methodNames = new Set(owner.methods.map((m) => toCamelCase(m.name)));
        const candidates = [...owner.signals.map((s) => s.name), ...owner.virtualMethodNames];
        return candidates.map(toCamelCase).filter((camel) => !methodNames.has(camel));
    });

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
            collectClassFieldNames(loaded.repository),
            collectSignalActionMethodNames(loaded.repository),
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
