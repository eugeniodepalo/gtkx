import { type Type as FfiType, getInstanceGType, type NativeHandle } from "@gtkx/native";
import type { GObjectPropMeta } from "../construction-meta.js";
import type * as GLib from "../generated/glib/glib.js";
import type { Object as GObject, GType, ParamSpec } from "../generated/gobject/gobject.js";
import { typeFromName, typeFundamental, typeName, Value } from "../generated/gobject/gobject.js";
import { G_TYPE_INVALID, gtypeFromFfi } from "../gtype.js";
import { getHandle, type NativeObject } from "../handles.js";
import { call, t } from "../native.js";
import { Type } from "./types.js";

const GVALUE_ARG = t.boxed("GValue", "borrowed", "libgobject-2.0.so.0", "g_value_get_type");

const g_strv_get_type = t.fn("libgobject-2.0.so.0", "g_strv_get_type", [], t.uint64);

const g_value_set_boxed_strv = t.fn(
    "libgobject-2.0.so.0",
    "g_value_set_boxed",
    [{ type: GVALUE_ARG }, { type: t.array(t.string("borrowed")) }],
    t.void,
);

let cachedStrvGType: GType | undefined;

/** Resolves and caches the `GStrv` (`gchar**`) boxed `GType`. */
export function getStrvGType(): GType {
    cachedStrvGType ??= gtypeFromFfi(g_strv_get_type());
    return cachedStrvGType;
}

function initValue(gtype: GType, populate: (v: Value) => void): Value {
    const v = new Value();
    v.init(gtype);
    populate(v);
    return v;
}

/** Creates a `GValue` initialized with a boolean. */
export function newFromBoolean(value: boolean): Value {
    return initValue(Type.BOOLEAN, (v) => v.setBoolean(value));
}

/** Creates a `GValue` initialized with a signed 32-bit integer. */
export function newFromInt(value: number): Value {
    return initValue(Type.INT, (v) => v.setInt(value));
}

/** Creates a `GValue` initialized with an unsigned 32-bit integer. */
export function newFromUint(value: number): Value {
    return initValue(Type.UINT, (v) => v.setUint(value));
}

/** Creates a `GValue` initialized with a signed long integer. */
export function newFromLong(value: number): Value {
    return initValue(Type.LONG, (v) => v.setLong(value));
}

/** Creates a `GValue` initialized with an unsigned long integer. */
export function newFromUlong(value: number): Value {
    return initValue(Type.ULONG, (v) => v.setUlong(value));
}

/** Creates a `GValue` initialized with a signed 64-bit integer. */
export function newFromInt64(value: number): Value {
    return initValue(Type.INT64, (v) => v.setInt64(value));
}

/** Creates a `GValue` initialized with an unsigned 64-bit integer. */
export function newFromUint64(value: number): Value {
    return initValue(Type.UINT64, (v) => v.setUint64(value));
}

/** Creates a `GValue` initialized with a single-precision float. */
export function newFromFloat(value: number): Value {
    return initValue(Type.FLOAT, (v) => v.setFloat(value));
}

/** Creates a `GValue` initialized with a double-precision float. */
export function newFromDouble(value: number): Value {
    return initValue(Type.DOUBLE, (v) => v.setDouble(value));
}

/** Creates a `GValue` initialized with a string (or `null`). */
export function newFromString(value: string | null): Value {
    return initValue(Type.STRING, (v) => v.setString(value));
}

/** Creates a `GValue` initialized with a `GObject` (or `null`). */
export function newFromObject(value: GObject | null): Value {
    const v = new Value();
    if (value) {
        const gtype: GType = getInstanceGType(getHandle(value));
        v.init(gtype);
    } else {
        v.init(Type.OBJECT);
    }
    v.setObject(value);
    return v;
}

