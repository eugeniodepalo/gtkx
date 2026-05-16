/**
 * Runtime signal dispatch for generated FFI bindings.
 *
 * Generated classes register a per-class signal table via
 * {@link registerSignalMeta} and delegate their `connect` and `emit` methods
 * to {@link connectSignal} and {@link emitSignal}. This replaces the
 * per-class `switch`-case machinery — handler wrapping, trampoline
 * connection, and `GValue` marshalling — that codegen previously inlined
 * into every signal-bearing class.
 */

import type { Type } from "@gtkx/native";
import { getHandle, type NativeClass } from "./handles.js";
import { call, t } from "./helpers.js";

const LIB = "libgobject-2.0.so.0";

/** A user-supplied signal handler. */
export type SignalHandler = (...args: unknown[]) => unknown;

/**
 * Connect and emit metadata for a single signal, emitted by codegen.
 */
export type SignalDescriptor = {
    /** FFI trampoline descriptor passed to `g_signal_connect_data`. */
    readonly trampoline: Type;
    /**
     * Invokes the user handler with the marshalled trampoline arguments and
     * returns the value handed back to native code.
     *
     * The raw `args` carry the emitting instance first and the trampoline
     * user-data last; the closure selects and wraps the signal parameters.
     */
    readonly invoke: (handler: SignalHandler, args: readonly unknown[]) => unknown;
    /** FFI type of each emit-side `GValue`, in signal-parameter order. */
    readonly emitTypes: readonly Type[];
    /** Resolves the return-value `GValue` type, or `null` for void signals. */
    readonly returnGType: (() => unknown) | null;
};

/** A `GObject.Value` instance, narrowed to the surface {@link emitSignal} uses. */
export type SignalGValue = { init(gtype: unknown): void };

/** The `GObject` namespace surface that {@link emitSignal} marshals through. */
export type SignalGObject = {
    readonly Value: {
        new (): SignalGValue;
        newFrom(type: Type, value: unknown): SignalGValue;
    };
    signalLookup(name: string, gtype: unknown): number;
    signalEmitv(values: readonly SignalGValue[], signalId: number, detail: number, returnValue?: SignalGValue): void;
};

type SignalMeta = {
    readonly signals: ReadonlyMap<string, SignalDescriptor>;
    readonly getType: () => unknown;
    readonly gobject: SignalGObject;
};

const signalMetaByClass = new WeakMap<NativeClass, SignalMeta>();

/**
 * Registers the signal table for a generated class.
 *
 * Called once per signal-bearing class at module-load time.
 *
 * @param cls - The generated wrapper class
 * @param signals - Map of signal name to its connect/emit descriptor
 * @param getType - Resolves the class's runtime `GType`
 * @param gobject - The `GObject` namespace used for emit-side marshalling
 */
export function registerSignalMeta(
    cls: NativeClass,
    signals: ReadonlyMap<string, SignalDescriptor>,
    getType: () => unknown,
    gobject: SignalGObject,
): void {
    signalMetaByClass.set(cls, { signals, getType, gobject });
}

const connectClosureFallback = (
    instance: object,
    signal: string,
    handler: SignalHandler,
    after: boolean | undefined,
): number => {
    const wrappedHandler = (...args: unknown[]): unknown => handler(...args.slice(1));
    return call(
        LIB,
        "g_signal_connect_closure",
        [
            { type: t.object("borrowed"), value: getHandle(instance) },
            { type: t.string("borrowed"), value: signal },
            { type: t.callback([t.object("borrowed")], t.void), value: wrappedHandler },
            { type: t.boolean, value: after ?? false },
        ],
        t.uint64,
    ) as number;
};

/**
 * Runtime implementation of a generated class's `connect` method.
 *
 * Resolves the signal's {@link SignalDescriptor}, wraps the handler in a
 * trampoline, and dispatches `g_signal_connect_data`. Signals absent from the
 * class table fall through to `parentConnect`; when no parent is supplied
 * (the root `GObject.Object`), a generic closure connection is used so
 * arbitrary signal names still work.
 *
 * @param instance - The emitting object
 * @param cls - The class whose signal table to consult
 * @param signal - The signal name
 * @param handler - The user handler
 * @param after - When true, run after the default handler
 * @param parentConnect - The inherited `connect`, used for non-own signals
 * @returns The handler connection id
 */
export function connectSignal(
    instance: object,
    cls: NativeClass,
    signal: string,
    handler: SignalHandler,
    after: boolean | undefined,
    parentConnect?: (signal: string, handler: SignalHandler, after?: boolean) => number,
): number {
    const descriptor = signalMetaByClass.get(cls)?.signals.get(signal);
    if (!descriptor) {
        return parentConnect
            ? parentConnect(signal, handler, after)
            : connectClosureFallback(instance, signal, handler, after);
    }

    const wrappedHandler = (...args: unknown[]): unknown => descriptor.invoke(handler, args);
    return call(
        LIB,
        "g_signal_connect_data",
        [
            { type: t.object("borrowed"), value: getHandle(instance) },
            { type: t.string("borrowed"), value: signal },
            { type: descriptor.trampoline, value: wrappedHandler },
            { type: t.uint32, value: after ? 1 : 0 },
        ],
        t.uint64,
    ) as number;
}

/**
 * Runtime implementation of a generated class's `emit` method.
 *
 * Resolves the signal's {@link SignalDescriptor}, marshals `args` into
 * `GValue`s, and dispatches `g_signal_emitv`. Signals absent from the class
 * table fall through to `parentEmit`; when no parent is supplied (the root
 * `GObject.Object`) an unknown signal throws.
 *
 * @param instance - The emitting object
 * @param cls - The class whose signal table to consult
 * @param sigName - The signal name
 * @param args - The signal arguments
 * @param parentEmit - The inherited `emit`, used for non-own signals
 */
export function emitSignal(
    instance: object,
    cls: NativeClass,
    sigName: string,
    args: readonly unknown[],
    parentEmit?: (sigName: string, ...args: unknown[]) => void,
): void {
    const meta = signalMetaByClass.get(cls);
    const descriptor = meta?.signals.get(sigName);
    if (!meta || !descriptor) {
        if (parentEmit) {
            parentEmit(sigName, ...args);
            return;
        }
        throw new Error(`Unknown signal '${sigName}'`);
    }

    const { gobject } = meta;
    const values: SignalGValue[] = [gobject.Value.newFrom(t.object("full"), instance)];
    for (let i = 0; i < descriptor.emitTypes.length; i++) {
        const emitType = descriptor.emitTypes[i];
        if (emitType !== undefined) {
            values.push(gobject.Value.newFrom(emitType, args[i]));
        }
    }

    const signalId = gobject.signalLookup(sigName, meta.getType());
    if (descriptor.returnGType !== null) {
        const returnValue = new gobject.Value();
        returnValue.init(descriptor.returnGType());
        gobject.signalEmitv(values, signalId, 0, returnValue);
    } else {
        gobject.signalEmitv(values, signalId, 0);
    }
}
