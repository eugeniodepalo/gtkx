import { findObjectProperty, getInstanceGType, type NativeHandle } from "@gtkx/native";
import type { GType, ParamSpec } from "../generated/gobject/gobject.js";
import { Object as GObject, signalEmitv, signalParseName, Value } from "../generated/gobject/gobject.js";
import { getHandle } from "../handles.js";
import { alloc, call, read, t } from "../native.js";
import { getNativeObject } from "../registry.js";

declare module "../generated/gobject/gobject.js" {
    namespace Object {
        /**
         * Creates a new instance of a GObject subtype and sets its properties
         * using the provided arrays. Both arrays must have exactly the same
         * number of elements, and the names and values correspond by index.
         *
         * Construction parameters (see G_PARAM_CONSTRUCT, G_PARAM_CONSTRUCT_ONLY)
         * which are not explicitly specified are set to their default values.
         *
         * @param objectType - The GType of the object to instantiate
         * @param names - The names of each property to be set
         * @param values - The values of each property to be set
         * @returns A new instance of the specified type
         */
        function newWithProperties(objectType: GType, names: string[], values: Value[]): Object;
    }

    interface Object {
        /**
         * Disconnects a signal handler previously connected via
         * {@link Object.connect}, {@link Object.on}, or {@link Object.once}.
         *
         * @param handlerId - The handler ID returned by `connect`/`on`/`once`
         */
        disconnect(handlerId: number): void;

        /**
         * Connects a callback to a signal.
         *
         * Equivalent to {@link Object.connect}, but tracks the callback so it
         * can be later removed via {@link Object.off} without needing the
         * handler ID.
         *
         * @param sigName - The signal name
         * @param callback - The callback function
         * @param after - If true, run after the default handler
         * @returns A `NodeJS.EventEmitter` for chaining EventEmitter-style calls
         */
        // biome-ignore lint/suspicious/noExplicitAny: handler signature is per-signal
        on(sigName: string, callback: (...args: any[]) => any, after?: boolean): NodeJS.EventEmitter;

        /**
         * Like {@link Object.on}, but the handler is automatically disconnected
         * after the first emission.
         */
        // biome-ignore lint/suspicious/noExplicitAny: handler signature is per-signal
        once(sigName: string, callback: (...args: any[]) => any, after?: boolean): NodeJS.EventEmitter;

        /**
         * Disconnects a callback previously registered with
         * {@link Object.on} or {@link Object.once}.
         *
         * @param sigName - The signal name
         * @param callback - The exact callback reference passed to `on`/`once`
         * @returns A `NodeJS.EventEmitter` for chaining EventEmitter-style calls
         */
        // biome-ignore lint/suspicious/noExplicitAny: handler signature is per-signal
        off(sigName: string, callback: (...args: any[]) => any): NodeJS.EventEmitter;

        /**
         * Reads a property by name and returns it as a plain JavaScript value.
         *
         * The property's GType is resolved at runtime via the object's class,
         * a GValue is initialized with that type, populated by
         * `g_object_get_property`, and finally unmarshalled via {@link Value.toJS}.
         *
         * @param propertyName - The property name (kebab-case GIR name)
         * @throws if no property with that name exists on this object's class
         */
        getProperty(propertyName: string): unknown;

        /**
         * Sets a property by name from a plain JavaScript value.
         *
         * The property's GType is resolved at runtime via the object's class,
         * `value` is marshalled via {@link Value.fromJS}, and the resulting
         * GValue is dispatched to `g_object_set_property`.
         *
         * @param propertyName - The property name (kebab-case GIR name)
         * @param value - The JS value to set
         * @throws if no property with that name exists, or if the value cannot
         *   be marshalled to the property's GType
         */
        setProperty(propertyName: string, value: unknown): void;
    }
}

const LIB = "libgobject-2.0.so.0";
const GVALUE_SIZE = 24;

const GVALUE_BORROWED_TYPE = t.boxed("GValue", "borrowed", LIB, "g_value_get_type");
const GOBJECT_BORROWED = t.object("borrowed");

type ObjectStatic = {
    newWithProperties(objectType: GType, names: string[], values: Value[]): GObject;
};

const ObjectWithStatics = GObject as typeof GObject & ObjectStatic;

ObjectWithStatics.newWithProperties = (objectType: GType, names: string[], values: Value[]): GObject => {
    const ptr = call(
        LIB,
        "g_object_new_with_properties",
        [
            { type: t.uint64, value: objectType as unknown as number },
            { type: t.uint32, value: names.length },
            { type: t.sizedArray(t.string("borrowed"), 1), value: names },
            {
                type: t.array(GVALUE_BORROWED_TYPE, "sized", "borrowed", {
                    sizeParamIndex: 1,
                    elementSize: GVALUE_SIZE,
                }),
                value: values.map((v) => getHandle(v)),
            },
        ],
        GOBJECT_BORROWED,
    );
    return getNativeObject(ptr as NativeHandle) as unknown as GObject;
};

type Listener = (...args: unknown[]) => unknown;
const listenerTable = new WeakMap<GObject, Map<string, Map<Listener, number>>>();

const trackListener = (instance: GObject, signal: string, handler: Listener, handlerId: number): void => {
    let bySignal = listenerTable.get(instance);
    if (!bySignal) {
        bySignal = new Map();
        listenerTable.set(instance, bySignal);
    }
    let byHandler = bySignal.get(signal);
    if (!byHandler) {
        byHandler = new Map();
        bySignal.set(signal, byHandler);
    }
    byHandler.set(handler, handlerId);
};

