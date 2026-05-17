import type { Type as FfiType, NativeHandle } from "@gtkx/native";
import type * as GLib from "../generated/glib/glib.js";
import type { Object as GObject, GType } from "../generated/gobject/gobject.js";
import { typeFundamental, typeName, Value } from "../generated/gobject/gobject.js";
import { GVALUE_BORROWED, gtypeFromFfi, LIBGOBJECT } from "../gtype.js";
import { getHandle } from "../handles.js";
import { call, type NativeClass, read, t } from "../native.js";
import { findNativeClass, getNativeObject } from "../registry.js";
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
} from "./gvalue.js";
import { Type } from "./types.js";

const g_value_get_boxed_strv = t.fn(
    LIBGOBJECT,
    "g_value_get_boxed",
    [{ type: GVALUE_BORROWED }],
    t.array(t.string("borrowed")),
);

declare module "../generated/gobject/gobject.js" {
    interface Value {
        /**
         * Gets the Type of the value stored in this GValue.
         * This is equivalent to the C macro G_VALUE_TYPE(value).
         * @returns The Type identifier
         */
        getType(): GType;

        /**
         * Gets the name of the Type stored in this GValue.
         * This is equivalent to G_VALUE_TYPE_NAME(value).
         * @returns The type name string
         */
        getTypeName(): string;

        /**
         * Checks if this GValue holds a value of the specified Type.
         * This is equivalent to G_VALUE_HOLDS(value, type).
         * @param gtype - The Type to check against
         * @returns true if the value holds the specified type
         */
        holds(gtype: GType): boolean;

        /**
         * Gets an owned copy of the boxed value from a G_TYPE_BOXED derived GValue.
         * @param targetType - The class constructor to wrap the result with
         * @param targetGType - The GType identifier of the boxed type
         * @returns An owned copy of the boxed value wrapped in the target type, or null
         */
        getBoxed<T extends object>(targetType: NativeClass<T>, targetGType: GType): T | null;

        /**
         * Gets the contents of a G_TYPE_STRV (`gchar**`) GValue as a JS string array.
         * Returns an empty array if the underlying GStrv pointer is NULL.
         */
        getStrv(): string[];

        /**
         * Unmarshals this GValue into a plain JavaScript value.
         *
         * Dispatches on `typeFundamental(this.getType())`:
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
         * @throws if the GValue holds an unsupported or unregistered type.
         */
        toJS(): unknown;
    }

    namespace Value {
        /**
         * Creates a GValue initialized with a boolean.
         * @param value - The boolean value
         */
        function newFromBoolean(value: boolean): Value;
        /**
         * Creates a GValue initialized with a signed 32-bit integer.
         * @param value - The integer value
         */
        function newFromInt(value: number): Value;
        /**
         * Creates a GValue initialized with an unsigned 32-bit integer.
         * @param value - The unsigned integer value
         */
        function newFromUint(value: number): Value;
        /**
         * Creates a GValue initialized with a signed long integer.
         * @param value - The long value
         */
        function newFromLong(value: number): Value;
        /**
         * Creates a GValue initialized with an unsigned long integer.
         * @param value - The unsigned long value
         */
        function newFromUlong(value: number): Value;
        /**
         * Creates a GValue initialized with a signed 64-bit integer.
         * @param value - The 64-bit integer value
         */
        function newFromInt64(value: number): Value;
        /**
         * Creates a GValue initialized with an unsigned 64-bit integer.
         * @param value - The unsigned 64-bit integer value
         */
        function newFromUint64(value: number): Value;
        /**
         * Creates a GValue initialized with a 32-bit float.
         * @param value - The float value
         */
        function newFromFloat(value: number): Value;
        /**
         * Creates a GValue initialized with a 64-bit double.
         * @param value - The double value
         */
        function newFromDouble(value: number): Value;
        /**
         * Creates a GValue initialized with a string.
         * @param value - The string value, or null
         */
        function newFromString(value: string | null): Value;
        /**
         * Creates a GValue initialized with a GObject instance.
         * The GType is automatically determined from the object's runtime class.
         * @param value - The GObject instance, or null
         */
        function newFromObject(value: GObject | null): Value;
        /**
         * Creates a GValue initialized with a boxed type instance.
         * @param value - The boxed type instance (e.g., Gdk.RGBA, Graphene.Rect)
         * @param gtype - The GType identifier of the boxed type (use the type
         *     module's exported `*_get_type()` function)
         */
        function newFromBoxed(value: object, gtype: GType): Value;
        /**
         * Creates a GValue initialized with a null-terminated string array (GStrv).
         * @param value - The string array
         */
        function newFromStrv(value: string[]): Value;
        /**
         * Creates a GValue initialized with a GVariant.
         * @param value - The GVariant instance
         */
        function newFromVariant(value: GLib.Variant): Value;
        /**
         * Creates a GValue initialized with an enum value.
         * @param gtype - The GType of the enum
         * @param value - The enum value
         */
        function newFromEnum(gtype: GType, value: number): Value;
        /**
         * Creates a GValue initialized with a flags value.
         * @param gtype - The GType of the flags
         * @param value - The flags value (can be combined with bitwise OR)
         */
        function newFromFlags(gtype: GType, value: number): Value;
        /**
         * Creates a GValue from an FFI type descriptor and a JS value.
         * Dispatches to the appropriate `newFrom*` constructor based on the type.
         * @param ffiType - The FFI type descriptor
         * @param value - The JS value to convert
         */
        function newFrom(ffiType: FfiType, value: unknown): Value;