/** Creates a `GValue` initialized with a boxed value of the given `GType`. */
export function newFromBoxed(value: object, gtype: GType): Value {
    const glibTypeName = typeName(gtype);
    if (!glibTypeName) {
        throw new Error(`Cannot resolve type name for boxed gtype ${String(gtype)}`);
    }
    return initValue(gtype, (v) => {
        call(
            "libgobject-2.0.so.0",
            "g_value_set_boxed",
            [
                { type: GVALUE_ARG, value: getHandle(v) },
                {
                    type: t.boxed(glibTypeName, "borrowed", "libgobject-2.0.so.0"),
                    value: getHandle(value),
                    optional: true,
                },
            ],
            t.void,
        );
    });
}

/** Creates a `GValue` initialized with a `GStrv` from a JS string array. */
export function newFromStrv(value: string[]): Value {
    return initValue(getStrvGType(), (v) => g_value_set_boxed_strv(getHandle(v), value));
}

/** Creates a `GValue` initialized with a `GVariant`. */
export function newFromVariant(value: GLib.Variant): Value {
    return initValue(Type.VARIANT, (v) => v.setVariant(value));
}

/** Creates a `GValue` initialized with an enum payload of the given `GType`. */
export function newFromEnum(gtype: GType, value: number): Value {
    return initValue(gtype, (v) => v.setEnum(value));
}

/** Creates a `GValue` initialized with a flags payload of the given `GType`. */
export function newFromFlags(gtype: GType, value: number): Value {
    return initValue(gtype, (v) => v.setFlags(value));
}

function resolveBoxedGType(ffiType: FfiType): GType {
    if (ffiType.type === "boxed") {
        if (ffiType.getTypeFn && ffiType.library) {
            return gtypeFromFfi(call(ffiType.library, ffiType.getTypeFn, [], t.uint64));
        }
        const gtype = typeFromName(ffiType.innerType);
        if (gtype === G_TYPE_INVALID) {
            throw new Error(`Cannot resolve gtype for boxed type '${ffiType.innerType}'`);
        }
        return gtype;
    }
    if (ffiType.type === "fundamental") {
        if (ffiType.typeName) {
            const gtype = typeFromName(ffiType.typeName);
            if (gtype !== G_TYPE_INVALID) return gtype;
        }
        throw new Error(`Cannot resolve gtype for fundamental type without a typeName`);
    }
    throw new Error(`resolveBoxedGType: unsupported FFI type '${ffiType.type}'`);
}

/**
 * Builds a `GValue` from an FFI type descriptor and a JavaScript value,
 * dispatching on `ffiType.type`.
 */
export function newFrom(ffiType: FfiType, value: unknown): Value {
    switch (ffiType.type) {
        case "boolean":
            return newFromBoolean(value as boolean);

        case "string":
            return newFromString(value as string | null);

        case "enum": {
            const gtype = gtypeFromFfi(call(ffiType.library, ffiType.getTypeFn, [], t.uint64));
            const fundamental = typeFundamental(gtype);
            if (fundamental === Type.FLAGS) {
                return newFromFlags(gtype, value as number);
            }
            return newFromEnum(gtype, value as number);
        }

        case "flags": {
            const gtype = gtypeFromFfi(call(ffiType.library, ffiType.getTypeFn, [], t.uint64));
            return newFromFlags(gtype, value as number);
        }

        case "int8":
        case "int16":
        case "int32":
            return newFromInt(value as number);

        case "uint8":
        case "uint16":
        case "uint32":
            return newFromUint(value as number);

        case "int64":
            return newFromInt64(value as number);

        case "uint64":
            return newFromUint64(value as number);

        case "float32":
            return newFromFloat(value as number);

        case "float64":
            return newFromDouble(value as number);

        case "gobject":
            return newFromObject(value as GObject | null);

        case "boxed":
            return newFromBoxed(value as NativeObject, resolveBoxedGType(ffiType));

        case "array": {
            if (ffiType.itemType.type === "string" && ffiType.kind === "array") {
                return newFromStrv(value as string[]);
            }
            throw new Error(
                `Unsupported array type for GValue conversion: ${ffiType.kind} of ${ffiType.itemType.type}`,
            );
        }

        case "fundamental":
            if (ffiType.refFn === "g_variant_ref_sink") {
                return newFromVariant(value as GLib.Variant);
            }
            return newFromBoxed(value as NativeObject, resolveBoxedGType(ffiType));

        default:
            throw new Error(`Unsupported FFI type for GValue conversion: ${(ffiType as { type: string }).type}`);
    }
}

