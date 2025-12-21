import { NAMESPACE_REGISTRY } from "./generated/registry.js";
import type { Node } from "./node.js";
import { NODE_CLASSES } from "./registry.js";
import type { Container, ContainerClass, Props } from "./types.js";
import "./nodes/index.js";

const resolveContainerClass = (type: string): ContainerClass | undefined => {
    const normalizedType = type.endsWith(".Root") ? type.slice(0, -5) : type;

    for (const [prefix, namespace] of NAMESPACE_REGISTRY) {
        if (normalizedType.startsWith(prefix)) {
            const className = normalizedType.slice(prefix.length);
            return namespace[className] as ContainerClass;
        }
    }
};

export const createNode = (
    typeName: string,
    props: Props,
    existingContainer?: Container,
    rootContainer?: Container,
): Node => {
    const containerClass = resolveContainerClass(typeName);

    for (const NodeClass of NODE_CLASSES) {
        if (NodeClass.matches(typeName, existingContainer ?? containerClass)) {
            const container = existingContainer ?? NodeClass.createContainer(props, containerClass, rootContainer);
            return new NodeClass(typeName, props, container, rootContainer);
        }
    }

    throw new Error(`No matching node class for type: ${typeName}`);
};
