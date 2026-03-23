import { GirLoader } from "./internal/loader.js";
import type { GirNamespaceIntermediate } from "./internal/normalizer.js";
import { GirNormalizer } from "./internal/normalizer.js";
import { GirParser } from "./internal/parser.js";
import type { RawNamespace } from "./internal/raw-types.js";
import { isIntrinsicType } from "./intrinsics.js";
import type { GirAlias } from "./model/alias.js";
import type { GirFunction } from "./model/callables.js";
import type { GirCallback } from "./model/callback.js";
import { GirClass } from "./model/class.js";
import type { GirConstant } from "./model/constant.js";
import type { GirEnumeration } from "./model/enumeration.js";
import { GirInterface } from "./model/interface.js";
import { GirNamespace } from "./model/namespace.js";
import type { GirRecord } from "./model/record.js";
import type { RepositoryLike, TypeKind } from "./model/repository-like.js";
import type { GirType } from "./model/type.js";

/**
 * Options for loading a GIR repository.
 */
export type RepositoryOptions = {
    girPath: string[];
};

/**
 * Central registry for GIR data.
 *
 * Loads, resolves, and provides query access to GIR namespaces.
 * All type references use fully qualified names (`Namespace.TypeName`).
 *
 * @example
 * ```typescript
 * const repo = await GirRepository.load(["Gtk-4.0", "Adw-1"], {
 *     girPath: ["/usr/share/gir-1.0"]
 * });
 *
 * const button = repo.resolveClass("Gtk.Button");
 * button.isSubclassOf("Gtk.Widget"); // true
 * button.getInheritanceChain();
 * // ["Gtk.Button", "Gtk.Widget", "GObject.InitiallyUnowned", "GObject.Object"]
 * ```
 */
export class GirRepository implements RepositoryLike {
    private readonly namespaces: Map<string, GirNamespace>;

    private constructor(namespaces: Map<string, GirNamespace>) {
        this.namespaces = namespaces;
    }

    /**
     * Loads GIR files for the given namespace roots and all their transitive
     * dependencies, returning a fully resolved repository.
     *
     * @param roots - Namespace keys to load (e.g., `["Gtk-4.0", "Adw-1"]`)
     * @param options - Search paths for GIR files
     */
    static async load(roots: string[], options: RepositoryOptions): Promise<GirRepository> {
        const loader = new GirLoader(options.girPath);
        const loaded = await loader.loadAll(roots);

        const rawNamespaces = new Map<string, RawNamespace>();
        for (const [name, { raw }] of loaded) {
            rawNamespaces.set(name, raw);
        }

        return GirRepository.buildFromRaw(rawNamespaces);
    }

    /**
     * Creates a repository from inline GIR XML strings.
     * Useful for testing and scenarios where GIR data is already in memory.
     */
    static fromXml(xmlStrings: string[]): GirRepository {
        const parser = new GirParser();
        const rawNamespaces = new Map<string, RawNamespace>();

        for (const xml of xmlStrings) {
            const raw = parser.parseNamespace(xml);
            rawNamespaces.set(raw.name, raw);
        }

        return GirRepository.buildFromRaw(rawNamespaces);
    }

    private static buildFromRaw(rawNamespaces: Map<string, RawNamespace>): GirRepository {
        const normalizer = new GirNormalizer();
        const intermediates = normalizer.normalize(rawNamespaces);
        return GirRepository.buildFromIntermediates(intermediates);
    }

