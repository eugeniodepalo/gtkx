import { type Arg, call, type NativeHandle, registerNativeObject, setInstantiating, type Type } from "@gtkx/ffi";
import { typeFromName } from "@gtkx/ffi/gobject";
import { CONSTRUCT_ONLY_PROPS, CONSTRUCTOR_PROPS } from "../../generated/internal.js";
import type { Container, ContainerClass, Props } from "../../types.js";

type ConstructOnlyPropInfo = { girName: string; ffiType: Type };

/**
 * Collects construct-only property metadata by walking the class hierarchy.
 * Returns all active construct-only props (those with values set in the initial props)
 * that are NOT already handled by the designated constructor parameters.
 */
function collectActiveConstructOnlyProps(
    containerClass: ContainerClass,
    props: Props,
): Array<{ girName: string; ffiType: Type; value: unknown }> {
    const result: Array<{ girName: string; ffiType: Type; value: unknown }> = [];
    const constructorParams = new Set(CONSTRUCTOR_PROPS[containerClass.glibTypeName] ?? []);

    // biome-ignore lint/suspicious/noExplicitAny: Walking static prototype chain
    let current: any = containerClass;
    while (current?.glibTypeName) {
        const propsForType: Record<string, ConstructOnlyPropInfo> | undefined =
            CONSTRUCT_ONLY_PROPS[current.glibTypeName as string];
        if (propsForType) {
            for (const [camelName, meta] of Object.entries(propsForType)) {
                if (constructorParams.has(camelName)) continue;
                if (props[camelName] !== undefined) {
                    const rawValue = props[camelName];
                    const value =
                        meta.ffiType.type === "gobject" &&
                        rawValue &&
                        typeof rawValue === "object" &&
                        "handle" in rawValue
                            ? (rawValue as { handle: NativeHandle }).handle
                            : rawValue;
                    result.push({ girName: meta.girName, ffiType: meta.ffiType, value });
                }
            }
        }
        current = Object.getPrototypeOf(current);
    }

    return result;
}

/**
 * Creates a container (widget or controller) with construct-only properties.
 *
 * When construct-only props are present that aren't handled by the designated
 * constructor, uses `g_object_new` to set them during object construction.
 * Otherwise falls back to the normal constructor.
 */
export function createContainerWithConstructOnly(
    containerClass: ContainerClass,
    props: Props,
    normalConstructor: () => Container,
): Container {
    const constructOnlyArgs = collectActiveConstructOnlyProps(containerClass, props);

    if (constructOnlyArgs.length === 0) {
        return normalConstructor();
    }

    const typeName = containerClass.glibTypeName;
    const gtype = typeFromName(typeName);

    const args: Arg[] = [{ type: { type: "int", size: 64, unsigned: true }, value: gtype, optional: false }];

    for (const { girName, ffiType, value } of constructOnlyArgs) {
        args.push({ type: { type: "string", ownership: "borrowed" }, value: girName, optional: false });
        args.push({ type: ffiType, value, optional: false });
    }

    args.push({ type: { type: "null" }, value: null, optional: false });

    const handle = call("libgobject-2.0.so.0", "g_object_new", args, {
        type: "gobject",
        ownership: "full",
    }) as NativeHandle;

    setInstantiating(true);
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic instantiation with isInstantiating flag
    const instance = new (containerClass as any)() as Container & { handle: NativeHandle };
    setInstantiating(false);
    instance.handle = handle;
    registerNativeObject(instance);

    return instance;
}
