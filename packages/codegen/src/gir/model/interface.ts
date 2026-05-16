import type { GirMethod } from "./callables.js";
import type { GirProperty } from "./property.js";
import type { RepositoryLike } from "./repository-like.js";
import type { GirSignal } from "./signal.js";

/**
 * GObject interface with helper methods.
 *
 * Receives a repository reference at construction time to enable
 * prerequisite traversal across the type graph.
 */
export class GirInterface {
    readonly name: string;
    readonly qualifiedName: string;
    readonly cType: string;
    readonly glibTypeName?: string;
    readonly glibGetType?: string;
    readonly prerequisites: string[];
    readonly methods: GirMethod[];
    readonly properties: GirProperty[];
    readonly signals: GirSignal[];
    /** Declared `<field>` element names of the interface struct. */
    readonly fieldNames: string[];
    /** Declared `<virtual-method>` element names. */
    readonly virtualMethodNames: string[];
    readonly doc?: string;

    private readonly repo: RepositoryLike;

    constructor(
        data: {
            name: string;
            qualifiedName: string;
            cType: string;
            glibTypeName?: string;
            glibGetType?: string;
            prerequisites: string[];
            methods: GirMethod[];
            properties: GirProperty[];
            signals: GirSignal[];
            fieldNames: string[];
            virtualMethodNames: string[];
            doc?: string;
        },
        repo: RepositoryLike,
    ) {
        this.name = data.name;
        this.qualifiedName = data.qualifiedName;
        this.cType = data.cType;
        this.glibTypeName = data.glibTypeName;
        this.glibGetType = data.glibGetType;
        this.prerequisites = data.prerequisites;
        this.methods = data.methods;
        this.properties = data.properties;
        this.signals = data.signals;
        this.fieldNames = data.fieldNames;
        this.virtualMethodNames = data.virtualMethodNames;
        this.doc = data.doc;
        this.repo = repo;
    }

    /** Checks if this interface has a prerequisite (direct or transitive). */
    hasPrerequisite(qualifiedName: string): boolean {
        if (this.prerequisites.includes(qualifiedName)) return true;
        for (const prereq of this.prerequisites) {
            const prereqIface = this.repo.resolveInterface(prereq);
            if (prereqIface?.hasPrerequisite(qualifiedName)) return true;
        }
        return false;
    }

    /** Gets all prerequisites including transitive ones. */
    getAllPrerequisites(): string[] {
        const all = new Set<string>(this.prerequisites);
        for (const prereq of this.prerequisites) {
            const prereqIface = this.repo.resolveInterface(prereq);
            if (prereqIface) {
                for (const p of prereqIface.getAllPrerequisites()) {
                    all.add(p);
                }
            }
        }
        return [...all];
    }

    /** Finds a method by name. */
    getMethod(name: string): GirMethod | null {
        return this.methods.find((m) => m.name === name) ?? null;
    }

    /** Finds a property by name. */
    getProperty(name: string): GirProperty | null {
        return this.properties.find((p) => p.name === name) ?? null;
    }

    /** Finds a signal by name. */
    getSignal(name: string): GirSignal | null {
        return this.signals.find((s) => s.name === name) ?? null;
    }
}
