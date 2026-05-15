import { alloc, call, type NativeHandle, write } from "@gtkx/native";
import { CONSTRUCTION_META, type ConstructionMeta, type GObjectPropMeta } from "./construction-meta.js";
import { t } from "./helpers.js";

export type { NativeHandle } from "@gtkx/native";

const GVALUE_BORROWED = t.boxed("GValue", "borrowed", "libgobject-2.0.so.0", "g_value_get_type");
const GVALUE_SIZE = 24;

/**
 * Base class used internally by `@gtkx/ffi` for every native wrapper.
 *
 * Generated classes no longer extend this class directly — they emit their
 * own constructor that delegates to {@link constructNativeObject}. The class
 * is retained for hand-written wrappers (e.g. the cairo `Matrix` helpers)
 * and for type bounds inside `@gtkx/ffi`. It is intentionally not exported
 * from the public `@gtkx/ffi` surface.
 *
 * @internal
 */
export abstract class NativeObject {
    /** Runtime GType of the underlying GObject or boxed instance. */
    __gtype__!: number;

    constructor(props: object = {}) {
        constructNativeObject(this, props);
    }
}

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
        registerInstance(instance as NativeObject);
    } else {
        setHandle(instance, constructBoxed(meta, props as Record<string, unknown>));
    }
    (instance as { __gtype__: number }).__gtype__ = classGTypeLookup(ctor);
}

const handleMap = new WeakMap<object, NativeHandle>();

/**
 * Returns the native handle associated with `obj`. Throws when the object
 * has not been linked to a handle.
 *
 * @internal Module-private accessor used by `@gtkx/ffi` and its generated
 *     bindings to retrieve the opaque native pointer of a wrapped instance.
 *     End consumers should never call this — it is not part of the public
 *     `@gtkx/ffi` surface.
 */
export function getHandle(obj: object): NativeHandle {
    const handle = handleMap.get(obj);
    if (handle === undefined) {
        const name = (obj as { constructor?: { name?: string } }).constructor?.name ?? "object";
        throw new Error(`No native handle associated with ${name}`);
    }
    return handle;
}

/**
 * Returns the native handle associated with `obj`, or `undefined` when the
 * object is nullish or has not been linked to a handle. Use this when a
 * caller cannot guarantee that the object has been fully constructed.
 *
 * @internal Module-private accessor.
 */
export function tryGetHandle(obj: object | null | undefined): NativeHandle | undefined {
    return obj == null ? undefined : handleMap.get(obj);
}

/**
 * Associates a native handle with `obj`.
 *
 * @internal Module-private setter used by construction and `wrapHandle`.
 */
export function setHandle(obj: object, handle: NativeHandle): void {
    handleMap.set(obj, handle);
}

type InstanceRegistrar = (obj: NativeObject) => void;

let registerInstance: InstanceRegistrar = () => {};

/**
 * Installs the callback invoked from {@link NativeObject}'s GObject branch to
 * register the newly constructed instance in the identity registry.
 *
 * Called once by `./registry.js` at module load. Exposed only so the FFI
 * bootstrap can wire its layers together without creating an import cycle
 * between `object.ts` and `registry.ts`.
 *
 * @internal
 */
export function setInstanceRegistrar(registrar: InstanceRegistrar): void {
    registerInstance = registrar;
}

type ClassGTypeLookup = (cls: NativeClass) => number;

let classGTypeLookup: ClassGTypeLookup = () => 0;

/**
 * Installs the lookup that resolves a registered class's GLib type identifier.
 *
 * Called once by `./registry.js` at module load. Exposed only so the FFI
 * bootstrap can wire its layers together without creating an import cycle
 * between `object.ts` and `registry.ts`.
 *
 * @internal
 */
export function setClassGTypeLookup(lookup: ClassGTypeLookup): void {
    classGTypeLookup = lookup;
}

/**
 * Constructor type for a generated wrapper class.
 *
 * @internal
 */
// biome-ignore lint/suspicious/noExplicitAny: constructor parameters must be bivariant to accept arbitrary subclass shapes.
export type NativeClass<T extends object = object> = (abstract new (
    ...args: any[]
) => T) & {
    readonly prototype: T;
};

/**
 * Wraps an existing native handle as an instance of `cls` without invoking
 * the allocator.
 *
 * Used by the identity registry and signal-callback marshalling to lift
 * raw pointers received from the native layer into typed JavaScript
 * wrappers. The returned instance bypasses the constructor entirely,
 * leaving prototype-defined methods and accessors in place but skipping
 * any allocation or property initialisation.
 *
 * @param cls - Target wrapper class
 * @param handle - Native handle to wrap
 */
export function wrapHandle<T extends object>(cls: NativeClass<T>, handle: NativeHandle): T {
    const instance = Object.create(cls.prototype) as T;
    setHandle(instance, handle);
    (instance as { __gtype__: number }).__gtype__ = classGTypeLookup(cls);
    return instance;
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
        const gvalue = createGValueForProp(meta, value);
        names.push(meta.girName);
        values.push(gvalue);
    }
}

function createGValueForProp(meta: GObjectPropMeta, value: unknown): NativeHandle {
    return valueFactory(meta, value);
}

type ValueFactory = (meta: GObjectPropMeta, value: unknown) => NativeHandle;

let valueFactory: ValueFactory = () => {
    throw new Error("Value factory not registered; import @gtkx/ffi to initialise the GObject layer");
};

/**
 * Installs the factory that converts a JavaScript prop value into a
 * `GValue` handle suitable for `g_object_new_with_properties`.
 *
 * Called once by `@gtkx/ffi/gobject/value` at module load. Exposed only so
 * the FFI bootstrap can wire its layers together without import cycles.
 *
 * @internal
 */
export function setValueFactory(factory: ValueFactory): void {
    valueFactory = factory;
}

/**
 * Boxed construction: `g_malloc0` then write each writable field declared
 * in the metadata whose key is present in `props`.
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
        write(handle, field.ffiType, field.offset, value);
    }
    return handle;
}
