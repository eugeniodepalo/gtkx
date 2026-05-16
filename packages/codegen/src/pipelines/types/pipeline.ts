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
 * Collects the camelCased instance-struct field names of every class and
 * interface per namespace, keyed as {@link FieldNameMap} expects.
 *
 * The type pipeline uses these to strip the field declarations ts-for-gir
 * emits into GObject class and interface bodies, which node-gtk's runtime
 * never exposes.
 *
 * @param repository - The loaded GIR repository.
 * @returns Field names keyed lowercase namespace identifier then owner name.
 */
const collectClassFieldNames = (repository: GirRepository): FieldNameMap => {
    const namespaces = new Map<string, Map<string, Set<string>>>();
    for (const namespaceName of repository.getNamespaceNames()) {
        const namespace = repository.getNamespace(namespaceName);
        if (!namespace) continue;
        const owners = new Map<string, Set<string>>();
        for (const cls of namespace.classes.values()) {
            owners.set(toPascalCase(cls.name), new Set(cls.fieldNames.map(toCamelCase)));
        }
        for (const iface of namespace.interfaces.values()) {
            owners.set(toPascalCase(iface.name), new Set(iface.fieldNames.map(toCamelCase)));
        }
        namespaces.set(namespaceName.toLowerCase(), owners);
    }
    return namespaces;
};

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
const collectSignalActionMethodNames = (repository: GirRepository): FieldNameMap => {
    const namespaces = new Map<string, Map<string, Set<string>>>();
    for (const namespaceName of repository.getNamespaceNames()) {
        const namespace = repository.getNamespace(namespaceName);
        if (!namespace) continue;
        const owners = new Map<string, Set<string>>();
        const collect = (
            name: string,
            signals: readonly { name: string }[],
            virtualMethodNames: readonly string[],
            methods: readonly { name: string }[],
        ) => {
            const methodNames = new Set(methods.map((m) => toCamelCase(m.name)));
            const names = new Set<string>();
            for (const candidate of [...signals.map((s) => s.name), ...virtualMethodNames]) {
                const camel = toCamelCase(candidate);
                if (!methodNames.has(camel)) names.add(camel);
            }
            owners.set(toPascalCase(name), names);
        };
        for (const cls of namespace.classes.values()) {
            collect(cls.name, cls.signals, cls.virtualMethodNames, cls.methods);
        }
        for (const iface of namespace.interfaces.values()) {
            collect(iface.name, iface.signals, iface.virtualMethodNames, iface.methods);
        }
        namespaces.set(namespaceName.toLowerCase(), owners);
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
