import type { GType } from "../generated/gobject/gobject.js";
import { typeFromName } from "../generated/gobject/gobject.js";

let invalidType: GType | undefined;
let noneType: GType | undefined;
let interfaceType: GType | undefined;
let charType: GType | undefined;
let ucharType: GType | undefined;
let booleanType: GType | undefined;
let intType: GType | undefined;
let uintType: GType | undefined;
let longType: GType | undefined;
let ulongType: GType | undefined;
let int64Type: GType | undefined;
let uint64Type: GType | undefined;
let enumType: GType | undefined;
let flagsType: GType | undefined;
let floatType: GType | undefined;
let doubleType: GType | undefined;
let stringType: GType | undefined;
let pointerType: GType | undefined;
let boxedType: GType | undefined;
let paramType: GType | undefined;
let objectType: GType | undefined;
let variantType: GType | undefined;

/**
 * Fundamental GLib type constants.
 *
 * Provides lazy-loaded GType identifiers for primitive and object types.
 * Use with {@link Value} factory methods that require explicit type specification.
 *
 * @example
 * ```ts
 * import { Type, Value } from "@gtkx/ffi/gobject";
 *
 * const enumValue = Value.newFromEnum(myEnumGType, 0);
 * console.log(Type.STRING); // GType for gchararray
 * ```
 */
export const Type = {
    get INVALID(): GType {
        invalidType ??= typeFromName("void") as unknown as GType;
        return invalidType;
    },
    get NONE(): GType {
        noneType ??= typeFromName("void") as unknown as GType;
        return noneType;
    },
    get INTERFACE(): GType {
        interfaceType ??= typeFromName("GInterface") as unknown as GType;
        return interfaceType;
    },
    get CHAR(): GType {
        charType ??= typeFromName("gchar") as unknown as GType;
        return charType;
    },
    get UCHAR(): GType {
        ucharType ??= typeFromName("guchar") as unknown as GType;
        return ucharType;
    },
    get BOOLEAN(): GType {
        booleanType ??= typeFromName("gboolean") as unknown as GType;
        return booleanType;
    },
    get INT(): GType {
        intType ??= typeFromName("gint") as unknown as GType;
        return intType;
    },
    get UINT(): GType {
        uintType ??= typeFromName("guint") as unknown as GType;
        return uintType;
    },
    get LONG(): GType {
        longType ??= typeFromName("glong") as unknown as GType;
        return longType;
    },
    get ULONG(): GType {
        ulongType ??= typeFromName("gulong") as unknown as GType;
        return ulongType;
    },
    get INT64(): GType {
        int64Type ??= typeFromName("gint64") as unknown as GType;
        return int64Type;
    },
    get UINT64(): GType {
        uint64Type ??= typeFromName("guint64") as unknown as GType;
        return uint64Type;
    },
    get ENUM(): GType {
        enumType ??= typeFromName("GEnum") as unknown as GType;
        return enumType;
    },
    get FLAGS(): GType {
        flagsType ??= typeFromName("GFlags") as unknown as GType;
        return flagsType;
    },
    get FLOAT(): GType {
        floatType ??= typeFromName("gfloat") as unknown as GType;
        return floatType;
    },
    get DOUBLE(): GType {
        doubleType ??= typeFromName("gdouble") as unknown as GType;
        return doubleType;
    },
    get STRING(): GType {
        stringType ??= typeFromName("gchararray") as unknown as GType;
        return stringType;
    },
    get POINTER(): GType {
        pointerType ??= typeFromName("gpointer") as unknown as GType;
        return pointerType;
    },
    get BOXED(): GType {
        boxedType ??= typeFromName("GBoxed") as unknown as GType;
        return boxedType;
    },
    get PARAM(): GType {
        paramType ??= typeFromName("GParam") as unknown as GType;
        return paramType;
    },
    get OBJECT(): GType {
        objectType ??= typeFromName("GObject") as unknown as GType;
        return objectType;
    },
    get VARIANT(): GType {
        variantType ??= typeFromName("GVariant") as unknown as GType;
        return variantType;
    },
};
