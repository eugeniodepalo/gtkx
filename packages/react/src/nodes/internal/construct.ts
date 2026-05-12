import type { Type } from "@gtkx/ffi";
import { Object as GObject, typeFromName, typeName, typeParent, Value } from "@gtkx/ffi/gobject";
import { CONSTRUCTION_META } from "../../generated/internal.js";
import type { Container, Props } from "../../types.js";

type ConstructionPropMeta = {
    girName: string;
    ffiType: Type;
    constructOnly?: true;
};

const chainCache = new Map<number, readonly string[]>();

function buildTypeNameChain(gtype: number): readonly string[] {
    const cached = chainCache.get(gtype);
    if (cached) return cached;

    const chain: string[] = [];
    let current = gtype;
    while (current !== 0) {
        const name = typeName(current);
        if (!name) break;
        chain.push(name);
        current = typeParent(current);
    }

    chainCache.set(gtype, chain);
    return chain;
}

function collectMetaPropsForType(
    meta: Record<string, ConstructionPropMeta>,
    props: Props,
    seen: Set<string>,
    result: Array<{ girName: string; ffiType: Type; value: unknown }>,
): void {
    for (const [camelName, propMeta] of Object.entries(meta)) {
        if (seen.has(camelName)) continue;
        seen.add(camelName);
        if (props[camelName] !== undefined) {
            result.push({
                girName: propMeta.girName,
                ffiType: propMeta.ffiType,
                value: props[camelName],
            });
        }
    }
}

function collectConstructionProps(
    typeNameChain: readonly string[],
    props: Props,
): Array<{ girName: string; ffiType: Type; value: unknown }> {
    const result: Array<{ girName: string; ffiType: Type; value: unknown }> = [];
    const seen = new Set<string>();

    for (const name of typeNameChain) {
        const meta: Record<string, ConstructionPropMeta> | undefined = CONSTRUCTION_META[name];
        if (meta) {
            collectMetaPropsForType(meta, props, seen, result);
        }
    }

    return result;
}

export function createContainerWithProperties(typeName: string, props: Props): Container {
    const gtype = typeFromName(typeName);
    if (gtype === 0) {
        throw new Error(`createContainerWithProperties: unknown GLib type '${typeName}'`);
    }
    const chain = buildTypeNameChain(gtype);
    const constructionProps = collectConstructionProps(chain, props);

    const names: string[] = [];
    const values: Value[] = [];

    for (const { girName, ffiType, value } of constructionProps) {
        names.push(girName);
        values.push(Value.newFrom(ffiType, value));
    }

    return GObject.newWithProperties(gtype, names, values) as unknown as Container;
}
