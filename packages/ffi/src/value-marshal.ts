/**
 * Internal `GValue` marshalling surface.
 *
 * Marshalling a JavaScript value into a `GObject.Value` — and unmarshalling
 * one back out — is a gtkx runtime concern with no node-gtk counterpart, so
 * these constructors and accessors live as module-level functions instead of
 * statics or instance methods on the `Value` class. Each one delegates to the
 * fundamental-keyed marshalling logic in `./gobject/gvalue.js`.
 *
 * @internal Consumed by gtkx packages through the `@gtkx/ffi/value-marshal`
 *   subpath; not part of the public GIR-namespace API.
 */

import type { Type as FfiType, NativeHandle } from "@gtkx/native";
import type * as GLib from "./generated/glib/glib.js";
import type { Object as GObject, GType, Value } from "./generated/gobject/gobject.js";
import { typeFundamental, typeName } from "./generated/gobject/gobject.js";
import {
    fromJS,
    getFundamentalMarshallers,
    getStrvGType,
    newFrom,
    newFromBoolean,
    newFromBoxed,
    newFromDouble,
    newFromEnum,
    newFromFlags,
    newFromFloat,
    newFromInt,
    newFromInt64,
    newFromLong,
    newFromObject,
    newFromString,
    newFromStrv,
    newFromUint,
    newFromUint64,
    newFromUlong,
    newFromVariant,
} from "./gobject/gvalue.js";
import { Type } from "./gobject/types.js";
import { GVALUE_BORROWED, gtypeFromFfi, LIBGOBJECT } from "./gtype.js";
import { getHandle } from "./handles.js";
import { call, type NativeClass, read, t } from "./native.js";
import { findNativeClass, getNativeObject } from "./registry.js";

/**
 * Creates a `GValue` initialized with a boolean.
 * @param value - The boolean value.
 */
export function valueFromBoolean(value: boolean): Value {
    return newFromBoolean(value);
}

/**
 * Creates a `GValue` initialized with a signed 32-bit integer.
 * @param value - The integer value.
 */
export function valueFromInt(value: number): Value {
    return newFromInt(value);
}

/**
 * Creates a `GValue` initialized with an unsigned 32-bit integer.
 * @param value - The unsigned integer value.
 */
export function valueFromUint(value: number): Value {
    return newFromUint(value);
}

/**
 * Creates a `GValue` initialized with a signed long integer.
 * @param value - The long value.
 */
export function valueFromLong(value: number): Value {
    return newFromLong(value);
}

/**
 * Creates a `GValue` initialized with an unsigned long integer.
 * @param value - The unsigned long value.
 */
export function valueFromUlong(value: number): Value {
    return newFromUlong(value);
}

/**
 * Creates a `GValue` initialized with a signed 64-bit integer.
 * @param value - The 64-bit integer value.
 */
export function valueFromInt64(value: number): Value {
    return newFromInt64(value);
}

/**
 * Creates a `GValue` initialized with an unsigned 64-bit integer.
 * @param value - The unsigned 64-bit integer value.
 */
export function valueFromUint64(value: number): Value {
    return newFromUint64(value);
}

/**
 * Creates a `GValue` initialized with a single-precision float.
 * @param value - The float value.
 */
export function valueFromFloat(value: number): Value {
    return newFromFloat(value);
}

/**
 * Creates a `GValue` initialized with a double-precision float.
 * @param value - The double value.
 */
export function valueFromDouble(value: number): Value {
    return newFromDouble(value);
}

/**
 * Creates a `GValue` initialized with a string.
 * @param value - The string value, or `null`.
 */
export function valueFromString(value: string | null): Value {
    return newFromString(value);
}

/**
 * Creates a `GValue` initialized with a `GObject` instance.
 *
 * The `GType` is derived from the object's runtime class.
 *
 * @param value - The `GObject` instance, or `null`.
 */
export function valueFromObject(value: GObject | null): Value {
    return newFromObject(value);
}

/**
 * Creates a `GValue` initialized with a boxed type instance.
 * @param value - The boxed type instance (e.g. `Gdk.RGBA`, `Graphene.Rect`).
 * @param gtype - The `GType` identifier of the boxed type.
 */
export function valueFromBoxed(value: object, gtype: GType): Value {
    return newFromBoxed(value, gtype);
}

/**
 * Creates a `GValue` initialized with a null-terminated string array (`GStrv`).
 * @param value - The string array.
 */
export function valueFromStrv(value: string[]): Value {
    return newFromStrv(value);
}

/**
 * Creates a `GValue` initialized with a `GVariant`.
 * @param value - The `GVariant` instance.
 */
export function valueFromVariant(value: GLib.Variant): Value {
    return newFromVariant(value);
}

/**
 * Creates a `GValue` initialized with an enum value.
 * @param gtype - The `GType` of the enum.
 * @param value - The enum value.
 */
export function valueFromEnum(gtype: GType, value: number): Value {
    return newFromEnum(gtype, value);
}

/**
 * Creates a `GValue` initialized with a flags value.
 * @param gtype - The `GType` of the flags.
 * @param value - The flags value (combinable with bitwise OR).
 */
export function valueFromFlags(gtype: GType, value: number): Value {
    return newFromFlags(gtype, value);
}

/**
 * Creates a `GValue` from an FFI type descriptor and a JavaScript value.
 *
 * Dispatches to the appropriate constructor based on the descriptor's type.
 *
 * @param ffiType - The FFI type descriptor.
 * @param value - The JS value to convert.
 */
export function valueFromFfi(ffiType: FfiType, value: unknown): Value {
    return newFrom(ffiType, value);
}

