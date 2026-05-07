import { createRef, type NativeHandle } from "@gtkx/native";
import type { Status } from "../generated/cairo/enums.js";
import { alloc, call, read, t } from "../native.js";
import { NativeObject } from "../object.js";
import { DOUBLE_TYPE, INT_TYPE, LIB, MATRIX_T } from "./common.js";

export const allocMatrix = (): { handle: NativeHandle; obj: Matrix } => {
    const handle = alloc(48, "cairo_matrix_t", LIB);
    const obj = Object.create(Matrix.prototype) as Matrix;
    obj.handle = handle;
    return { handle, obj };
};

/**
 * Cairo affine transformation matrix backed by the `cairo_matrix_t` C struct.
 *
 * The struct is treated as an opaque 48-byte block accessed through cairo's
 * own functions and direct field reads. The TypeScript getters and instance
 * methods on the prototype expose the canonical cairo_matrix_t API.
 */
export class Matrix extends NativeObject {
    static readonly glibTypeName: string = "cairo_matrix_t";

    constructor();
    constructor(handle: NativeHandle);
    constructor(xx: number, yx: number, xy: number, yy: number, x0: number, y0: number);
    constructor(xxOrHandle?: number | NativeHandle, yx?: number, xy?: number, yy?: number, x0?: number, y0?: number) {
        if (xxOrHandle !== undefined && typeof xxOrHandle !== "number") {
            super(xxOrHandle);
            return;
        }
        const xx = xxOrHandle;
        super(alloc(48, "cairo_matrix_t", LIB));
        if (xx === undefined) {
            call(LIB, "cairo_matrix_init_identity", [{ type: MATRIX_T, value: this.handle }], t.void);
        } else {
            call(
                LIB,
                "cairo_matrix_init",
                [
                    { type: MATRIX_T, value: this.handle },
                    { type: DOUBLE_TYPE, value: xx },
                    { type: DOUBLE_TYPE, value: yx },
                    { type: DOUBLE_TYPE, value: xy },
                    { type: DOUBLE_TYPE, value: yy },
                    { type: DOUBLE_TYPE, value: x0 },
                    { type: DOUBLE_TYPE, value: y0 },
                ],
                t.void,
            );
        }
    }

    get xx(): number {
        return read(this.handle, DOUBLE_TYPE, 0) as number;
    }

    get yx(): number {
        return read(this.handle, DOUBLE_TYPE, 8) as number;
    }

    get xy(): number {
        return read(this.handle, DOUBLE_TYPE, 16) as number;
    }

    get yy(): number {
        return read(this.handle, DOUBLE_TYPE, 24) as number;
    }

    get x0(): number {
        return read(this.handle, DOUBLE_TYPE, 32) as number;
    }

    get y0(): number {
        return read(this.handle, DOUBLE_TYPE, 40) as number;
    }

    translate(tx: number, ty: number): void {
        call(
            LIB,
            "cairo_matrix_translate",
            [
                { type: MATRIX_T, value: this.handle },
                { type: DOUBLE_TYPE, value: tx },
                { type: DOUBLE_TYPE, value: ty },
            ],
            t.void,
        );
    }

    scale(sx: number, sy: number): void {
        call(
            LIB,
            "cairo_matrix_scale",
            [
                { type: MATRIX_T, value: this.handle },
                { type: DOUBLE_TYPE, value: sx },
                { type: DOUBLE_TYPE, value: sy },
            ],
            t.void,
        );
    }

    rotate(radians: number): void {
        call(
            LIB,
            "cairo_matrix_rotate",
            [
                { type: MATRIX_T, value: this.handle },
                { type: DOUBLE_TYPE, value: radians },
            ],
            t.void,
        );
    }

    invert(): Status {
        return call(LIB, "cairo_matrix_invert", [{ type: MATRIX_T, value: this.handle }], INT_TYPE) as Status;
    }

    multiply(other: Matrix): Matrix {
        const { handle, obj } = allocMatrix();
        call(
            LIB,
            "cairo_matrix_multiply",
            [
                { type: MATRIX_T, value: handle },
                { type: MATRIX_T, value: this.handle },
                { type: MATRIX_T, value: other.handle },
            ],
            t.void,
        );
        return obj;
    }

    transformPoint(x: number, y: number): [number, number] {
        const xRef = createRef(x);
        const yRef = createRef(y);
        call(
            LIB,
            "cairo_matrix_transform_point",
            [
                { type: MATRIX_T, value: this.handle },
                { type: t.ref(DOUBLE_TYPE), value: xRef },
                { type: t.ref(DOUBLE_TYPE), value: yRef },
            ],
            t.void,
        );
        return [xRef.value, yRef.value];
    }

    transformDistance(dx: number, dy: number): [number, number] {
        const dxRef = createRef(dx);
        const dyRef = createRef(dy);
        call(
            LIB,
            "cairo_matrix_transform_distance",
            [
                { type: MATRIX_T, value: this.handle },
                { type: t.ref(DOUBLE_TYPE), value: dxRef },
                { type: t.ref(DOUBLE_TYPE), value: dyRef },
            ],
            t.void,
        );
        return [dxRef.value, dyRef.value];
    }

    static createTranslate(tx: number, ty: number): Matrix {
        const { handle, obj } = allocMatrix();
        call(
            LIB,
            "cairo_matrix_init_translate",
            [
                { type: MATRIX_T, value: handle },
                { type: DOUBLE_TYPE, value: tx },
                { type: DOUBLE_TYPE, value: ty },
            ],
            t.void,
        );
        return obj;
    }

    static createScale(sx: number, sy: number): Matrix {
        const { handle, obj } = allocMatrix();
        call(
            LIB,
            "cairo_matrix_init_scale",
            [
                { type: MATRIX_T, value: handle },
                { type: DOUBLE_TYPE, value: sx },
                { type: DOUBLE_TYPE, value: sy },
            ],
            t.void,
        );
        return obj;
    }

    static createRotate(radians: number): Matrix {
        const { handle, obj } = allocMatrix();
        call(
            LIB,
            "cairo_matrix_init_rotate",
            [
                { type: MATRIX_T, value: handle },
                { type: DOUBLE_TYPE, value: radians },
            ],
            t.void,
        );
        return obj;
    }
}
