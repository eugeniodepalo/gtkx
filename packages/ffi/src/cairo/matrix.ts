import { createRef, type NativeHandle } from "@gtkx/native";
import { registerConstructionMeta } from "../construction-meta.js";
import type { Status } from "../generated/cairo/cairo.js";
import { getHandle, NativeObject } from "../handles.js";
import { alloc, read, t } from "../native.js";
import { wrapHandle } from "../registry.js";
import { DOUBLE_REF, DOUBLE_TYPE, INT_TYPE, LIB, MATRIX_T } from "./common.js";

const { fn } = t;

declare module "../generated/cairo/cairo.js" {
    interface Matrix {
        xx: number;
        yx: number;
        xy: number;
        yy: number;
        x0: number;
        y0: number;
        translate(tx: number, ty: number): void;
        scale(sx: number, sy: number): void;
        rotate(radians: number): void;
        invert(): Status;
        multiply(other: Matrix): Matrix;
        transformPoint(x: number, y: number): [number, number];
        transformDistance(dx: number, dy: number): [number, number];
    }
}

export const allocMatrix = (): { handle: NativeHandle; obj: Matrix } => {
    const handle = alloc(48, "cairo_matrix_t", LIB);
    const obj = wrapHandle(Matrix, handle);
    return { handle, obj };
};

const cairo_matrix_translate = fn(
    LIB,
    "cairo_matrix_translate",
    [{ type: MATRIX_T }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }],
    t.void,
);
const cairo_matrix_scale = fn(
    LIB,
    "cairo_matrix_scale",
    [{ type: MATRIX_T }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }],
    t.void,
);
const cairo_matrix_rotate = fn(LIB, "cairo_matrix_rotate", [{ type: MATRIX_T }, { type: DOUBLE_TYPE }], t.void);
const cairo_matrix_invert = fn(LIB, "cairo_matrix_invert", [{ type: MATRIX_T }], INT_TYPE);
const cairo_matrix_multiply = fn(
    LIB,
    "cairo_matrix_multiply",
    [{ type: MATRIX_T }, { type: MATRIX_T }, { type: MATRIX_T }],
    t.void,
);
const cairo_matrix_transform_point = fn(
    LIB,
    "cairo_matrix_transform_point",
    [{ type: MATRIX_T }, { type: DOUBLE_REF }, { type: DOUBLE_REF }],
    t.void,
);
const cairo_matrix_transform_distance = fn(
    LIB,
    "cairo_matrix_transform_distance",
    [{ type: MATRIX_T }, { type: DOUBLE_REF }, { type: DOUBLE_REF }],
    t.void,
);
const cairo_matrix_init = fn(
    LIB,
    "cairo_matrix_init",
    [
        { type: MATRIX_T },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
    ],
    t.void,
);
const cairo_matrix_init_translate = fn(
    LIB,
    "cairo_matrix_init_translate",
    [{ type: MATRIX_T }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }],
    t.void,
);
const cairo_matrix_init_scale = fn(
    LIB,
    "cairo_matrix_init_scale",
    [{ type: MATRIX_T }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }],
    t.void,
);
const cairo_matrix_init_rotate = fn(
    LIB,
    "cairo_matrix_init_rotate",
    [{ type: MATRIX_T }, { type: DOUBLE_TYPE }],
    t.void,
);

/**
 * Cairo affine transformation matrix backed by the `cairo_matrix_t` C struct.
 *
 * The struct is treated as an opaque 48-byte block accessed through cairo's
 * own functions and direct field reads. The TypeScript getters and instance
 * methods on the prototype expose the canonical cairo_matrix_t API.
 */
export class Matrix extends NativeObject {
    get xx(): number {
        return read(getHandle(this), DOUBLE_TYPE, 0) as number;
    }

    get yx(): number {
        return read(getHandle(this), DOUBLE_TYPE, 8) as number;
    }

    get xy(): number {
        return read(getHandle(this), DOUBLE_TYPE, 16) as number;
    }

    get yy(): number {
        return read(getHandle(this), DOUBLE_TYPE, 24) as number;
    }

    get x0(): number {
        return read(getHandle(this), DOUBLE_TYPE, 32) as number;
    }

    get y0(): number {
        return read(getHandle(this), DOUBLE_TYPE, 40) as number;
    }

    translate(tx: number, ty: number): void {
        cairo_matrix_translate(getHandle(this), tx, ty);
    }

    scale(sx: number, sy: number): void {
        cairo_matrix_scale(getHandle(this), sx, sy);
    }

    rotate(radians: number): void {
        cairo_matrix_rotate(getHandle(this), radians);
    }

    invert(): Status {
        return cairo_matrix_invert(getHandle(this)) as Status;
    }

    multiply(other: Matrix): Matrix {
        const { handle, obj } = allocMatrix();
        cairo_matrix_multiply(handle, getHandle(this), getHandle(other));
        return obj;
    }

    transformPoint(x: number, y: number): [number, number] {
        const xRef = createRef(x);
        const yRef = createRef(y);
        cairo_matrix_transform_point(getHandle(this), xRef, yRef);
        return [xRef.value, yRef.value];
    }

    transformDistance(dx: number, dy: number): [number, number] {
        const dxRef = createRef(dx);
        const dyRef = createRef(dy);
        cairo_matrix_transform_distance(getHandle(this), dxRef, dyRef);
        return [dxRef.value, dyRef.value];
    }

    /**
     * Allocates a matrix and initialises it from explicit affine values.
     */
    static init(xx: number, yx: number, xy: number, yy: number, x0: number, y0: number): Matrix {
        const { handle, obj } = allocMatrix();
        cairo_matrix_init(handle, xx, yx, xy, yy, x0, y0);
        return obj;
    }

    static createTranslate(tx: number, ty: number): Matrix {
        const { handle, obj } = allocMatrix();
        cairo_matrix_init_translate(handle, tx, ty);
        return obj;
    }

    static createScale(sx: number, sy: number): Matrix {
        const { handle, obj } = allocMatrix();
        cairo_matrix_init_scale(handle, sx, sy);
        return obj;
    }

    static createRotate(radians: number): Matrix {
        const { handle, obj } = allocMatrix();
        cairo_matrix_init_rotate(handle, radians);
        return obj;
    }
}

registerConstructionMeta(Matrix, {
    kind: "boxed",
    size: 48,
    glibTypeName: "cairo_matrix_t",
    lib: LIB,
    fields: {},
});
