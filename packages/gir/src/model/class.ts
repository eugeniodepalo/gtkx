import type { GirConstructor, GirFunction, GirMethod } from "./callables.js";
import type { GirProperty } from "./property.js";
import type { RepositoryLike } from "./repository-like.js";
import type { GirSignal } from "./signal.js";

/**
 * GObject class with helper methods for type graph traversal.
 *
 * Receives a repository reference at construction time to enable
 * inheritance chain traversal and interface resolution.
 */
export class GirClass {
    readonly name: string;
    readonly qualifiedName: string;
    readonly cType: string;
    readonly parent: string | null;
    readonly abstract: boolean;
    readonly glibTypeName?: string;
    readonly glibGetType?: string;
    readonly cSymbolPrefix?: string;
    readonly fundamental: boolean;
    readonly refFunc?: string;
    readonly unrefFunc?: string;
    readonly implements: string[];
    readonly methods: GirMethod[];
    readonly constructors: GirConstructor[];
    readonly staticFunctions: GirFunction[];
    readonly properties: GirProperty[];
    readonly signals: GirSignal[];
    readonly doc?: string;

    private readonly repo: RepositoryLike;

    constructor(
        data: {
            name: string;
            qualifiedName: string;
            cType: string;
            parent: string | null;
            abstract: boolean;
            glibTypeName?: string;
            glibGetType?: string;
            cSymbolPrefix?: string;
            fundamental?: boolean;
            refFunc?: string;
            unrefFunc?: string;
            implements: string[];
            methods: GirMethod[];
            constructors: GirConstructor[];
            staticFunctions: GirFunction[];
            properties: GirProperty[];
            signals: GirSignal[];
            doc?: string;
        },
        repo: RepositoryLike,
    ) {
        this.name = data.name;
        this.qualifiedName = data.qualifiedName;
        this.cType = data.cType;
        this.parent = data.parent;
        this.abstract = data.abstract;
        this.glibTypeName = data.glibTypeName;
        this.glibGetType = data.glibGetType;
        this.cSymbolPrefix = data.cSymbolPrefix;
        this.fundamental = data.fundamental ?? false;
        this.refFunc = data.refFunc;
        this.unrefFunc = data.unrefFunc;
        this.implements = data.implements;
        this.methods = data.methods;
        this.constructors = data.constructors;
        this.staticFunctions = data.staticFunctions;
        this.properties = data.properties;
        this.signals = data.signals;
        this.doc = data.doc;
        this.repo = repo;
    }

    /** Checks if this class is a subclass of another (direct or transitive). */
    isSubclassOf(qualifiedName: string): boolean {
        if (this.qualifiedName === qualifiedName) return true;
        if (!this.parent) return false;
        if (this.parent === qualifiedName) return true;
        const parentClass = this.repo.resolveClass(this.parent);
        return parentClass?.isSubclassOf(qualifiedName) ?? false;
    }

    /** Gets the full inheritance chain from this class to the root. */
    getInheritanceChain(): string[] {
        const chain: string[] = [this.qualifiedName];
        let current: GirClass | null = this as GirClass;
        while (current?.parent) {
            chain.push(current.parent);
            current = this.repo.resolveClass(current.parent);
        }
        return chain;
    }

    /** Gets the parent class object, or null if this is a root class. */
    getParent(): GirClass | null {
        return this.parent ? this.repo.resolveClass(this.parent) : null;
    }

    /** Checks if this class directly or transitively implements an interface. */
    implementsInterface(qualifiedName: string): boolean {
        if (this.implements.includes(qualifiedName)) return true;
        const parent = this.getParent();
        return parent?.implementsInterface(qualifiedName) ?? false;
    }

    /** Gets all implemented interfaces including inherited ones. */
    getAllImplementedInterfaces(): string[] {
        const interfaces = new Set<string>(this.implements);
        let current = this.getParent();
        while (current) {
            for (const iface of current.implements) {
                interfaces.add(iface);
            }
            current = current.getParent();
        }
        return [...interfaces];
    }

    /** Finds a method defined on this class by name. */
    getMethod(name: string): GirMethod | null {
        return this.methods.find((m) => m.name === name) ?? null;
    }

    /** Finds a property defined on this class by name. */
    getProperty(name: string): GirProperty | null {
        return this.properties.find((p) => p.name === name) ?? null;
    }

    /** Finds a signal defined on this class by name. */
    getSignal(name: string): GirSignal | null {
        return this.signals.find((s) => s.name === name) ?? null;
    }

    /** Finds a constructor by name. */
    getConstructor(name: string): GirConstructor | null {
        return this.constructors.find((c) => c.name === name) ?? null;
    }

    /** Gets all methods including inherited ones. */
    getAllMethods(): GirMethod[] {
        const methods = [...this.methods];
        let current = this.getParent();
        while (current) {
            methods.push(...current.methods);
            current = current.getParent();
        }
        return methods;
    }

    /** Gets all properties including inherited ones. */
    getAllProperties(): GirProperty[] {
        const properties = [...this.properties];
        let current = this.getParent();
        while (current) {
            properties.push(...current.properties);
            current = current.getParent();
        }
        return properties;
    }

    /** Gets all signals including inherited ones. */
    getAllSignals(): GirSignal[] {
        const signals = [...this.signals];
        let current = this.getParent();
        while (current) {
            signals.push(...current.signals);
            current = current.getParent();
        }
        return signals;
    }

    /** Finds a method by name, searching up the inheritance chain. */
    findMethod(name: string): GirMethod | null {
        return this.getMethod(name) ?? this.getParent()?.findMethod(name) ?? null;
    }

    /** Finds a method by its C identifier. */
    getMethodByCIdentifier(cIdentifier: string): GirMethod | null {
        return this.methods.find((m) => m.cIdentifier === cIdentifier) ?? null;
    }

    /** Finds a property by name, searching up the inheritance chain. */
    findProperty(name: string): GirProperty | null {
        return this.getProperty(name) ?? this.getParent()?.findProperty(name) ?? null;
    }

    /** Finds a signal by name, searching up the inheritance chain. */
    findSignal(name: string): GirSignal | null {
        return this.getSignal(name) ?? this.getParent()?.findSignal(name) ?? null;
    }

    /** True if this is an abstract class. */
    isAbstract(): boolean {
        return this.abstract;
    }

    /** True if this has a GType (most GObject classes do). */
    hasGType(): boolean {
        return this.glibTypeName !== undefined;
    }

    /** True if this is a fundamental type with custom ref/unref functions. */
    isFundamental(): boolean {
        return this.fundamental && this.refFunc !== undefined && this.unrefFunc !== undefined;
    }

    /** Gets direct subclasses of this class. */
    getDirectSubclasses(): GirClass[] {
        return this.repo.findClasses((cls) => cls.parent === this.qualifiedName);
    }
}
