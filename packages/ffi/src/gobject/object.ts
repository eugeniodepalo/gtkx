import type { NativeHandle } from "@gtkx/native";
import { Object as GObject } from "../generated/gobject/object.js";
import type { Value } from "../generated/gobject/value.js";
import { call } from "../native.js";
import { getNativeObject } from "../registry.js";

declare module "../generated/gobject/object.js" {
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
        // biome-ignore lint/complexity/noBannedTypes: Refers to GObject.Object class, not global Object
        function newWithProperties(objectType: number, names: string[], values: Value[]): Object;
    }
}

const LIB = "libgobject-2.0.so.0";
const GVALUE_SIZE = 24;

type ObjectStatic = {
    newWithProperties(objectType: number, names: string[], values: Value[]): GObject;
};

const ObjectWithStatics = GObject as typeof GObject & ObjectStatic;

ObjectWithStatics.newWithProperties = (objectType: number, names: string[], values: Value[]): GObject => {
    const ptr = call(
        LIB,
        "g_object_new_with_properties",
        [
            {
                type: { type: "int", size: 64, unsigned: true },
                value: objectType,
            },
            {
                type: { type: "int", size: 32, unsigned: true },
                value: names.length,
            },
            {
                type: {
                    type: "array",
                    itemType: { type: "string", ownership: "borrowed" },
                    kind: "sized",
                    sizeParamIndex: 1,
                    ownership: "borrowed",
                },
                value: names,
            },
            {
                type: {
                    type: "array",
                    itemType: {
                        type: "boxed",
                        ownership: "borrowed",
                        innerType: "GValue",
                        library: LIB,
                        getTypeFn: "g_value_get_type",
                    },
                    kind: "sized",
                    sizeParamIndex: 1,
                    elementSize: GVALUE_SIZE,
                    ownership: "borrowed",
                },
                value: values.map((v) => v.handle),
            },
        ],
        { type: "gobject", ownership: "borrowed" },
    );
    return getNativeObject(ptr as NativeHandle) as GObject;
};
