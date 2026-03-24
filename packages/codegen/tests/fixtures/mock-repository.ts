import type {
    GirCallback,
    GirClass,
    GirConstant,
    GirEnumeration,
    GirFunction,
    GirInterface,
    GirNamespace,
    GirRecord,
    TypeKind,
} from "@gtkx/gir";

function splitQualifiedName(qn: string): { namespace: string; name: string } {
    const dot = qn.indexOf(".");
    return { namespace: qn.slice(0, dot), name: qn.slice(dot + 1) };
}

export interface MockGirRepository {
    getNamespace(name: string): GirNamespace | null;
    getNamespaceNames(): string[];
    getAllNamespaces(): Map<string, GirNamespace>;
    resolveClass(qualifiedName: string): GirClass | null;
    resolveInterface(qualifiedName: string): GirInterface | null;
    resolveRecord(qualifiedName: string): GirRecord | null;
    resolveEnum(qualifiedName: string): GirEnumeration | null;
    resolveFlags(qualifiedName: string): GirEnumeration | null;
    resolveCallback(qualifiedName: string): GirCallback | null;
    resolveConstant(qualifiedName: string): GirConstant | null;
    resolveFunction(qualifiedName: string): GirFunction | null;
    getTypeKind(qualifiedName: string): TypeKind | null;
    getInheritanceChain(qualifiedName: string): string[];
    getImplementedInterfaces(qualifiedName: string): string[];
    getDerivedClasses(qualifiedName: string): string[];
    getImplementors(interfaceName: string): string[];
    isGObject(qualifiedName: string): boolean;
    isBoxed(qualifiedName: string): boolean;
    isPrimitive(typeName: string): boolean;
    findClasses(predicate: (cls: GirClass) => boolean): GirClass[];
}

export function createMockRepository(namespaces: Map<string, GirNamespace> = new Map()): MockGirRepository {
    const repo: MockGirRepository = {
        getNamespace(name: string): GirNamespace | null {
            return namespaces.get(name) ?? null;
        },

        getNamespaceNames(): string[] {
            return [...namespaces.keys()];
        },

        getAllNamespaces(): Map<string, GirNamespace> {
            return namespaces;
        },

        resolveClass(qn: string): GirClass | null {
            const { namespace, name } = splitQualifiedName(qn);
            return namespaces.get(namespace)?.classes.get(name) ?? null;
        },

        resolveInterface(qn: string): GirInterface | null {
            const { namespace, name } = splitQualifiedName(qn);
            return namespaces.get(namespace)?.interfaces.get(name) ?? null;
        },

        resolveRecord(qn: string): GirRecord | null {
            const { namespace, name } = splitQualifiedName(qn);
            return namespaces.get(namespace)?.records.get(name) ?? null;
        },

        resolveEnum(qn: string): GirEnumeration | null {
            const { namespace, name } = splitQualifiedName(qn);
            return namespaces.get(namespace)?.enumerations.get(name) ?? null;
        },

        resolveFlags(qn: string): GirEnumeration | null {
            const { namespace, name } = splitQualifiedName(qn);
            return namespaces.get(namespace)?.bitfields.get(name) ?? null;
        },

        resolveCallback(qn: string): GirCallback | null {
            const { namespace, name } = splitQualifiedName(qn);
            return namespaces.get(namespace)?.callbacks.get(name) ?? null;
        },

        resolveConstant(qn: string): GirConstant | null {
            const { namespace, name } = splitQualifiedName(qn);
            return namespaces.get(namespace)?.constants.get(name) ?? null;
        },

        resolveFunction(qn: string): GirFunction | null {
            const { namespace, name } = splitQualifiedName(qn);
            return namespaces.get(namespace)?.functions.get(name) ?? null;
        },

        getTypeKind(qn: string): TypeKind | null {
            const { namespace, name } = splitQualifiedName(qn);
            const ns = namespaces.get(namespace);
            if (!ns) return null;

            if (ns.classes.has(name)) return "class";
            if (ns.interfaces.has(name)) return "interface";
            if (ns.records.has(name)) return "record";
            if (ns.enumerations.has(name)) return "enum";
            if (ns.bitfields.has(name)) return "flags";
            if (ns.callbacks.has(name)) return "callback";

            return null;
        },

        getInheritanceChain(qn: string): string[] {
            const cls = repo.resolveClass(qn);
            return cls?.getInheritanceChain() ?? [];
        },

        getImplementedInterfaces(qn: string): string[] {
            const cls = repo.resolveClass(qn);
            return cls?.getAllImplementedInterfaces() ?? [];
        },

        getDerivedClasses(qn: string): string[] {
            const derived: string[] = [];
            for (const ns of namespaces.values()) {
                for (const cls of ns.classes.values()) {
                    if (cls.qualifiedName !== qn && cls.isSubclassOf(qn)) {
                        derived.push(cls.qualifiedName);
                    }
                }
            }
            return derived;
        },

        getImplementors(interfaceName: string): string[] {
            const implementors: string[] = [];
            for (const ns of namespaces.values()) {
                for (const cls of ns.classes.values()) {
                    if (cls.implementsInterface(interfaceName)) {
                        implementors.push(cls.qualifiedName);
                    }
                }
            }
            return implementors;
        },

        isGObject(qn: string): boolean {
            const cls = repo.resolveClass(qn);
            return cls?.hasGType() ?? false;
        },

        isBoxed(qn: string): boolean {
            const record = repo.resolveRecord(qn);
            return record?.isBoxed() ?? false;
        },

        isPrimitive(typeName: string): boolean {
            const primitives = new Set([
                "gint",
                "guint",
                "gint8",
                "guint8",
                "gint16",
                "guint16",
                "gint32",
                "guint32",
                "gint64",
                "guint64",
                "gfloat",
                "gdouble",
                "gboolean",
                "gchar",
                "guchar",
                "gshort",
                "gushort",
                "glong",
                "gulong",
                "gsize",
                "gssize",
                "gpointer",
                "gconstpointer",
                "utf8",
                "filename",
                "none",
            ]);
            return primitives.has(typeName);
        },

        findClasses(predicate: (cls: GirClass) => boolean): GirClass[] {
            const results: GirClass[] = [];
            for (const ns of namespaces.values()) {
                for (const cls of ns.classes.values()) {
                    if (predicate(cls)) {
                        results.push(cls);
                    }
                }
            }
            return results;
        },
    };

    return repo;
}
