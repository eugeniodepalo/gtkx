import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GenerationHandler } from "@ts-for-gir/cli";
import { GeneratorType } from "@ts-for-gir/generator-base";
import { FfiMapper } from "../../core/type-system/ffi-mapper.js";
import { type AsyncCapableCallable, collectAsyncCallablePairs } from "../../core/utils/async-callable.js";
import { collectParentMethodNames } from "../../core/utils/class-traversal.js";
import { generateConflictingMethodName, toCamelCase, toPascalCase } from "../../core/utils/naming.js";
import { isClassVtable } from "../../core/utils/record-filter.js";
import type { GirRepository, LoadedGir } from "../../gir/index.js";
import type { GirMethod } from "../../gir/model/callables.js";
import type { GirType } from "../../gir/model/type.js";
import {
    type AsyncMemberEntry,
    type AsyncMemberMap,
    type ConnectRenameMap,
    type EnumValueMap,
    type ErrorDomainMap,
    type FieldNameMap,
    type GtypeStructMap,
    type HashTableMemberEntry,
    type HashTableMemberMap,
    loadAndRewrite,
    type MethodShadowRename,
    type MethodShadowRenameMap,
    type NamespaceAsyncMembers,
    type NamespaceHashTableMembers,
} from "./rewrite.js";

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
 * Collects every `GError` error-domain enum name per namespace from the loaded
 * GIR repository, keyed as {@link ErrorDomainMap} expects.
 *
 * The type pipeline rewrites these enums with an `instanceof`-capable
 * `[Symbol.hasInstance]` member so callers can discriminate thrown errors.
 *
 * @param repository - The loaded GIR repository.
 * @returns Error-domain enum names keyed lowercase namespace identifier.
 */
const collectErrorDomainNames = (repository: GirRepository): ErrorDomainMap => {
    const namespaces = new Map<string, Set<string>>();
    for (const namespaceName of repository.getNamespaceNames()) {
        const namespace = repository.getNamespace(namespaceName);
        if (!namespace) continue;
        const names = new Set<string>();
        for (const enumeration of namespace.enumerations.values()) {
            if (enumeration.glibErrorDomain) names.add(enumeration.name);
        }
        namespaces.set(namespaceName.toLowerCase(), names);
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
 * Collects the camelCased instance-struct field names that ts-for-gir emits
 * into each class and interface body.
 *
 * A class body carries only its own `<field>` elements; ancestors are reached
 * through `extends`. An interface body is flattened by ts-for-gir, so it also
 * carries every field of its transitive prerequisite classes and interfaces.
 * The type pipeline uses these to strip the field declarations, which
 * node-gtk's runtime never exposes.
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
            const names = new Set(iface.fieldNames.map(toCamelCase));
            for (const prereq of collectPrerequisiteFieldNames(repository, iface.prerequisites)) {
                names.add(prereq);
            }
            owners.set(toPascalCase(iface.name), names);
        }
        namespaces.set(namespaceName.toLowerCase(), owners);
    }
    return namespaces;
};

/**
 * Collects the camelCased field names of every transitive prerequisite class
 * and interface reachable from the given prerequisite qualified names.
 */
