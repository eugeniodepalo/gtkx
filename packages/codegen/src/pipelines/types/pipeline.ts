import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GenerationHandler } from "@ts-for-gir/cli";
import { GeneratorType } from "@ts-for-gir/generator-base";
import type { GirNamespace, GirRepository, LoadedGir } from "../../gir/index.js";
import type { GirMethod } from "../../gir/model/callables.js";
import type { GirType } from "../../gir/model/type.js";
import { FfiMapper } from "../../type-system/ffi-mapper.js";
import {
    type AsyncCapableCallable,
    collectAsyncCallablePairs,
    findAsyncReadyCallbackParameter,
    resolveFinishCallableName,
} from "../../utils/async-callable.js";
import { collectParentMethodNames } from "../../utils/class-traversal.js";
import { generateConflictingMethodName, toCamelCase, toPascalCase } from "../../utils/naming.js";
import { isClassVtable } from "../../utils/record-filter.js";
import {
    type AsyncMemberEntry,
    type AsyncMemberMap,
    type BitfieldMap,
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
export const collectEnumValues = (repository: GirRepository): EnumValueMap =>
    collectByNamespace(repository, (namespace) => {
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
        return enumerations;
    });

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
export const collectErrorDomainNames = (repository: GirRepository): ErrorDomainMap =>
    collectByNamespace(repository, (namespace) => {
        const names = new Set<string>();
        for (const enumeration of namespace.enumerations.values()) {
            if (enumeration.glibErrorDomain) names.add(enumeration.name);
        }
        return names;
    });

/**
 * Collects every `<bitfield>` enum name per namespace from the loaded GIR
 * repository, keyed as {@link BitfieldMap} expects.
 *
 * The type pipeline widens these enums' type alias to `number` so a value may
 * be any `OR` combination of the flags, including the empty (zero) set.
 *
 * @param repository - The loaded GIR repository.
 * @returns Bitfield enum names keyed lowercase namespace identifier.
 */
export const collectBitfieldNames = (repository: GirRepository): BitfieldMap =>
    collectByNamespace(repository, (namespace) => {
        const names = new Set<string>();
        for (const bitfield of namespace.bitfields.values()) {
            names.add(bitfield.name);
        }
        return names;
    });

/**
 * Collects every gtype-struct (class/interface vtable) record name per
 * namespace from the loaded GIR repository, keyed as {@link GtypeStructMap}
 * expects.
 *
 * @param repository - The loaded GIR repository.
 * @returns Gtype-struct record names keyed lowercase namespace identifier.
 */
export const collectGtypeStructNames = (repository: GirRepository): GtypeStructMap =>
    collectByNamespace(repository, (namespace) => {
        const names = new Set<string>();
        for (const record of namespace.records.values()) {
            if (isClassVtable(record)) {
                names.add(record.name);
            }
        }
        return names;
    });

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
 * Applies `build` to every namespace in the repository, keying the result by
 * the lowercase namespace identifier.
 *
 * Centralizes the per-namespace iteration scaffold the type pipeline's
 * collectors share.
 *
 * @param repository - The loaded GIR repository.
 * @param build - Maps one namespace to the value to record for it.
 * @returns Values keyed lowercase namespace identifier.
 */
export const collectByNamespace = <V>(
    repository: GirRepository,
    build: (namespace: GirNamespace) => V,
): Map<string, V> => {
    const namespaces = new Map<string, V>();
    for (const namespaceName of repository.getNamespaceNames()) {
        const namespace = repository.getNamespace(namespaceName);
        if (!namespace) continue;
        namespaces.set(namespaceName.toLowerCase(), build(namespace));
    }
    return namespaces;
};

/**
 * Builds a {@link FieldNameMap} by applying `selectNames` to every class and
 * interface of every namespace in the repository.
 *
 * @param repository - The loaded GIR repository.
 * @param selectNames - Maps one owner declaration to the names to record.
 * @returns Names keyed lowercase namespace identifier then owner name.
 */
export const collectByOwner = (
    repository: GirRepository,
    selectNames: (owner: OwnerDeclaration) => Iterable<string>,
): FieldNameMap =>
    collectByNamespace(repository, (namespace) => {
        const owners = new Map<string, Set<string>>();
        for (const owner of [...namespace.classes.values(), ...namespace.interfaces.values()]) {
            owners.set(toPascalCase(owner.name), new Set(selectNames(owner)));
        }
        return owners;
    });

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
 * A field name that also names a GObject `<property>` of the same owner is
 * left out of the strip set: ts-for-gir collapses such a field and property
 * into a single member, which is the genuine, runtime-exposed property — not
 * a layout-only struct field — and stripping it by name would remove the
 * property the contract must keep.
 *
 * @param repository - The loaded GIR repository.
 * @returns Field names keyed lowercase namespace identifier then owner name.
 */
export const collectClassFieldNames = (repository: GirRepository): FieldNameMap => {
    const namespaces = new Map<string, Map<string, Set<string>>>();
    for (const namespaceName of repository.getNamespaceNames()) {
        const namespace = repository.getNamespace(namespaceName);
        if (!namespace) continue;
        const owners = new Map<string, Set<string>>();
        for (const cls of namespace.classes.values()) {
            const propertyNames = new Set(cls.properties.map((property) => toCamelCase(property.name)));
            const fieldNames = cls.fieldNames.map(toCamelCase).filter((name) => !propertyNames.has(name));
            owners.set(toPascalCase(cls.name), new Set(fieldNames));
        }
        for (const iface of namespace.interfaces.values()) {
            const propertyNames = new Set(iface.properties.map((property) => toCamelCase(property.name)));
            const names = new Set(iface.fieldNames.map(toCamelCase).filter((name) => !propertyNames.has(name)));
            for (const prereq of collectPrerequisiteFieldNames(repository, iface.prerequisites)) {
                if (!propertyNames.has(prereq)) names.add(prereq);
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
export const collectPrerequisiteFieldNames = (
    repository: GirRepository,
    prerequisites: readonly string[],
): Set<string> => {
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
export const collectSignalActionMethodNames = (repository: GirRepository): FieldNameMap =>
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
export const collectNumericConstantNames = (repository: GirRepository): FieldNameMap =>
    collectByNamespace(repository, (namespace) => {
        const names = new Set<string>();
        for (const constant of namespace.constants.values()) {
            const typeName = String(constant.type.name);
            if (typeName === "utf8" || typeName === "filename") continue;
            if (!Number.isNaN(Number(constant.value))) names.add(constant.name);
        }
        return new Map([["", names]]);
    });

export const connectRenameFor = (ownerName: string): string => {
    const prefix = toCamelCase(ownerName);
    return `${prefix.charAt(0).toLowerCase()}${prefix.slice(1)}Connect`;
};

/**
 * Counts the parameters a method contributes to its declared signature.
 *
 * Every non-`out` GIR parameter is counted, matching the surface ts-for-gir
 * emits once `out` parameters have been folded into the return tuple. For a
 * GIO-style async method the trailing `GAsyncReadyCallback` and its companion
 * user-data parameter are excluded as well, matching the Promise-returning
 * wrapper the runtime — and the contract — emit in the callback's place.
 *
 * @param method - The GIR method.
 * @returns The declared parameter count.
 */
export const declaredParameterCount = (method: GirMethod): number => {
    const callbackParameter = findAsyncReadyCallbackParameter(method);
    const excludedIndices = new Set<number>();
    if (callbackParameter !== null && resolveFinishCallableName(method) !== null) {
        excludedIndices.add(method.parameters.indexOf(callbackParameter));
        if (callbackParameter.closure !== undefined) {
            excludedIndices.add(callbackParameter.closure);
        }
    }
    return method.parameters.filter((parameter, index) => parameter.direction !== "out" && !excludedIndices.has(index))
        .length;
};

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
export const collectMethodShadowRenames = (repository: GirRepository): MethodShadowRenameMap => {
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
type GirClassLike = NonNullable<ReturnType<GirRepository["resolveClass"]>>;

/**
 * Finds the ancestor (the class itself or a forebear) that declares a
 * `connect` GIR `<method>`, or `null` when no class in the chain declares one.
 */
export const findConnectMethodDeclarer = (cls: GirClassLike): GirClassLike | null => {
    let current: GirClassLike | null = cls;
    while (current) {
        if (current.methods.some((m) => m.name === "connect")) return current;
        current = current.getParent();
    }
    return null;
};

export const collectConnectMethodRenames = (repository: GirRepository): ConnectRenameMap => {
    const namespaces = new Map<string, Map<string, string>>();
    for (const namespaceName of repository.getNamespaceNames()) {
        const namespace = repository.getNamespace(namespaceName);
        if (!namespace) continue;
        const renames = new Map<string, string>();
        for (const cls of namespace.classes.values()) {
            const declarer = findConnectMethodDeclarer(cls);
            if (declarer) {
                renames.set(toPascalCase(cls.name), connectRenameFor(declarer.name));
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
export const buildAsyncEntries = <C extends AsyncCapableCallable, F extends AsyncCapableCallable>(
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
export const collectInterfaceFlattenedMethods = (
    repository: GirRepository,
    ifaceQualifiedName: string,
): GirMethod[] => {
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
export const collectAsyncMembers = (repository: GirRepository): AsyncMemberMap => {
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
export const isKeyedHashTable = (type: GirType): boolean => {
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
export const buildHashTableEntry = (
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
/**
 * Records a {@link HashTableMemberEntry} under an owner, allocating the
 * owner's entry list on first use and dropping `null` (no keyed table) entries.
 */
const recordHashTableEntry = (
    owners: Map<string, HashTableMemberEntry[]>,
    owner: string,
    entry: HashTableMemberEntry | null,
): void => {
    if (entry === null) return;
    const existing = owners.get(owner);
    if (existing) existing.push(entry);
    else owners.set(owner, [entry]);
};

/**
 * Records every keyed-`GHashTable` entry an owner's callables contribute,
 * mapping each callable through {@link buildHashTableEntry}.
 */
const recordOwnerHashTableEntries = (
    owners: Map<string, HashTableMemberEntry[]>,
    owner: string,
    callables: readonly AsyncCapableCallable[],
    isFunction: boolean,
    mapper: FfiMapper,
): void => {
    for (const callable of callables) {
        recordHashTableEntry(
            owners,
            owner,
            buildHashTableEntry(callable, toCamelCase(callable.name), isFunction, mapper),
        );
    }
};

export const collectHashTableMembers = (repository: GirRepository): HashTableMemberMap => {
    const namespaces = new Map<string, NamespaceHashTableMembers>();
    for (const namespaceName of repository.getNamespaceNames()) {
        const namespace = repository.getNamespace(namespaceName);
        if (!namespace) continue;
        const mapper = new FfiMapper(repository, namespaceName);
        const owners = new Map<string, HashTableMemberEntry[]>();

        for (const cls of namespace.classes.values()) {
            const owner = toPascalCase(cls.name);
            recordOwnerHashTableEntries(owners, owner, cls.methods, false, mapper);
            recordOwnerHashTableEntries(owners, owner, cls.staticFunctions, false, mapper);
        }
        for (const iface of namespace.interfaces.values()) {
            const owner = toPascalCase(iface.name);
            const flattened = collectInterfaceFlattenedMethods(repository, iface.qualifiedName);
            recordOwnerHashTableEntries(owners, owner, flattened, false, mapper);
            recordOwnerHashTableEntries(owners, owner, iface.staticFunctions, false, mapper);
        }
        for (const rec of namespace.records.values()) {
            const owner = toPascalCase(rec.name);
            recordOwnerHashTableEntries(owners, owner, rec.methods, false, mapper);
            recordOwnerHashTableEntries(owners, owner, rec.staticFunctions, false, mapper);
        }
        recordOwnerHashTableEntries(owners, "", [...namespace.functions.values()], true, mapper);

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

        const rewritten = loadAndRewrite(rawFilesByName, {
            enumValues: collectEnumValues(loaded.repository),
            gtypeStructNames: collectGtypeStructNames(loaded.repository),
            classFieldNames: collectClassFieldNames(loaded.repository),
            signalActionMethodNames: collectSignalActionMethodNames(loaded.repository),
            connectRenames: collectConnectMethodRenames(loaded.repository),
            numericConstantNames: collectNumericConstantNames(loaded.repository),
            asyncMembers: collectAsyncMembers(loaded.repository),
            methodShadowRenames: collectMethodShadowRenames(loaded.repository),
            hashTableMembers: collectHashTableMembers(loaded.repository),
            errorDomainNames: collectErrorDomainNames(loaded.repository),
            bitfieldNames: collectBitfieldNames(loaded.repository),
        });

        await mkdir(outDir, { recursive: true });
        const namespacesWritten: string[] = [];
        for (const { namespace, content } of rewritten) {
            const nsDir = join(outDir, namespace);
            await mkdir(nsDir, { recursive: true });
            await writeFile(join(nsDir, `${namespace}.d.ts`), content, "utf-8");
            namespacesWritten.push(namespace);
        }

        return { namespaces: namespacesWritten.toSorted((a, b) => a.localeCompare(b)) };
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