/**
 * Creates a `GValue` typed as `gtype` and marshals `value` into it.
 *
 * The runtime counterpart to {@link valueFromFfi}: where `valueFromFfi`
 * consumes a codegen-time FFI type descriptor, this consumes a runtime `GType`
 * integer (typically derived from a `GParamSpec` via
 * `valueGetType(pspec.getDefaultValue())`).
 *
 * @param gtype - The concrete `GType` (not necessarily the fundamental).
 * @param value - The JS value to marshal.
 * @throws on `G_TYPE_POINTER` with a non-null value, or unsupported `GType`s.
 */
export function valueFromJS(gtype: GType, value: unknown): Value {
    return fromJS(gtype, value);
}

const g_value_get_boxed_strv = t.fn(
    LIBGOBJECT,
    "g_value_get_boxed",
    [{ type: GVALUE_BORROWED }],
    t.array(t.string("borrowed")),
);

/**
 * Gets the `GType` of the value stored in a `GValue`.
 *
 * Equivalent to the C macro `G_VALUE_TYPE(value)`.
 *
 * @param value - The `GValue` to inspect.
 * @returns The `GType` identifier.
 */
export function valueGetType(value: Value): GType {
    return gtypeFromFfi(read(getHandle(value), t.uint64, 0));
}

/**
 * Gets the name of the `GType` stored in a `GValue`.
 *
 * Equivalent to `G_VALUE_TYPE_NAME(value)`.
 *
 * @param value - The `GValue` to inspect.
 * @returns The type name string, or `"invalid"` when unresolved.
 */
export function valueGetTypeName(value: Value): string {
    return typeName(valueGetType(value)) ?? "invalid";
}

/**
 * Checks whether a `GValue` holds a value of the specified `GType`.
 *
 * Equivalent to `G_VALUE_HOLDS(value, type)`.
 *
 * @param value - The `GValue` to inspect.
 * @param gtype - The `GType` to check against.
 * @returns `true` if the value holds the specified type.
 */
export function valueHolds(value: Value, gtype: GType): boolean {
    return valueGetType(value) === gtype;
}

/**
 * Gets an owned copy of the boxed value from a `G_TYPE_BOXED` derived `GValue`.
 *
 * @param value - The `GValue` holding the boxed instance.
 * @param targetType - The class constructor to wrap the result with.
 * @param targetGType - The `GType` identifier of the boxed type.
 * @returns An owned copy wrapped in the target type, or `null`.
 */
export function valueGetBoxed<T extends object>(
    value: Value,
    targetType: NativeClass<T>,
    targetGType: GType,
): T | null {
    const glibTypeName = typeName(targetGType);
    if (!glibTypeName) {
        throw new Error(`Cannot resolve type name for boxed gtype ${String(targetGType)}`);
    }
    const ptr = call(
        LIBGOBJECT,
        "g_value_dup_boxed",
        [{ type: GVALUE_BORROWED, value: getHandle(value) }],
        t.boxed(glibTypeName, "full", LIBGOBJECT),
    );
    if (ptr === null) return null;
    return getNativeObject(ptr as NativeHandle, targetType);
}

/**
 * Gets the contents of a `G_TYPE_STRV` (`gchar**`) `GValue` as a JS string
 * array. Returns an empty array if the underlying `GStrv` pointer is NULL.
 *
 * @param value - The `GValue` holding the string array.
 */
export function valueGetStrv(value: Value): string[] {
    return (g_value_get_boxed_strv(getHandle(value)) as string[] | null) ?? [];
}

const valueFromFundamental = (value: Value, fundamental: GType): unknown => {
    const marshaller = getFundamentalMarshallers().get(fundamental);
    return marshaller ? marshaller.from(value) : undefined;
};

const readPointerValue = (handle: NativeHandle): null => {
    const ptr = read(handle, t.uint64, 8) as number;
    if (ptr !== 0) {
        throw new Error("G_TYPE_POINTER non-null values cannot be marshalled to JS");
    }
    return null;
};

const readBoxedValue = (value: Value, gtype: GType): unknown => {
    const cls = findNativeClass(gtype, false);
    if (!cls) {
        const name = typeName(gtype) ?? `gtype ${String(gtype)}`;
        throw new Error(`No registered class for boxed GType '${name}'`);
    }
    return valueGetBoxed(value, cls, gtype);
};

/**
 * Unmarshals a `GValue` into a plain JavaScript value.
 *
 * Dispatches on `typeFundamental(valueGetType(value))`:
 * - Numeric/boolean fundamentals return their primitive JS form.
 * - STRING returns `string | null` (NULL strings are preserved as `null`).
 * - ENUM/FLAGS return the integer payload.
 * - OBJECT returns the wrapped GObject instance, or `null`.
 * - VARIANT returns the wrapped Variant instance, or `null`.
 * - PARAM returns the wrapped ParamSpec instance.
 * - BOXED with the GStrv concrete type returns `string[]`.
 * - BOXED with any other type resolves the wrapper class via the registry
 *   and returns the wrapped instance; throws if no class is registered.
 * - POINTER returns `null` for a null pointer; throws otherwise.
 *
 * @param value - The `GValue` to unmarshal.
 * @throws if the GValue holds an unsupported or unregistered type.
 */
export function valueToJS(value: Value): unknown {
    const gtype = valueGetType(value);

    if (gtype === getStrvGType()) return valueGetStrv(value);

    const fundamental = typeFundamental(gtype);
    const fundamentalValue = valueFromFundamental(value, fundamental);
    if (fundamentalValue !== undefined) return fundamentalValue;

    if (fundamental === Type.POINTER) return readPointerValue(getHandle(value));
    if (fundamental === Type.BOXED) return readBoxedValue(value, gtype);

    throw new Error(`Unsupported GType for valueToJS: ${typeName(gtype) ?? String(gtype)}`);
}
