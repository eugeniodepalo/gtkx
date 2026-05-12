import { getInstanceGType } from "@gtkx/ffi";
import { typeName, typeParent } from "@gtkx/ffi/gobject";
import { CONSTRUCTION_META, PROPS, SIGNALS } from "./generated/internal.js";
import type { Container } from "./types.js";

const typeNameChainCache = new Map<number, readonly string[]>();
const propMetaCache = new Map<number, Map<string, string | null>>();
const signalCache = new Map<number, Map<string, string | null>>();
const constructOnlyCache = new Map<number, Map<string, boolean>>();

const collectTypeNameChain = (gtype: number): readonly string[] => {
    const cached = typeNameChainCache.get(gtype);
    if (cached) return cached;

    const chain: string[] = [];
    let current = gtype;
    while (current !== 0) {
        const name = typeName(current);
        if (!name) break;
        chain.push(name);
        current = typeParent(current);
    }

    typeNameChainCache.set(gtype, chain);
    return chain;
};

const memoize = <T>(
    cache: Map<number, Map<string, T>>,
    instance: Container,
    key: string,
    compute: (typeNames: readonly string[]) => T,
): T => {
    const gtype = getInstanceGType(instance.handle);
    let perGtype = cache.get(gtype);
    if (!perGtype) {
        perGtype = new Map();
        cache.set(gtype, perGtype);
    }
    const cached = perGtype.get(key);
    if (cached !== undefined) return cached;
    const result = compute(collectTypeNameChain(gtype));
    perGtype.set(key, result);
    return result;
};

export const resolvePropMeta = (instance: Container, key: string): string | null =>
    memoize(propMetaCache, instance, key, (typeNames) => {
        for (const name of typeNames) {
            const result = PROPS[name]?.[key];
            if (result) return result;
        }
        return null;
    });

export const isConstructOnlyProp = (instance: Container, key: string): boolean =>
    memoize(constructOnlyCache, instance, key, (typeNames) => {
        for (const name of typeNames) {
            const meta = CONSTRUCTION_META[name];
            if (meta && key in meta) {
                return meta[key]?.constructOnly === true;
            }
        }
        return false;
    });

export const resolveSignal = (instance: Container, propName: string): string | null => {
    if (propName === "onNotify") return "notify";
    return memoize(signalCache, instance, propName, (typeNames) => {
        for (const name of typeNames) {
            const result = SIGNALS[name]?.[propName];
            if (result) return result;
        }
        return null;
    });
};
