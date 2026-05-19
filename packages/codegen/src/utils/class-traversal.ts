/**
 * Class Traversal Utilities
 *
 * Shared utilities for traversing class hierarchies.
 */

import type { GirClass, GirInterface, GirRepository } from "../gir/index.js";
import { toCamelCase } from "./naming.js";

/**
 * Collects interfaces implemented by all parent classes.
 */
function collectParentInterfaces(cls: GirClass): Set<string> {
    const interfaces = new Set<string>();

    let current = cls.getParent();
    while (current) {
        for (const ifaceQName of current.implements) {
            interfaces.add(ifaceQName);
        }
        current = current.getParent();
    }

    return interfaces;
}

/**
 * Generic member collector for parent hierarchy traversal.
 * Extracts and transforms member names from classes and their interfaces.
 *
 * @param cls - The class to start from
 * @param repo - GIR repository for interface resolution
 * @param getClassMembers - Function to extract members from a class
 * @param getInterfaceMembers - Function to extract members from an interface
 * @param transformName - Optional function to transform member names (e.g., toCamelCase)
 */
function collectParentMemberNames<T extends { name: string }>(opts: {
    cls: GirClass;
    repo: GirRepository;
    getClassMembers: (c: GirClass) => readonly T[];
    getInterfaceMembers: (i: GirInterface) => readonly T[];
    transformName?: (name: string) => string;
}): Set<string> {
    const { cls, repo, getClassMembers, getInterfaceMembers, transformName = (n) => n } = opts;
    const names = new Set<string>();

    let current = cls.getParent();
    while (current) {
        for (const member of getClassMembers(current)) {
            names.add(transformName(member.name));
        }

        for (const ifaceQName of current.implements) {
            const iface = repo.resolveInterface(ifaceQName);
            if (iface) {
                for (const member of getInterfaceMembers(iface)) {
                    names.add(transformName(member.name));
                }
            }
        }

        current = current.getParent();
    }

    return names;
}

/**
 * Collects property names from all parent classes and their interfaces.
 */
export function collectParentPropertyNames(cls: GirClass, repo: GirRepository): Set<string> {
    return collectParentMemberNames({
        cls,
        repo,
        getClassMembers: (c) => c.properties,
        getInterfaceMembers: (i) => i.properties,
        transformName: toCamelCase,
    });
}

/**
 * Collects signal names from all parent classes and their interfaces.
 */
export function collectParentSignalNames(cls: GirClass, repo: GirRepository): Set<string> {
    return collectParentMemberNames({
        cls,
        repo,
        getClassMembers: (c) => c.signals,
        getInterfaceMembers: (i) => i.signals,
        transformName: toCamelCase,
    });
}

/**
 * Collects the camelCased `<virtual-method>` names reachable on a class: its
 * own virtual methods plus those of every ancestor class and every directly or
 * transitively implemented interface.
 *
 * ts-for-gir resolves a same-named GObject `<property>` and `<virtual-method>`
 * on a class by dropping the property; the FFI runtime mirrors that by
 * suppressing the property accessor whose name appears in this set.
 *
 * @param cls - The class to start from.
 * @param repo - GIR repository for interface resolution.
 * @returns The camelCased reachable virtual-method names.
 */
export function collectReachableVirtualMethodNames(cls: GirClass, repo: GirRepository): Set<string> {
    const names = new Set<string>();
    const visitedInterfaces = new Set<string>();

    const visitInterface = (qualifiedName: string): void => {
        if (visitedInterfaces.has(qualifiedName)) return;
        visitedInterfaces.add(qualifiedName);
        const iface = repo.resolveInterface(qualifiedName);
        if (!iface) return;
        for (const name of iface.virtualMethodNames) names.add(toCamelCase(name));
        for (const prereq of iface.prerequisites) visitInterface(prereq);
    };

    let current: GirClass | null = cls;
    while (current) {
        for (const name of current.virtualMethodNames) names.add(toCamelCase(name));
        for (const ifaceQName of current.implements) visitInterface(ifaceQName);
        current = current.getParent();
    }

    return names;
}