function newCharValue(gtype: GType, fundamental: GType, value: unknown): Value {
    const v = new Value();
    v.init(gtype);
    if (fundamental === Type.CHAR) v.setSchar(value as number);
    else v.setUchar(value as number);
    return v;
}

function newPointerValue(gtype: GType, value: unknown): Value {
    if (value !== null && value !== undefined) {
        throw new Error("G_TYPE_POINTER properties cannot be set from a non-null JS value");
    }
    const v = new Value();
    v.init(gtype);
    return v;
}

function newBoxedValue(gtype: GType, value: unknown): Value {
    if (value === null || value === undefined) {
        const v = new Value();
        v.init(gtype);
        return v;
    }
    return newFromBoxed(value as NativeObject, gtype);
}

function newStrvValue(gtype: GType, value: unknown): Value {
    if (value === null || value === undefined) {
        const v = new Value();
        v.init(gtype);
        return v;
    }
    return newFromStrv(value as string[]);
}

function valueFromFundamentalFactory(gtype: GType, fundamental: GType, value: unknown): Value | null {
    if (fundamental === Type.BOOLEAN) return newFromBoolean(value as boolean);
    if (fundamental === Type.INT) return newFromInt(value as number);
    if (fundamental === Type.UINT) return newFromUint(value as number);
    if (fundamental === Type.LONG) return newFromLong(value as number);
    if (fundamental === Type.ULONG) return newFromUlong(value as number);
    if (fundamental === Type.INT64) return newFromInt64(value as number);
    if (fundamental === Type.UINT64) return newFromUint64(value as number);
    if (fundamental === Type.FLOAT) return newFromFloat(value as number);
    if (fundamental === Type.DOUBLE) return newFromDouble(value as number);
    if (fundamental === Type.STRING) return newFromString(value as string | null);
    if (fundamental === Type.ENUM) return newFromEnum(gtype, value as number);
    if (fundamental === Type.FLAGS) return newFromFlags(gtype, value as number);
    if (fundamental === Type.OBJECT) return newFromObject(value as GObject | null);
    if (fundamental === Type.VARIANT) return newFromVariant(value as GLib.Variant);
    return null;
}

/**
 * Builds a `GValue` of the given `GType` from a JavaScript value, dispatching
 * on the type's fundamental.
 */
export function fromJS(gtype: GType, value: unknown): Value {
    if (gtype === getStrvGType()) return newStrvValue(gtype, value);

    const fundamental = typeFundamental(gtype);
    const fundamentalValue = valueFromFundamentalFactory(gtype, fundamental, value);
    if (fundamentalValue) return fundamentalValue;

    if (fundamental === Type.CHAR || fundamental === Type.UCHAR) {
        return newCharValue(gtype, fundamental, value);
    }

    if (fundamental === Type.PARAM) {
        const v = new Value();
        v.init(gtype);
        v.setParam(value as ParamSpec | null);
        return v;
    }

    if (fundamental === Type.POINTER) return newPointerValue(gtype, value);
    if (fundamental === Type.BOXED) return newBoxedValue(gtype, value);

    throw new Error(`Unsupported GType for Value.fromJS: ${typeName(gtype) ?? String(gtype)}`);
}

/**
 * Converts a JavaScript prop value into a `GValue` handle suitable for
 * `g_object_new_with_properties`, using the FFI type descriptor recorded in
 * the property's {@link GObjectPropMeta}.
 *
 * @internal Consumed by the GObject construction path in `../object.js`.
 */
export function gvalueFromProp(meta: GObjectPropMeta, value: unknown): NativeHandle {
    return getHandle(newFrom(meta.ffiType, value));
}
