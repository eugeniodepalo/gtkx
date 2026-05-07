import * as nativeBinding from "./native-binding.cjs";
import type {
    Arg,
    ArrayType,
    CallbackType,
    FfiValue,
    HashTableType,
    Ref,
    RefType,
    TrampolineType,
    Type,
} from "./types.js";

const native = nativeBinding as unknown as {
    alloc: (size: number, typeName?: string, lib?: string) => unknown;
    call: (library: string, symbol: string, args: unknown[], returnType: unknown) => unknown;
    findObjectProperty: (external: unknown, propertyName: string) => unknown;
    freeze: () => void;
    getInstanceTypeName: (external: unknown) => string | undefined;
    getNativeId: (external: unknown) => number;
    init: () => unknown;
    instanceIsA: (external: unknown, gtype: bigint) => boolean;
    read: (external: unknown, type: unknown, offset: number) => unknown;
    registerClass: (name: string, parentGtype: bigint) => bigint;
    stop: (mainLoop: unknown) => void;
    unfreeze: () => void;
    write: (external: unknown, type: unknown, offset: number, value: unknown) => unknown;
};

/**
 * Opaque handle wrapping a native pointer (GObject, Boxed, or Fundamental).
 *
 * Instances are produced by this module's exported functions; external code
 * should never construct one directly. Use `instanceof NativeHandle` for type
 * guards and the `id` accessor for object-identity comparisons.
 */
export class NativeHandle {
    /**
     * Opaque value owned by the native module. Stable across the lifetime of
     * the handle, but its concrete representation is an implementation detail.
     */
    readonly external: unknown;

    constructor(external: unknown) {
        this.external = external;
    }

    /**
     * Native pointer value as a number, suitable for object-identity
     * comparisons. Two handles referring to the same underlying instance
     * always return the same id.
     */
    get id(): number {
        return native.getNativeId(this.external);
    }
}

/**
 * Creates a mutable reference wrapper.
 *
 * Used for out-parameters in FFI calls where the native function
 * needs to write a value back.
 *
 * @typeParam T - The type of the referenced value
 * @param value - Initial value
 * @returns A reference object containing the value
 *
 * @example
 * ```tsx
 * const errorRef = createRef<GError | null>(null);
 * const result = someFunction(errorRef);
 * if (errorRef.value) {
 *   console.error(errorRef.value.message);
 * }
 * ```
 */
export function createRef<T>(value: T): Ref<T> {
    return { value } as Ref<T>;
}

/**
 * Type guard recognising handles produced by this module.
 *
 * @param value - Any JavaScript value
 * @returns `true` if `value` is a `NativeHandle` instance
 */
export function isNativeHandle(value: unknown): value is NativeHandle {
    return value instanceof NativeHandle;
}

function isHandleType(type: Type): boolean {
    return type.type === "gobject" || type.type === "boxed" || type.type === "struct" || type.type === "fundamental";
}

function unwrapValue(value: unknown, type: Type): unknown {
    if (value === null || value === undefined) return value;

    if (isHandleType(type)) {
        return value instanceof NativeHandle ? value.external : value;
    }

    switch (type.type) {
        case "array":
            return unwrapArray(value, type);
        case "hashtable":
            return unwrapHashTable(value, type);
        case "ref":
            return unwrapRefArg(value as Ref<unknown>, type);
        case "callback":
        case "trampoline":
            return wrapUserCallback(value, type);
        default:
            return value;
    }
}

function unwrapArray(value: unknown, type: ArrayType): unknown {
    if (!Array.isArray(value)) return value;
    return value.map((item) => unwrapValue(item, type.itemType));
}

function unwrapHashTable(value: unknown, type: HashTableType): unknown {
    if (!Array.isArray(value)) return value;
    return value.map((entry) => {
        if (!Array.isArray(entry) || entry.length !== 2) return entry;
        return [unwrapValue(entry[0], type.keyType), unwrapValue(entry[1], type.valueType)];
    });
}

