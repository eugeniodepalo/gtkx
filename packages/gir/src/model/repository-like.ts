import type { GirClass } from "./class.js";
import type { GirInterface } from "./interface.js";

/**
 * The kind of a user-defined type (not intrinsic).
 */
export type TypeKind = "class" | "interface" | "record" | "enum" | "flags" | "callback";

/**
 * Minimal repository interface used by model classes for type graph traversal.
 *
 * This interface breaks the circular dependency between model classes and
 * the concrete GirRepository. Model classes depend on this interface,
 * and GirRepository implements it.
 */
export type RepositoryLike = {
    resolveClass(qualifiedName: string): GirClass | null;
    resolveInterface(qualifiedName: string): GirInterface | null;
    findClasses(predicate: (cls: GirClass) => boolean): GirClass[];
};