        /**
         * Creates a GValue typed as `gtype` and marshals `value` into it.
         *
         * The runtime counterpart to {@link Value.newFrom}: where `newFrom` consumes
         * a codegen-time FFI type descriptor, `fromJS` consumes a runtime GType
         * integer (typically derived from a GParamSpec via `pspec.getDefaultValue().getType()`).
         *
         * Dispatches on `typeFundamental(gtype)` and special-cases the GStrv concrete
         * GType so a JS `string[]` is marshalled before falling into the generic
         * boxed branch.
         *
         * @param gtype - The concrete GType (not necessarily the fundamental)
         * @param value - The JS value to marshal
         * @throws on G_TYPE_POINTER with a non-null value, or unsupported GTypes.
         */
        function fromJS(gtype: GType, value: unknown): Value;
    }
}

Value.prototype.getType = function (): GType {
    return gtypeFromFfi(read(getHandle(this), t.uint64, 0));
};

Value.prototype.getTypeName = function (): string {
    const gtype = this.getType();
    return typeName(gtype) ?? "invalid";
};

Value.prototype.holds = function (gtype: GType): boolean {
    return this.getType() === gtype;
};

Value.prototype.getBoxed = function getBoxed<T extends object>(
    this: Value,
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
        [{ type: GVALUE_BORROWED, value: getHandle(this) }],
        t.boxed(glibTypeName, "full", LIBGOBJECT),
    );
    if (ptr === null) return null;
    return getNativeObject(ptr as NativeHandle, targetType);
};

Value.prototype.getStrv = function (): string[] {
    return (g_value_get_boxed_strv(getHandle(this)) as string[] | null) ?? [];
};

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
    return value.getBoxed(cls, gtype);
};

Value.prototype.toJS = function (): unknown {
    const gtype = this.getType();

    if (gtype === getStrvGType()) return this.getStrv();

    const fundamental = typeFundamental(gtype);
    const fundamentalValue = valueFromFundamental(this, fundamental);
    if (fundamentalValue !== undefined) return fundamentalValue;

    if (fundamental === Type.POINTER) return readPointerValue(getHandle(this));
    if (fundamental === Type.BOXED) return readBoxedValue(this, gtype);

    throw new Error(`Unsupported GType for Value.toJS: ${typeName(gtype) ?? String(gtype)}`);
};

type ValueStatic = {
    newFromBoolean(value: boolean): Value;
    newFromInt(value: number): Value;
    newFromUint(value: number): Value;
    newFromLong(value: number): Value;
    newFromUlong(value: number): Value;
    newFromInt64(value: number): Value;
    newFromUint64(value: number): Value;
    newFromFloat(value: number): Value;
    newFromDouble(value: number): Value;
    newFromString(value: string | null): Value;
    newFromObject(value: GObject | null): Value;
    newFromBoxed(value: object, gtype: GType): Value;
    newFromStrv(value: string[]): Value;
    newFromVariant(value: GLib.Variant): Value;
    newFromEnum(gtype: GType, value: number): Value;
    newFromFlags(gtype: GType, value: number): Value;
    newFrom(ffiType: FfiType, value: unknown): Value;
    fromJS(gtype: GType, value: unknown): Value;
};

const ValueWithStatics = Value as typeof Value & ValueStatic;

ValueWithStatics.newFromBoolean = newFromBoolean;
ValueWithStatics.newFromInt = newFromInt;
ValueWithStatics.newFromUint = newFromUint;
ValueWithStatics.newFromLong = newFromLong;
ValueWithStatics.newFromUlong = newFromUlong;
ValueWithStatics.newFromInt64 = newFromInt64;
ValueWithStatics.newFromUint64 = newFromUint64;
ValueWithStatics.newFromFloat = newFromFloat;
ValueWithStatics.newFromDouble = newFromDouble;
ValueWithStatics.newFromString = newFromString;
ValueWithStatics.newFromObject = newFromObject;
ValueWithStatics.newFromBoxed = newFromBoxed;
ValueWithStatics.newFromStrv = newFromStrv;
ValueWithStatics.newFromVariant = newFromVariant;
ValueWithStatics.newFromEnum = newFromEnum;
ValueWithStatics.newFromFlags = newFromFlags;
ValueWithStatics.newFrom = newFrom;
ValueWithStatics.fromJS = fromJS;
