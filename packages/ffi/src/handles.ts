import type { NativeHandle } from "@gtkx/native";

export type { NativeHandle } from "@gtkx/native";

/**
 * Internal abstract base for hand-written `@gtkx/ffi` native wrappers such as
 * the cairo `Matrix`. Generated wrapper classes do not extend it — they emit
 * their own constructor that delegates to `constructNativeObject`. Also the
 * wrapper type threaded through the identity registry. Not exported from the
 * public `@gtkx/ffi` surface.
 *
 * @internal
 */
export abstract class NativeObject {
    /** Runtime GType of the underlying GObject or boxed instance. */
    __gtype__!: number;
}

/**
 * Constructor type for a generated native wrapper class. Used as the key type
 * of the construction-metadata registry and accepted by the wrapper-resolution
 * helpers (`getNativeObject`, `registerNativeClass`).
 */
export type NativeClass<T extends object = object> = (abstract new (
    ...args: never[]
) => T) & {
    readonly prototype: T;
};

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

/**
 * Registry of generated class-struct vtable descriptors, keyed by the JS class
 * they belong to. Populated by codegen at module load via {@link setClassStruct}
 * and consulted by `registerClass` to auto-discover vfunc overrides supplied
 * as plain methods on user subclasses.
 */
type ClassStructDescriptors = Readonly<Record<string, unknown>>;

const classStructMap = new WeakMap<object, ClassStructDescriptors>();

/**
 * Associates a class-struct vfunc registry with a generated class so that
 * `registerClass` can resolve vfunc overrides by method name on subclasses.
 *
 * @internal Module-private setter invoked once per generated class by the
 *     codegen-emitted bootstrap at the bottom of each namespace file.
 */
export function setClassStruct(cls: object, descriptors: ClassStructDescriptors): void {
    classStructMap.set(cls, descriptors);
}

/**
 * Resolves the class-struct vfunc descriptor map associated with `cls`, or
 * `undefined` when no descriptors have been registered for it.
 *
 * @internal
 */
export function getClassStruct(cls: object): ClassStructDescriptors | undefined {
    return classStructMap.get(cls);
}