const findHandlerId = (instance: GObject, signal: string, handler: Listener): number | undefined => {
    return listenerTable.get(instance)?.get(signal)?.get(handler);
};

const untrackListener = (instance: GObject, signal: string, handler: Listener): void => {
    const bySignal = listenerTable.get(instance);
    const byHandler = bySignal?.get(signal);
    byHandler?.delete(handler);
    if (byHandler?.size === 0) bySignal?.delete(signal);
};

GObject.prototype.disconnect = function disconnect(handlerId: number): void {
    call(
        LIB,
        "g_signal_handler_disconnect",
        [
            { type: GOBJECT_BORROWED, value: getHandle(this) },
            { type: t.uint64, value: handlerId },
        ],
        t.void,
    );
};

const onImpl = function (this: GObject, sigName: string, callback: Listener, after?: boolean): NodeJS.EventEmitter {
    const handlerId = (this as unknown as { connect(...args: unknown[]): number }).connect(sigName, callback, after);
    trackListener(this, sigName, callback, handlerId);
    return this as unknown as NodeJS.EventEmitter;
};
GObject.prototype.on = onImpl as unknown as GObject["on"];

const onceImpl = function (this: GObject, sigName: string, callback: Listener, after?: boolean): NodeJS.EventEmitter {
    let handlerId = 0;
    const wrapped: Listener = (...args: unknown[]) => {
        untrackListener(this, sigName, wrapped);
        untrackListener(this, sigName, callback);
        this.disconnect(handlerId);
        return callback(...args);
    };
    handlerId = (this as unknown as { connect(...args: unknown[]): number }).connect(sigName, wrapped, after);
    trackListener(this, sigName, wrapped, handlerId);
    trackListener(this, sigName, callback, handlerId);
    return this as unknown as NodeJS.EventEmitter;
};
GObject.prototype.once = onceImpl as unknown as GObject["once"];

const offImpl = function (this: GObject, sigName: string, callback: Listener): NodeJS.EventEmitter {
    const handlerId = findHandlerId(this, sigName, callback);
    if (handlerId !== undefined) {
        this.disconnect(handlerId);
        untrackListener(this, sigName, callback);
    }
    return this as unknown as NodeJS.EventEmitter;
};
GObject.prototype.off = offImpl as unknown as GObject["off"];

const GTYPE_SIZE = 8;
const SIGNAL_QUERY_SIZE = 56;
const SIGNAL_QUERY_N_PARAMS_OFFSET = 40;
const SIGNAL_QUERY_PARAM_TYPES_OFFSET = 48;

const emitImpl = function (this: GObject, sigName: string, ...args: unknown[]): void {
    const instanceGType = getInstanceGType(getHandle(this)) as unknown as GType;
    const [parsed, signalId, detail] = signalParseName(sigName, instanceGType, true);
    if (!parsed || signalId === 0) {
        throw new Error(`Unknown signal '${sigName}' on ${this.constructor.name || "GObject"}`);
    }

    const query = alloc(SIGNAL_QUERY_SIZE) as NativeHandle;
    call(
        LIB,
        "g_signal_query",
        [
            { type: t.uint32, value: signalId },
            { type: t.boxed("GSignalQuery", "borrowed"), value: query },
        ],
        t.void,
    );

    const paramValues: Value[] = [];
    const paramCount = read(query, t.uint32, SIGNAL_QUERY_N_PARAMS_OFFSET) as number;
    if (paramCount > 0) {
        const paramTypes = read(
            query,
            t.struct("GTypeArray", "borrowed", paramCount * GTYPE_SIZE),
            SIGNAL_QUERY_PARAM_TYPES_OFFSET,
        ) as NativeHandle;
        for (let i = 0; i < paramCount; i++) {
            const paramGType = read(paramTypes, t.uint64, i * GTYPE_SIZE) as unknown as GType;
            paramValues.push(Value.fromJS(paramGType, args[i]));
        }
    }

    signalEmitv([Value.newFromObject(this), ...paramValues], signalId, detail);
};
GObject.prototype.emit = emitImpl as unknown as GObject["emit"];

const resolvePropertyValueType = (obj: GObject, propertyName: string): GType => {
    const pspecHandle = findObjectProperty(getHandle(obj), propertyName);
    if (!pspecHandle) {
        const className = obj.constructor.name || "GObject";
        throw new Error(`No property '${propertyName}' on ${className}`);
    }
    return (getNativeObject(pspecHandle) as unknown as ParamSpec).getDefaultValue().getType();
};

GObject.prototype.getProperty = function getProperty(propertyName: string): unknown {
    const valueType = resolvePropertyValueType(this, propertyName);
    const gvalue = new Value();
    gvalue.init(valueType);
    call(
        LIB,
        "g_object_get_property",
        [
            { type: GOBJECT_BORROWED, value: getHandle(this) },
            { type: t.string("borrowed"), value: propertyName },
            { type: GVALUE_BORROWED_TYPE, value: getHandle(gvalue) },
        ],
        t.void,
    );
    return gvalue.toJS();
};

GObject.prototype.setProperty = function setProperty(propertyName: string, value: unknown): void {
    const valueType = resolvePropertyValueType(this, propertyName);
    const gvalue = Value.fromJS(valueType, value);
    call(
        LIB,
        "g_object_set_property",
        [
            { type: GOBJECT_BORROWED, value: getHandle(this) },
            { type: t.string("borrowed"), value: propertyName },
            { type: GVALUE_BORROWED_TYPE, value: getHandle(gvalue) },
        ],
        t.void,
    );
};