    private static buildFromIntermediates(intermediates: Map<string, GirNamespaceIntermediate>): GirRepository {
        const namespaceMap = new Map<string, GirNamespace>();
        const repo = new GirRepository(namespaceMap);

        for (const [nsName, data] of intermediates) {
            const classes = new Map<string, GirClass>();
            for (const [name, classData] of data.classes) {
                classes.set(name, new GirClass(classData, repo));
            }

            const interfaces = new Map<string, GirInterface>();
            for (const [name, ifaceData] of data.interfaces) {
                interfaces.set(name, new GirInterface(ifaceData, repo));
            }

            namespaceMap.set(
                nsName,
                new GirNamespace({
                    name: data.name,
                    version: data.version,
                    sharedLibrary: data.sharedLibrary,
                    cPrefix: data.cPrefix,
                    classes,
                    interfaces,
                    records: data.records,
                    enumerations: data.enumerations,
                    bitfields: data.bitfields,
                    callbacks: data.callbacks,
                    functions: data.functions,
                    constants: data.constants,
                    aliases: data.aliases,
                    doc: data.doc,
                }),
            );
        }

        return repo;
    }

    /** Gets all loaded namespace names. */
    getNamespaceNames(): string[] {
        return [...this.namespaces.keys()];
    }

    /** Gets a namespace by name, or null if not loaded. */
    getNamespace(name: string): GirNamespace | null {
        return this.namespaces.get(name) ?? null;
    }

    /** Gets all loaded namespaces. */
    getAllNamespaces(): Map<string, GirNamespace> {
        return this.namespaces;
    }

    /** Resolves a class by qualified name (e.g., `"Gtk.Button"`). */
    resolveClass(qualifiedName: string): GirClass | null {
        const { namespace, name } = splitQualifiedName(qualifiedName);
        return this.namespaces.get(namespace)?.classes.get(name) ?? null;
    }

    /** Resolves an interface by qualified name (e.g., `"Gio.ListModel"`). */
    resolveInterface(qualifiedName: string): GirInterface | null {
        const { namespace, name } = splitQualifiedName(qualifiedName);
        return this.namespaces.get(namespace)?.interfaces.get(name) ?? null;
    }

    /** Resolves a record by qualified name (e.g., `"Gdk.Rectangle"`). */
    resolveRecord(qualifiedName: string): GirRecord | null {
        const { namespace, name } = splitQualifiedName(qualifiedName);
        return this.namespaces.get(namespace)?.records.get(name) ?? null;
    }

    /** Resolves an enumeration by qualified name (e.g., `"Gtk.Orientation"`). */
    resolveEnum(qualifiedName: string): GirEnumeration | null {
        const { namespace, name } = splitQualifiedName(qualifiedName);
        return this.namespaces.get(namespace)?.enumerations.get(name) ?? null;
    }

    /** Resolves a bitfield by qualified name (e.g., `"Gdk.ModifierType"`). */
    resolveFlags(qualifiedName: string): GirEnumeration | null {
        const { namespace, name } = splitQualifiedName(qualifiedName);
        return this.namespaces.get(namespace)?.bitfields.get(name) ?? null;
    }

    /** Resolves a callback by qualified name (e.g., `"Gio.AsyncReadyCallback"`). */
    resolveCallback(qualifiedName: string): GirCallback | null {
        const { namespace, name } = splitQualifiedName(qualifiedName);
        return this.namespaces.get(namespace)?.callbacks.get(name) ?? null;
    }

    /** Resolves a constant by qualified name (e.g., `"Gtk.MAJOR_VERSION"`). */
    resolveConstant(qualifiedName: string): GirConstant | null {
        const { namespace, name } = splitQualifiedName(qualifiedName);
        return this.namespaces.get(namespace)?.constants.get(name) ?? null;
    }

    /** Resolves a standalone function by qualified name (e.g., `"Gtk.init"`). */
    resolveFunction(qualifiedName: string): GirFunction | null {
        const { namespace, name } = splitQualifiedName(qualifiedName);
        return this.namespaces.get(namespace)?.functions.get(name) ?? null;
    }

    /** Resolves an alias by qualified name (e.g., `"Pango.LayoutRun"`). */
    resolveAlias(qualifiedName: string): GirAlias | null {
        const { namespace, name } = splitQualifiedName(qualifiedName);
        return this.namespaces.get(namespace)?.aliases.get(name) ?? null;
    }