function unwrapRefArg(ref: Ref<unknown>, type: RefType): Ref<unknown> {
    ref.value = unwrapValue(ref.value, type.innerType);
    return ref;
}

function wrapUserCallback(value: unknown, type: CallbackType | TrampolineType): unknown {
    if (typeof value !== "function") return value;
    const userCb = value as (...args: unknown[]) => unknown;
    const { argTypes, returnType } = type;
    return (...args: unknown[]) => {
        const wrappedArgs = args.map((arg, i) => wrapValue(arg, argTypes[i] ?? { type: "void" }));
        const result = userCb(...wrappedArgs);
        return unwrapValue(result, returnType);
    };
}

function wrapValue(value: unknown, type: Type): unknown {
    if (value === null || value === undefined) return value;

    if (isHandleType(type)) {
        return value instanceof NativeHandle ? value : new NativeHandle(value);
    }

    switch (type.type) {
        case "array":
            return Array.isArray(value) ? value.map((item) => wrapValue(item, type.itemType)) : value;
        case "hashtable":
            if (!Array.isArray(value)) return value;
            return value.map((entry) => {
                if (!Array.isArray(entry) || entry.length !== 2) return entry;
                return [wrapValue(entry[0], type.keyType), wrapValue(entry[1], type.valueType)];
            });
        default:
            return value;
    }
}

function rewrapRefArg(ref: Ref<unknown>, type: RefType): void {
    ref.value = wrapValue(ref.value, type.innerType);
}

/**
 * Makes a low-level FFI call to a native library.
 *
 * This is the core FFI mechanism. Most code should use the generated
 * bindings in `@gtkx/ffi` instead of calling this directly.
 *
 * @param library - Shared library name (e.g., "libgtk-4.so.1")
 * @param symbol - Function symbol name
 * @param args - Function arguments with type information
 * @param returnType - Expected return type
 * @returns The function return value
 */
export function call(library: string, symbol: string, args: Arg[], returnType: Type): FfiValue {
    const unwrapped = args.map((arg) => ({
        ...arg,
        value: unwrapValue(arg.value, arg.type),
    }));

    const result = native.call(library, symbol, unwrapped, returnType);

    for (const arg of args) {
        if (arg.type.type === "ref") {
            rewrapRefArg(arg.value as Ref<unknown>, arg.type);
        }
    }

    return wrapValue(result, returnType) as FfiValue;
}

/**
 * Spawns the dedicated `GLib` thread and starts a `glib::MainLoop` on it.
 *
 * Returns an opaque handle to the loop, which must be passed to {@link stop}
 * to terminate it. Most code should rely on `@gtkx/ffi`'s lifecycle wrapper
 * instead of calling this directly.
 *
 * @returns Native handle wrapping the spawned `GMainLoop`.
 */
export function init(): NativeHandle {
    return new NativeHandle(native.init());
}

/**
 * Quits the `GLib` main loop wrapped by `mainLoop`.
 *
 * Drains all pending finalizers before quitting so the spawned GLib thread
 * terminates cleanly. Most code should rely on `@gtkx/ffi`'s lifecycle wrapper
 * instead of calling this directly.
 *
 * @param mainLoop - Handle returned by {@link init}.
 */
export function stop(mainLoop: NativeHandle): void {
    native.stop(mainLoop.external);
}

/**
 * Reads a value from native memory.
 *
 * @param handle - Native handle pointing to the memory
 * @param type - Type of value to read
 * @param offset - Byte offset from the handle pointer
 * @returns The read value
 */
export function read(handle: NativeHandle, type: Type, offset: number): FfiValue {
    const result = native.read(handle.external, type, offset);
    return wrapValue(result, type) as FfiValue;
}

/**
 * Writes a value to native memory.
 *
 * @param handle - Native handle pointing to the memory
 * @param type - Type of value to write
 * @param offset - Byte offset from the handle pointer
 * @param value - Value to write
 */