/**
 * Selectors and options that adapt {@link collectInterfaceMembers} to a
 * specific member kind.
 */
export type InterfaceMemberCollector<T> = {
    /** Members contributed by a prerequisite class (collected per ancestor). */
    getClassMembers: (cls: GirClass) => readonly T[];
    /** Members contributed by a prerequisite interface. */
    getInterfaceMembers: (iface: GirInterface) => readonly T[];
    /** Deduplication key for a member; the first member seen per key is kept. */
    keyOf: (member: T) => string;
    /** Keys to treat as already collected, suppressing them from the result. */
    seenKeys?: Iterable<string>;
    /** When true, the interface's own members precede its prerequisites'. */
    includeOwn?: boolean;
};

/**
 * Collects members reachable through an interface's prerequisite closure: the
 * transitive prerequisite interfaces, and — for any prerequisite that resolves
 * to a class — that class's ancestors and the interfaces they implement.
 *
 * This is the interface-prerequisite analogue of {@link collectParentMemberNames}:
 * every reachable class and interface is visited once, and members are
 * deduplicated by {@link InterfaceMemberCollector.keyOf}.
 *
 * @param iface - The interface whose prerequisite closure to walk.
 * @param repo - GIR repository for class and interface resolution.
 * @param collector - Adapts the walk to a specific member kind.
 * @returns The collected members in visitation order.
 */
export function collectInterfaceMembers<T>(
    iface: GirInterface,
    repo: GirRepository,
    collector: InterfaceMemberCollector<T>,
): T[] {
    const { getClassMembers, getInterfaceMembers, keyOf, seenKeys, includeOwn } = collector;
    const members: T[] = [];
    const seen = new Set<string>(seenKeys);
    const visited = new Set<string>();

    const collect = (candidates: readonly T[]): void => {
        for (const member of candidates) {
            const key = keyOf(member);
            if (seen.has(key)) continue;
            seen.add(key);
            members.push(member);
        }
    };

    const visitClass = (qualifiedName: string): void => {
        if (visited.has(qualifiedName)) return;
        visited.add(qualifiedName);
        const cls = repo.resolveClass(qualifiedName);
        if (!cls) return;
        for (const ancestorName of cls.getInheritanceChain()) {
            const ancestor = repo.resolveClass(ancestorName);
            if (!ancestor) continue;
            collect(getClassMembers(ancestor));
            for (const implemented of ancestor.getAllImplementedInterfaces()) {
                visitPrerequisite(implemented);
            }
        }
    };

    const visitPrerequisite = (qualifiedName: string): void => {
        if (visited.has(qualifiedName)) return;
        const prereq = repo.resolveInterface(qualifiedName);
        if (!prereq) {
            visitClass(qualifiedName);
            return;
        }
        visited.add(qualifiedName);
        for (const prerequisite of prereq.prerequisites) {
            visitPrerequisite(prerequisite);
        }
        collect(getInterfaceMembers(prereq));
    };

    if (includeOwn) collect(getInterfaceMembers(iface));
    for (const prerequisite of iface.prerequisites) {
        visitPrerequisite(prerequisite);
    }
    return members;
}

/**
 * Collects the camelCased `<virtual-method>` names reachable on an interface:
 * its own virtual methods plus those of every transitive prerequisite class
 * and interface.
 *
 * @param iface - The interface to start from.
 * @param repo - GIR repository for prerequisite resolution.
 * @returns The camelCased reachable virtual-method names.
 */
export function collectInterfaceReachableVirtualMethodNames(iface: GirInterface, repo: GirRepository): Set<string> {
    const names = collectInterfaceMembers(iface, repo, {
        getClassMembers: (cls) => cls.virtualMethodNames,
        getInterfaceMembers: (prereq) => prereq.virtualMethodNames,
        keyOf: toCamelCase,
        includeOwn: true,
    });
    return new Set(names.map(toCamelCase));
}

