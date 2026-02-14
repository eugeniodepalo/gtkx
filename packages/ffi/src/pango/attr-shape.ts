import type { NativeHandle } from "@gtkx/native";
import { AttrShape } from "../generated/pango/attr-shape.js";
import { Attribute } from "../generated/pango/attribute.js";
import type { Rectangle } from "../generated/pango/rectangle.js";
import { call, read } from "../native.js";
import { getNativeObject } from "../registry.js";

const LIB = "libpango-1.0.so.0";

const STRUCT_BORROWED = {
    type: "struct",
    ownership: "borrowed",
    innerType: "Rectangle",
} as const;

const NULL_PTR = {
    type: { type: "int", size: 64, unsigned: true } as const,
    value: 0,
};

const ATTR_RETURN = {
    type: "fundamental",
    ownership: "full",
    library: LIB,
    refFn: "pango_attribute_copy",
    unrefFn: "pango_attribute_destroy",
} as const;

const PTR_TYPE = { type: "int", size: 64, unsigned: true } as const;

declare module "../generated/pango/attr-shape.js" {
    interface AttrShape {
        getData(): number;
    }
}

export function attrShapeNewWithData(inkRect: Rectangle, logicalRect: Rectangle, data: number): Attribute {
    const ptr = call(
        LIB,
        "pango_attr_shape_new_with_data",
        [
            { type: STRUCT_BORROWED, value: inkRect.handle },
            { type: STRUCT_BORROWED, value: logicalRect.handle },
            { type: PTR_TYPE, value: data },
            NULL_PTR,
            NULL_PTR,
        ],
        ATTR_RETURN,
    );
    return getNativeObject(ptr as NativeHandle, Attribute);
}

AttrShape.prototype.getData = function (): number {
    return read(this.handle, PTR_TYPE, 48) as number;
};
