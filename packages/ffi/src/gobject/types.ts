import type { GType } from "../generated/gobject/aliases.js";
import { typeFromName } from "../generated/gobject/functions.js";

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
        invalidType ??= typeFromName("void");
        return invalidType;
    },
    get NONE(): GType {
        noneType ??= typeFromName("void");
        return noneType;
    },
    get INTERFACE(): GType {
        interfaceType ??= typeFromName("GInterface");
        return interfaceType;
    },
    get CHAR(): GType {
        charType ??= typeFromName("gchar");
        return charType;
    },
    get UCHAR(): GType {
        ucharType ??= typeFromName("guchar");
        return ucharType;
    },
    get BOOLEAN(): GType {
        booleanType ??= typeFromName("gboolean");
        return booleanType;
    },
    get INT(): GType {
        intType ??= typeFromName("gint");
        return intType;
    },
    get UINT(): GType {
        uintType ??= typeFromName("guint");
        return uintType;
    },
    get LONG(): GType {
        longType ??= typeFromName("glong");
        return longType;
    },
    get ULONG(): GType {
        ulongType ??= typeFromName("gulong");
        return ulongType;
    },
    get INT64(): GType {
        int64Type ??= typeFromName("gint64");
        return int64Type;
    },
    get UINT64(): GType {
        uint64Type ??= typeFromName("guint64");
        return uint64Type;
    },
    get ENUM(): GType {
        enumType ??= typeFromName("GEnum");
        return enumType;
    },
    get FLAGS(): GType {
        flagsType ??= typeFromName("GFlags");
        return flagsType;
    },
    get FLOAT(): GType {
        floatType ??= typeFromName("gfloat");
        return floatType;
    },
    get DOUBLE(): GType {
        doubleType ??= typeFromName("gdouble");
        return doubleType;
    },
    get STRING(): GType {
        stringType ??= typeFromName("gchararray");
        return stringType;
    },
    get POINTER(): GType {
        pointerType ??= typeFromName("gpointer");
        return pointerType;
    },
    get BOXED(): GType {
        boxedType ??= typeFromName("GBoxed");
        return boxedType;
    },
    get PARAM(): GType {
        paramType ??= typeFromName("GParam");
        return paramType;
    },
    get OBJECT(): GType {
        objectType ??= typeFromName("GObject");
        return objectType;
    },
    get VARIANT(): GType {
        variantType ??= typeFromName("GVariant");
        return variantType;
    },
};
