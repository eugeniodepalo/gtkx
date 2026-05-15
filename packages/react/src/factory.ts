import type { Node } from "./node.js";
import { resolveNativeClass } from "./nodes/internal/construct.js";
import { NODE_REGISTRY, type NodeClass } from "./registry.js";
import type { Container, ContainerClass, Props } from "./types.js";

/**
 * Resolves the FFI widget class backing a JSX intrinsic element name.
 *
 * Returns `null` for virtual reconciler elements such as `"Slot"` or
 * `"TextTag"` that have no backing GLib type.
 *
 * @param type - JSX intrinsic element name, e.g. `"GtkButton"`
 */
export const resolveContainerClass = (type: string): ContainerClass | null =>
    resolveNativeClass(type) as ContainerClass | null;

// biome-ignore lint/suspicious/noExplicitAny: Required for instanceof checks against GTK class hierarchy
type ClassKey = abstract new (...args: any[]) => any;

type RegistryKey = string | ClassKey | readonly (string | ClassKey)[];

const matchesSingleKey = (key: string | ClassKey, typeName: string, target: object | null): boolean => {
    if (typeof key === "string") {
        return key === typeName;
    }
    return !!target && (target instanceof key || target === key || Object.prototype.isPrototypeOf.call(key, target));
};

const matchesKey = (key: RegistryKey, typeName: string, target: object | null): boolean => {
    if (typeof key === "string" || typeof key === "function") {
        return matchesSingleKey(key, typeName, target);
    }
    return key.some((k) => matchesSingleKey(k, typeName, target));
};

export const createNode = (
    typeName: string,
    props: Props,
    existingContainer: Container | undefined,
    rootContainer: Container,
): Node => {
    const containerClass = resolveContainerClass(typeName);

    for (const [key, NodeClass] of NODE_REGISTRY) {
        if (!matchesKey(key, typeName, existingContainer ?? containerClass)) continue;
        return instantiateNode(NodeClass, typeName, props, existingContainer, containerClass, rootContainer);
    }

    throw new Error(`Unable to find node class for type '${typeName}'`);
};

const instantiateNode = (
    NodeClass: NodeClass,
    typeName: string,
    props: Props,
    existingContainer: Container | undefined,
    containerClass: ContainerClass | null,
    rootContainer: Container,
): Node => {
    const container =
        existingContainer ??
        (containerClass && NodeClass.createContainer(typeName, props, containerClass, rootContainer));
    return new NodeClass(typeName, props, container, rootContainer);
};
