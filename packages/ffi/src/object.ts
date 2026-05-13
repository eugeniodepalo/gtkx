import { alloc, call, type NativeHandle, write } from "@gtkx/native";
import { CONSTRUCTION_META, type ConstructionMeta, type GObjectPropMeta } from "./construction-meta.js";
import { t } from "./helpers.js";

export type { NativeHandle } from "@gtkx/native";

const GVALUE_BORROWED = t.boxed("GValue", "borrowed", "libgobject-2.0.so.0", "g_value_get_type");
const GVALUE_SIZE = 24;

/**
 * Base class for every native object exposed by `@gtkx/ffi`.
 *
 * Holds the opaque {@link NativeHandle} pointing at the underlying GObject,
 * boxed struct, or fundamental value. Construction is uniform across all
 * subclasses: callers pass a `props` object keyed by the snake_case
 * `ConstructorProperties` names from the ts-for-gir-published `.d.ts`
 * contract, and the constructor walks the JS prototype chain reading
 * registered {@link ConstructionMeta} from `CONSTRUCTION_META` to perform
 * the appropriate native allocation (`g_object_new_with_properties` for
 * GObjects, `g_malloc0` plus field writes for boxed types). The handle is
 * assigned in-place on `this`; no subclass should reassign it.
 *
 * Use {@link wrapHandle} (re-exported from `@gtkx/ffi`) to wrap a handle
 * produced elsewhere (returned from an FFI call, received over a signal)
 * without invoking the native allocator a second time.
 */
export abstract class NativeObject {
    handle!: NativeHandle;

    constructor(props: object = {}) {
        const ctor = this.constructor as NativeClass;
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
            this.handle = constructGObject(ctor, meta, props as Record<string, unknown>);
            registerInstance(this);
        } else {
            this.handle = constructBoxed(meta, props as Record<string, unknown>);
        }
    }
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

/**
 * Constructor type for a {@link NativeObject} subclass.
 */
export type NativeClass<T extends NativeObject = NativeObject> = (abstract new (
    // biome-ignore lint/suspicious/noExplicitAny: constructor parameters must be bivariant to accept arbitrary subclass shapes.
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
export function wrapHandle<T extends NativeObject>(cls: NativeClass<T>, handle: NativeHandle): T {
    const instance = Object.create(cls.prototype) as T;
    instance.handle = handle;
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
    for (const camelName of Object.keys(propMap)) {
        if (seen.has(camelName)) continue;
        seen.add(camelName);
        const value = props[camelName];
        if (value === undefined) continue;
        const meta = propMap[camelName];
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
