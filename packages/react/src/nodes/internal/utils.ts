import type { NativeClass } from "@gtkx/ffi";
import type * as Gtk from "@gtkx/ffi/gtk";
import { PROPS, SIGNALS } from "../../generated/internal.js";
import type { Container, Props } from "../../types.js";
import { isAddable, isAppendable, isContentWidget, isRemovable, isSingleChild } from "./predicates.js";

export const filterProps = <T extends Props>(props: T, excludeKeys: readonly string[]): T => {
    const result: Props = {};

    for (const key of Object.keys(props)) {
        if (!excludeKeys.includes(key)) {
            result[key] = props[key];
        }
    }

    return result as T;
};

const walkPrototypeChain = <T>(instance: Container, lookup: (typeName: string) => T | null): T | null => {
    // biome-ignore lint/complexity/noBannedTypes: Walking prototype chain requires Function type
    let current: Function | null = instance.constructor;

    while (current) {
        const typeName = (current as NativeClass).glibTypeName;

        if (typeName) {
            const result = lookup(typeName);
            if (result !== null) {
                return result;
            }
        }

        const prototype = Object.getPrototypeOf(current.prototype);
        current = prototype?.constructor ?? null;

        if (current === Object || current === Function) {
            break;
        }
    }

    return null;
};

export const resolvePropMeta = (instance: Container, key: string): [string | null, string] | null =>
    walkPrototypeChain(instance, (typeName) => PROPS[typeName]?.[key] ?? null);

export const resolveSignal = (instance: Container, signalName: string): boolean => {
    if (signalName === "notify") return true;
    return walkPrototypeChain(instance, (typeName) => (SIGNALS[typeName]?.has(signalName) ? true : null)) ?? false;
};

export const propNameToSignalName = (propName: string): string => {
    if (!propName.startsWith("on")) return propName;

    return propName
        .slice(2)
        .replace(/([A-Z])/g, "-$1")
        .toLowerCase()
        .replace(/^-/, "");
};

export const hasChanged = <T>(oldProps: T | null, newProps: T, key: keyof T): boolean =>
    !oldProps || oldProps[key] !== newProps[key];

export const shallowArrayEqual = <T extends Record<string, unknown>>(a: T[], b: T[]): boolean => {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
        const itemA = a[i];
        const itemB = b[i];
        if (!itemA || !itemB) return false;

        const keysA = Object.keys(itemA);
        const keysB = Object.keys(itemB);
        if (keysA.length !== keysB.length) return false;

        for (const key of keysA) {
            if (itemA[key] !== itemB[key]) return false;
        }
    }

    return true;
};

export const primitiveArrayEqual = <T extends string | number | boolean>(
    a: T[] | null | undefined,
    b: T[] | null | undefined,
): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }

    return true;
};

export function detachChild(child: Gtk.Widget, container: Gtk.Widget): void {
    if (isAppendable(container) || isAddable(container)) {
        if (isRemovable(container)) {
            container.remove(child);
        }
    } else if (isContentWidget(container)) {
        container.setContent(null);
    } else if (isSingleChild(container)) {
        container.setChild(null);
    } else if (isRemovable(container)) {
        container.remove(child);
    }
}

export function attachChild(child: Gtk.Widget, container: Gtk.Widget): void {
    if (isAppendable(container)) {
        container.append(child);
    } else if (isAddable(container)) {
        container.add(child);
    } else if (isContentWidget(container)) {
        container.setContent(child);
    } else if (isSingleChild(container)) {
        container.setChild(child);
    } else {
        throw new Error(`Cannot attach child to '${container.constructor.name}': container does not support children`);
    }
}