/**
 * Collects method names from all parent classes and their interfaces.
 */
export function collectParentMethodNames(cls: GirClass, repo: GirRepository): Set<string> {
    return collectParentMemberNames({
        cls,
        repo,
        getClassMembers: (c) => c.methods,
        getInterfaceMembers: (i) => i.methods,
    });
}

/**
 * Collects factory method names (from constructors) from all parent classes.
 * These names are the camelCase versions of constructor names (e.g., new_from_template → newFromTemplate).
 * Used to detect when a subclass's factory method would conflict with a parent's.
 */
export function collectParentFactoryMethodNames(cls: GirClass): Set<string> {
    const names = new Set<string>();

    let current = cls.getParent();
    while (current) {
        for (const ctor of current.constructors) {
            names.add(toCamelCase(ctor.shadows ?? ctor.name));
        }
        current = current.getParent();
    }

    return names;
}

/**
 * Options for collecting direct members.
 */
type CollectDirectMembersOptions<T extends { name: string }> = {
    /** The class to analyze */
    cls: GirClass;
    /** GIR repository for interface resolution */
    repo: GirRepository;
    /** Function to extract members from a class */
    getClassMembers: (c: GirClass) => readonly T[];
    /** Function to extract members from an interface */
    getInterfaceMembers: (i: GirInterface) => readonly T[];
    /** Function to get parent member names (already collected) */
    getParentNames: (cls: GirClass, repo: GirRepository) => Set<string>;
    /** Optional function to transform member names (e.g., toCamelCase) */
    transformName?: (name: string) => string;
    /** Optional predicate to filter hidden members */
    isHidden?: (transformedName: string) => boolean;
};

/**
 * Collects direct members from a class, excluding inherited members.
 * Also includes members from interfaces this class directly implements
 * (not from parent-implemented interfaces).
 *
 * This is the generic version of the filtering logic used by PropertyAnalyzer
 * and SignalAnalyzer. It extracts the common DRY pattern.
 *
 * @returns Array of direct members from the class and its direct interfaces
 */
/**
 * Collects method names from GObject.Object class.
 * Used by interfaces to detect method name conflicts with their base class.
 * Returns camelCase method names for comparison with generated interface methods.
 */
export function collectGObjectMethodNames(repo: GirRepository): Set<string> {
    const names = new Set<string>();
    const gobjectClass = repo.resolveClass("GObject.Object");
    if (gobjectClass) {
        for (const method of gobjectClass.methods) {
            names.add(toCamelCase(method.name));
        }
    }
    names.add("connect");
    return names;
}

export function collectDirectMembers<T extends { name: string }>(options: CollectDirectMembersOptions<T>): T[] {
    const {
        cls,
        repo,
        getClassMembers,
        getInterfaceMembers,
        getParentNames,
        transformName = (n) => n,
        isHidden = () => false,
    } = options;
    const parentNames = getParentNames(cls, repo);

    const directMembers = getClassMembers(cls).filter((member) => {
        const transformedName = transformName(member.name);
        return !parentNames.has(transformedName) && !isHidden(transformedName);
    });

    const parentInterfaces = collectParentInterfaces(cls);
    const allDirectMembers = [...directMembers];

    for (const ifaceQName of cls.implements) {
        if (parentInterfaces.has(ifaceQName)) continue;
        const iface = repo.resolveInterface(ifaceQName);
        if (!iface) continue;

        for (const member of getInterfaceMembers(iface)) {
            const transformedName = transformName(member.name);
            if (parentNames.has(transformedName) || isHidden(transformedName)) continue;
            if (allDirectMembers.some((m) => m.name === member.name)) continue;
            allDirectMembers.push(member);
        }
    }

    return allDirectMembers;
}