    /** Resolves a type alias to its target type, or null if not an alias. */
    resolveTypeAlias(qualifiedName: string): GirType | null {
        return this.resolveAlias(qualifiedName)?.targetType ?? null;
    }

    /**
     * Gets the kind of a type (class, interface, record, enum, flags, callback).
     * Returns null for intrinsic types or unknown types.
     */
    getTypeKind(qualifiedName: string): TypeKind | null {
        if (isIntrinsicType(qualifiedName)) return null;

        const { namespace, name } = splitQualifiedName(qualifiedName);
        const ns = this.namespaces.get(namespace);
        if (!ns) return null;

        if (ns.classes.has(name)) return "class";
        if (ns.interfaces.has(name)) return "interface";
        if (ns.records.has(name)) return "record";
        if (ns.enumerations.has(name)) return "enum";
        if (ns.bitfields.has(name)) return "flags";
        if (ns.callbacks.has(name)) return "callback";

        return null;
    }

    /** Gets the full inheritance chain for a class (most derived to base). */
    getInheritanceChain(qualifiedName: string): string[] {
        return this.resolveClass(qualifiedName)?.getInheritanceChain() ?? [];
    }

    /** Gets all interfaces implemented by a class (including inherited). */
    getImplementedInterfaces(qualifiedName: string): string[] {
        return this.resolveClass(qualifiedName)?.getAllImplementedInterfaces() ?? [];
    }

    /** Gets all classes that derive from a given class. */
    getDerivedClasses(qualifiedName: string): string[] {
        const derived: string[] = [];
        for (const ns of this.namespaces.values()) {
            for (const cls of ns.classes.values()) {
                if (cls.qualifiedName !== qualifiedName && cls.isSubclassOf(qualifiedName)) {
                    derived.push(cls.qualifiedName);
                }
            }
        }
        return derived;
    }

    /** Gets all classes that implement a given interface. */
    getImplementors(interfaceName: string): string[] {
        const implementors: string[] = [];
        for (const ns of this.namespaces.values()) {
            for (const cls of ns.classes.values()) {
                if (cls.implementsInterface(interfaceName)) {
                    implementors.push(cls.qualifiedName);
                }
            }
        }
        return implementors;
    }

    /** Checks if a type is a GObject (class with GType). */
    isGObject(qualifiedName: string): boolean {
        return this.resolveClass(qualifiedName)?.hasGType() ?? false;
    }

    /** Checks if a type is a boxed type (record with GType). */
    isBoxed(qualifiedName: string): boolean {
        return this.resolveRecord(qualifiedName)?.isBoxed() ?? false;
    }

    /** Checks if a type is a primitive (intrinsic). */
    isPrimitive(typeName: string): boolean {
        return isIntrinsicType(typeName);
    }

    /** Finds all classes matching a predicate across all namespaces. */
    findClasses(predicate: (cls: GirClass) => boolean): GirClass[] {
        const results: GirClass[] = [];
        for (const ns of this.namespaces.values()) {
            for (const cls of ns.classes.values()) {
                if (predicate(cls)) results.push(cls);
            }
        }
        return results;
    }

    /** Finds all interfaces matching a predicate across all namespaces. */
    findInterfaces(predicate: (iface: GirInterface) => boolean): GirInterface[] {
        const results: GirInterface[] = [];
        for (const ns of this.namespaces.values()) {
            for (const iface of ns.interfaces.values()) {
                if (predicate(iface)) results.push(iface);
            }
        }
        return results;
    }

    /** Finds all records matching a predicate across all namespaces. */
    findRecords(predicate: (record: GirRecord) => boolean): GirRecord[] {
        const results: GirRecord[] = [];
        for (const ns of this.namespaces.values()) {
            for (const record of ns.records.values()) {
                if (predicate(record)) results.push(record);
            }
        }
        return results;
    }
}

function splitQualifiedName(qn: string): { namespace: string; name: string } {
    const dot = qn.indexOf(".");
    return {
        namespace: qn.slice(0, dot),
        name: qn.slice(dot + 1),
    };
}