export function write(handle: NativeHandle, type: Type, offset: number, value: unknown): void {
    native.write(handle.external, type, offset, unwrapValue(value, type));
}

/**
 * Allocates memory for a boxed type or plain struct.
 *
 * @param size - Size in bytes to allocate
 * @param glibTypeName - GLib type name for boxed types (optional for plain structs)
 * @param lib - Optional library containing the type
 * @returns Native handle to allocated memory
 */
export function alloc(size: number, glibTypeName?: string, lib?: string): NativeHandle {
    return new NativeHandle(native.alloc(size, glibTypeName, lib));
}

/**
 * Looks up a property descriptor on a `GObject` instance by property name.
 *
 * Walks the `GTypeInstance` → `GObjectClass` → `g_object_class_find_property`
 * chain entirely on the GLib thread, returning a borrowed `GParamSpec` handle
 * (or `null` if the property is unknown). The returned handle's pointer is
 * owned by the class vtable and remains valid for the lifetime of the type
 * registration.
 *
 * @param handle - Handle to a live `GObject` instance
 * @param propertyName - Property name in dashed form (e.g. `"label"`, `"halign"`)
 * @returns Borrowed `GParamSpec` handle, or `null` when no such property exists
 */
export function findObjectProperty(handle: NativeHandle, propertyName: string): NativeHandle | null {
    const result = native.findObjectProperty(handle.external, propertyName);
    return result == null ? null : new NativeHandle(result);
}

/**
 * Returns the runtime GType name of a `GTypeInstance`-compatible handle.
 *
 * Wraps `g_type_name_from_instance` on the GLib thread. Returns `null` when
 * the handle is null or the underlying type cannot be resolved.
 *
 * @param handle - Handle to a live GObject-compatible instance
 */
export function getInstanceTypeName(handle: NativeHandle): string | null {
    const result = native.getInstanceTypeName(handle.external);
    return result ?? null;
}

/**
 * Tests whether a `GTypeInstance`-compatible handle is an instance of `gtype`.
 *
 * Wraps `g_type_check_instance_is_a` on the GLib thread.
 *
 * @param handle - Handle to a live GObject-compatible instance
 * @param gtype - Numeric GType identifier
 */
export function instanceIsA(handle: NativeHandle, gtype: number): boolean {
    return native.instanceIsA(handle.external, BigInt(gtype));
}

/**
 * Registers a new `GType` derived from `parentGtype` under `name`.
 *
 * Wraps `g_type_register_static`, sizing the new class so it matches the
 * parent's class and instance struct sizes. No `class_init`, `instance_init`,
 * or value table is supplied. Higher-level orchestration (resolving the
 * parent class, walking JS prototypes, updating the JS class registry) lives
 * in `@gtkx/ffi`'s `registerClass`.
 *
 * @param name - Globally-unique GType name (must not already be registered)
 * @param parentGtype - Numeric GType of the parent class
 * @returns Numeric GType of the newly registered subclass
 */
export function registerClass(name: string, parentGtype: number): number {
    return Number(native.registerClass(name, BigInt(parentGtype)));
}

/**
 * Suspends GTK frame-clock dispatch while a batch of mutations is applied.
 *
 * Bracketed by [[unfreeze]] to release the GLib main loop. Calls nest: only
 * the outermost `freeze` / `unfreeze` pair starts and stops the freeze loop.
 *
 * @internal Used by `@gtkx/react` around React commits.
 */
export function freeze(): void {
    native.freeze();
}

/**
 * Resumes normal GTK frame-clock dispatch after a [[freeze]] block.
 *
 * @internal Used by `@gtkx/react` around React commits.
 */
export function unfreeze(): void {
    native.unfreeze();
}

export type { Arg, CallbackType, FfiValue, Ref, Type } from "./types.js";
