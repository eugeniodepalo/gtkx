import { alloc, call, type NativeHandle, read, write } from "@gtkx/native";
import { CONSTRUCTION_META, type ConstructionMeta, type GObjectPropMeta } from "./construction-meta.js";
import type { GType } from "./generated/gobject/gobject.js";
import { gvalueFromProp } from "./gobject/gvalue.js";
import { type NativeClass, type NativeObject, setHandle } from "./handles.js";
import { t } from "./helpers.js";
import { getClassGType, registerNativeObject } from "./registry.js";

const GVALUE_BORROWED = t.boxed("GValue", "borrowed", "libgobject-2.0.so.0", "g_value_get_type");
const GVALUE_SIZE = 24;

/**
 * Performs the native allocation, handle binding, and identity registration
 * for a freshly-created wrapper instance. Generated class constructors call
 * this exactly once at construction time, threading the unmodified `props`
 * argument through. The construction strategy is selected via the
 * registered {@link ConstructionMeta} for the leaf class:
 *
 *   - `"gobject"`: dispatches `g_object_new_with_properties`, then registers
 *     the instance in the identity registry so future handles round-trip to
 *     the same JS wrapper.
 *   - `"boxed"`: dispatches `g_malloc0` and writes each provided field into
 *     the struct.
 *
 * @internal Module-private constructor helper invoked by generated bindings.
 */
export function constructNativeObject(instance: object, props: object = {}): void {
    const ctor = instance.constructor as NativeClass;
    const meta = CONSTRUCTION_META.get(ctor);
    if (!meta) {
        throw new Error(`Cannot construct ${ctor.name}: no construction metadata registered`);
    }
    if (typeof props === "function") {
        throw new TypeError(
            `Cannot construct ${ctor.name} with a function argument; pass an object of properties or call a static factory method (e.g. ${ctor.name}.new(...)).`,
        );
    }

    if (meta.kind === "gobject") {
        setHandle(instance, constructGObject(ctor, meta, props as Record<string, unknown>));
        registerNativeObject(instance as NativeObject);
    } else {
        setHandle(instance, constructBoxed(meta, props as Record<string, unknown>));
    }
    (instance as { __gtype__: GType }).__gtype__ = getClassGType(ctor);
}

/**
 * GObject construction: walk the class chain, merge inherited props, then
 * dispatch `g_object_new_with_properties`.
 */
function constructGObject(
    leafCtor: NativeClass,
    leafMeta: Extract<ConstructionMeta, { kind: "gobject" }>,
    props: Record<string, unknown>,
): NativeHandle {
    const names: string[] = [];
    const values: NativeHandle[] = [];
    const seen = new Set<string>();
    walkPropsForGObject(leafCtor, props, names, values, seen);

    const gtype = Number(leafMeta.gtype());
    return call(
        "libgobject-2.0.so.0",
        "g_object_new_with_properties",
        [
            { type: t.uint64, value: gtype, optional: false },
            { type: t.uint32, value: names.length, optional: false },
            {
                type: t.sizedArray(t.string("borrowed"), 1, "borrowed"),
                value: names,
                optional: false,
            },
            {
                type: t.array(GVALUE_BORROWED, "sized", "borrowed", { sizeParamIndex: 1, elementSize: GVALUE_SIZE }),
                value: values,
                optional: false,
            },
        ],
        t.object("full"),
    ) as NativeHandle;
}

function walkPropsForGObject(
    ctor: NativeClass | null,
    props: Record<string, unknown>,
    names: string[],
    values: NativeHandle[],
    seen: Set<string>,
): void {
    if (!ctor || ctor === (Function.prototype as unknown as NativeClass)) return;
    const meta = CONSTRUCTION_META.get(ctor);
    if (meta?.kind === "gobject") {
        collectGObjectProps(meta.props, props, names, values, seen);
    }
    const parent = Object.getPrototypeOf(ctor) as NativeClass | null;
    walkPropsForGObject(parent, props, names, values, seen);
}

function collectGObjectProps(
    propMap: Record<string, GObjectPropMeta>,
    props: Record<string, unknown>,
    names: string[],
    values: NativeHandle[],
    seen: Set<string>,
): void {
    for (const propKey of Object.keys(propMap)) {
        if (seen.has(propKey)) continue;
        seen.add(propKey);
        const value = props[propKey];
        if (value === undefined) continue;
        const meta = propMap[propKey];
        if (!meta) continue;
        names.push(meta.girName);
        values.push(gvalueFromProp(meta, value));
    }
}

/**
 * Boxed construction: `g_malloc0` then write each writable field declared
 * in the metadata whose key is present in `props`. Bitfield members are
 * merged into their storage unit via read-modify-write.
 */
function constructBoxed(
    meta: Extract<ConstructionMeta, { kind: "boxed" }>,
    props: Record<string, unknown>,
): NativeHandle {
    const handle = alloc(meta.size, meta.glibTypeName, meta.lib);
    for (const fieldName of Object.keys(meta.fields)) {
        const value = props[fieldName];
        if (value === undefined) continue;
        const field = meta.fields[fieldName];
        if (!field) continue;
        if (field.bitWidth === undefined) {
            write(handle, field.ffiType, field.offset, value);
            continue;
        }
        const mask = (1 << field.bitWidth) - 1;
        const bitOffset = field.bitOffset ?? 0;
        const unit = read(handle, field.ffiType, field.offset) as number;
        write(
            handle,
            field.ffiType,
            field.offset,
            ((unit & ~(mask << bitOffset)) | (((value as number) & mask) << bitOffset)) >>> 0,
        );
    }
    return handle;
}