const collectPrerequisiteFieldNames = (repository: GirRepository, prerequisites: readonly string[]): Set<string> => {
    const names = new Set<string>();
    const visited = new Set<string>();
    const visit = (qualifiedName: string) => {
        if (visited.has(qualifiedName)) return;
        visited.add(qualifiedName);
        const cls = repository.resolveClass(qualifiedName);
        if (cls) {
            for (const ancestorName of cls.getInheritanceChain()) {
                const ancestor = repository.resolveClass(ancestorName);
                if (!ancestor) continue;
                for (const field of ancestor.fieldNames) names.add(toCamelCase(field));
            }
            return;
        }
        const iface = repository.resolveInterface(qualifiedName);
        if (!iface) return;
        for (const field of iface.fieldNames) names.add(toCamelCase(field));
        for (const prereq of iface.prerequisites) visit(prereq);
    };
    for (const prereq of prerequisites) visit(prereq);
    return names;
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
const collectSignalActionMethodNames = (repository: GirRepository): FieldNameMap =>
    collectByOwner(repository, (owner) => {
        const methodNames = new Set(owner.methods.map((m) => toCamelCase(m.name)));
        const candidates = [...owner.signals.map((s) => s.name), ...owner.virtualMethodNames];
        return candidates.map(toCamelCase).filter((camel) => !methodNames.has(camel));
    });

/**
 * Collects, per namespace, the names of `<constant>` elements whose GIR value
 * is numeric and whose declared type is not a string.
 *
 * The gtkx runtime emits these as numeric literals, but ts-for-gir may type
 * them after an opaque GIR type. The type pipeline relaxes those declarations
 * to `number` so the runtime value satisfies the contract.
 *
 * @param repository - The loaded GIR repository.
 * @returns Numeric constant names keyed lowercase namespace identifier.
 */
const collectNumericConstantNames = (repository: GirRepository): FieldNameMap => {
    const namespaces = new Map<string, Map<string, Set<string>>>();
    for (const namespaceName of repository.getNamespaceNames()) {
        const namespace = repository.getNamespace(namespaceName);
        if (!namespace) continue;
        const names = new Set<string>();
        for (const constant of namespace.constants.values()) {
            const typeName = String(constant.type.name);
            if (typeName === "utf8" || typeName === "filename") continue;
            if (!Number.isNaN(Number(constant.value))) names.add(constant.name);
        }
        namespaces.set(namespaceName.toLowerCase(), new Map([["", names]]));
    }
    return namespaces;
};

const connectRenameFor = (ownerName: string): string => {
    const prefix = toCamelCase(ownerName);
    return `${prefix.charAt(0).toLowerCase()}${prefix.slice(1)}Connect`;
};

/**
 * Counts the parameters a method contributes to its declared signature: every
 * non-`out` GIR parameter, matching the surface ts-for-gir emits once `out`
 * parameters have been folded into the return tuple.
 *
 * @param method - The GIR method.
 * @returns The declared parameter count.
 */
const declaredParameterCount = (method: GirMethod): number =>
    method.parameters.filter((parameter) => parameter.direction !== "out").length;

/**
 * Collects, for every class, the methods the gtkx codegen renamed because
 * their name collides with a method inherited from an ancestor class or
 * interface.
 *
 * The runtime exposes such a method under an owner-prefixed name; the contract
 * rewrite renames the matching overload to agree. The GObject `connect` method
 * is excluded — its signal collision is resolved separately.
 *
 * @param repository - The loaded GIR repository.
 * @returns Method shadow-renames keyed namespace then owner name.
 */
const collectMethodShadowRenames = (repository: GirRepository): MethodShadowRenameMap => {
    const namespaces = new Map<string, Map<string, MethodShadowRename[]>>();
    for (const namespaceName of repository.getNamespaceNames()) {
        const namespace = repository.getNamespace(namespaceName);
        if (!namespace) continue;
        const owners = new Map<string, MethodShadowRename[]>();
        for (const cls of namespace.classes.values()) {
            const parentMethodNames = collectParentMethodNames(cls, repository);
            const renames: MethodShadowRename[] = [];
            for (const method of cls.methods) {
                if (method.name === "connect" || !parentMethodNames.has(method.name)) continue;
                renames.push({
                    original: toCamelCase(method.name),
                    renamed: generateConflictingMethodName(cls.name, method.name),
                    arity: declaredParameterCount(method),
                });
            }
            if (renames.length > 0) {
                owners.set(toPascalCase(cls.name), renames);
            }
        }
        namespaces.set(namespaceName.toLowerCase(), owners);
    }
    return namespaces;
};

/**
 * Collects, for every class and interface, the runtime name of a `connect`
 * GIR `<method>` that the gtkx codegen renamed away from its collision with
 * the GObject `connect` signal.
 *
 * ts-for-gir flattens an inherited `connect` method into each subclass body,
 * so the rename is keyed by the type that ultimately exposes the method and
 * resolved against the ancestor that declares it.
 *
 * @param repository - The loaded GIR repository.
 * @returns Renamed `connect` names keyed namespace then owner name.
 */
const collectConnectMethodRenames = (repository: GirRepository): ConnectRenameMap => {
    const namespaces = new Map<string, Map<string, string>>();
    for (const namespaceName of repository.getNamespaceNames()) {
        const namespace = repository.getNamespace(namespaceName);
        if (!namespace) continue;
        const renames = new Map<string, string>();
        for (const cls of namespace.classes.values()) {
            let current: ReturnType<typeof cls.getParent> | typeof cls = cls;
            while (current) {
                if (current.methods.some((m) => m.name === "connect")) {
                    renames.set(toPascalCase(cls.name), connectRenameFor(current.name));
                    break;
                }
                current = current.getParent();
            }
        }
        for (const iface of namespace.interfaces.values()) {
            if (iface.methods.some((m) => m.name === "connect")) {
                renames.set(toPascalCase(iface.name), connectRenameFor(iface.name));
            }
        }
        namespaces.set(namespaceName.toLowerCase(), renames);
    }
    return namespaces;
};

/**
 * Builds the {@link AsyncMemberEntry} list for one set of async callables and
 * their finish-candidate pool, naming each member as the camelCased contract
 * member that declares it.
 */
const buildAsyncEntries = <C extends AsyncCapableCallable, F extends AsyncCapableCallable>(
    callables: readonly C[],
    finishCandidates: readonly F[],
): AsyncMemberEntry[] => {
    const pairs = collectAsyncCallablePairs(callables, finishCandidates);
    const entries: AsyncMemberEntry[] = [];
    for (const { async: asyncCallable, finish } of pairs.values()) {
        entries.push({
            asyncMember: toCamelCase(asyncCallable.name),
            finishMember: toCamelCase(finish.name),
        });
    }
    return entries;
};

/**
 * Collects the camelCased flattened methods of an interface — its own methods
 * plus those of every transitive prerequisite interface — matching the surface
 * ts-for-gir emits into the interface's contract `class` body.
 */
const collectInterfaceFlattenedMethods = (repository: GirRepository, ifaceQualifiedName: string): GirMethod[] => {
    const methods: GirMethod[] = [];
    const seen = new Set<string>();
    const visited = new Set<string>();
    const visit = (qualifiedName: string): void => {
        if (visited.has(qualifiedName)) return;
        visited.add(qualifiedName);
        const iface = repository.resolveInterface(qualifiedName);
        if (!iface) return;
        for (const method of iface.methods) {
            if (seen.has(method.name)) continue;
            seen.add(method.name);
            methods.push(method);
        }
        for (const prereq of iface.prerequisites) visit(prereq);
    };
    visit(ifaceQualifiedName);
    return methods;
};

/**
 * Collects every GIO-style async callable per namespace, keyed by the owner
 * type name (the empty string keys namespace-level standalone functions).
 *
 * Each async callable is paired with its companion `*_finish` callable so the
 * type pipeline can retype the async declaration to `Promise<R>` in step with
 * the Promise-returning runtime wrapper.
 *
 * @param repository - The loaded GIR repository.
 * @returns Async callable entries keyed namespace then owner name.
 */
const collectAsyncMembers = (repository: GirRepository): AsyncMemberMap => {
    const namespaces = new Map<string, NamespaceAsyncMembers>();
    for (const namespaceName of repository.getNamespaceNames()) {
        const namespace = repository.getNamespace(namespaceName);
        if (!namespace) continue;
        const owners = new Map<string, AsyncMemberEntry[]>();

        const record = (owner: string, entries: AsyncMemberEntry[]): void => {
            if (entries.length === 0) return;
            const existing = owners.get(owner);
            if (existing) existing.push(...entries);
            else owners.set(owner, entries);
        };

        for (const cls of namespace.classes.values()) {
            record(toPascalCase(cls.name), buildAsyncEntries(cls.methods, cls.methods));
            record(toPascalCase(cls.name), buildAsyncEntries(cls.staticFunctions, cls.staticFunctions));
        }
        for (const iface of namespace.interfaces.values()) {
            const flattened = collectInterfaceFlattenedMethods(repository, iface.qualifiedName);
            record(toPascalCase(iface.name), buildAsyncEntries(flattened, flattened));
            record(toPascalCase(iface.name), buildAsyncEntries(iface.staticFunctions, iface.staticFunctions));
        }
        for (const rec of namespace.records.values()) {
            record(toPascalCase(rec.name), buildAsyncEntries(rec.methods, rec.methods));
            record(toPascalCase(rec.name), buildAsyncEntries(rec.staticFunctions, rec.staticFunctions));
        }
        record("", buildAsyncEntries([...namespace.functions.values()], [...namespace.functions.values()]));

        namespaces.set(namespaceName.toLowerCase(), owners);
    }
    return namespaces;
};

/**
 * Reports whether a type is a keyed `GHashTable` — a `GLib.HashTable` carrying
 * a concrete key and value type other than the opaque `gpointer`.
 *
 * The opaque `GLib.HashTable` API models its tables as `gpointer`-to-`gpointer`
 * and is left as the bare handle type; only keyed tables marshal to a `Map`.
 */
const isKeyedHashTable = (type: GirType): boolean => {
    if (!type.isHashTable()) return false;
    const keyType = type.getKeyType();
    const valueType = type.getValueType();
    return keyType !== null && keyType.name !== "gpointer" && valueType !== null && valueType.name !== "gpointer";
};

/**
 * Builds the {@link HashTableMemberEntry} for a callable carrying a keyed
 * `GHashTable` parameter or return, or `null` when it carries none.
 *
 * The `Map<K, V>` substitution type is derived from the keyed table — a
 * parameter table or, failing that, the return table — through the FFI mapper,
 * so it matches the namespace-relative form ts-for-gir emits in the contract.
 */
const buildHashTableEntry = (
    callable: AsyncCapableCallable,
    member: string,
    isFunction: boolean,
    mapper: FfiMapper,
): HashTableMemberEntry | null => {
    const parameterTable = callable.parameters.find((parameter) => isKeyedHashTable(parameter.type));
    if (parameterTable !== undefined) {
        return { member, isFunction, mapType: mapper.mapType(parameterTable.type).ts };
    }
    if (isKeyedHashTable(callable.returnType)) {
        return { member, isFunction, mapType: mapper.mapType(callable.returnType, true).ts };
    }
    return null;
};

/**
 * Collects every contract member carrying a keyed `GHashTable` parameter or
 * return, per namespace, keyed by the owner type name (the empty string keys
 * namespace-level standalone functions).
 *
 * Each entry pairs the contract member name with the `Map<K, V>` type the gtkx
 * runtime marshals the table to, so the type pipeline can retype the bare
 * `GLib.HashTable` the ts-for-gir output emits.
 *
 * @param repository - The loaded GIR repository.
 * @returns Keyed-`GHashTable` member entries keyed namespace then owner name.
 */
const collectHashTableMembers = (repository: GirRepository): HashTableMemberMap => {
    const namespaces = new Map<string, NamespaceHashTableMembers>();
    for (const namespaceName of repository.getNamespaceNames()) {
        const namespace = repository.getNamespace(namespaceName);
        if (!namespace) continue;
        const mapper = new FfiMapper(repository, namespaceName);
        const owners = new Map<string, HashTableMemberEntry[]>();

        const record = (owner: string, entry: HashTableMemberEntry | null): void => {
            if (entry === null) return;
            const existing = owners.get(owner);
            if (existing) existing.push(entry);
            else owners.set(owner, [entry]);
        };

        for (const cls of namespace.classes.values()) {
            const owner = toPascalCase(cls.name);
            for (const method of cls.methods) {
                record(owner, buildHashTableEntry(method, toCamelCase(method.name), false, mapper));
            }
            for (const fn of cls.staticFunctions) {
                record(owner, buildHashTableEntry(fn, toCamelCase(fn.name), false, mapper));
            }
        }
        for (const iface of namespace.interfaces.values()) {
            const owner = toPascalCase(iface.name);
            for (const method of collectInterfaceFlattenedMethods(repository, iface.qualifiedName)) {
                record(owner, buildHashTableEntry(method, toCamelCase(method.name), false, mapper));
            }
            for (const fn of iface.staticFunctions) {
                record(owner, buildHashTableEntry(fn, toCamelCase(fn.name), false, mapper));
            }
        }
        for (const rec of namespace.records.values()) {
            const owner = toPascalCase(rec.name);
            for (const method of rec.methods) {
                record(owner, buildHashTableEntry(method, toCamelCase(method.name), false, mapper));
            }
            for (const fn of rec.staticFunctions) {
                record(owner, buildHashTableEntry(fn, toCamelCase(fn.name), false, mapper));
            }
        }
        for (const fn of namespace.functions.values()) {
            record("", buildHashTableEntry(fn, toCamelCase(fn.name), true, mapper));
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
            collectConnectMethodRenames(loaded.repository),
            collectNumericConstantNames(loaded.repository),
            collectAsyncMembers(loaded.repository),
            collectMethodShadowRenames(loaded.repository),
            collectHashTableMembers(loaded.repository),
            collectErrorDomainNames(loaded.repository),
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
