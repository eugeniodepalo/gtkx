import { createRef, type NativeHandle } from "@gtkx/native";
import type { Extend, Filter, PatternType, Status } from "../generated/cairo/cairo.js";
import { Pattern, Surface } from "../generated/cairo/cairo.js";
import { getHandle } from "../handles.js";
import { t } from "../native.js";
import { getNativeObject, wrapHandle } from "../registry.js";
import {
    DOUBLE_REF,
    DOUBLE_TYPE,
    INT_REF,
    INT_TYPE,
    LIB,
    MATRIX_T,
    PATH_STRUCT_T,
    PATTERN_T,
    PATTERN_T_NONE,
    type PathData,
    parsePath,
    SURFACE_T_NONE,
} from "./common.js";
import type { Matrix } from "./matrix.js";
import { allocMatrix } from "./matrix.js";

const { fn } = t;
const SURFACE_REF = t.ref(SURFACE_T_NONE);

declare module "../generated/cairo/cairo.js" {
    interface Pattern {
        setFilter(filter: Filter): void;
        getFilter(): Filter;
        addColorStopRgb(offset: number, red: number, green: number, blue: number): void;
        addColorStopRgba(offset: number, red: number, green: number, blue: number, alpha: number): void;
        setExtend(extend: Extend): void;
        getExtend(): Extend;
        setMatrix(matrix: Matrix): void;
        getMatrix(): Matrix;
        getType(): PatternType;
    }
}

const cairo_pattern_create_linear = fn(
    LIB,
    "cairo_pattern_create_linear",
    [{ type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }],
    PATTERN_T,
);

export class LinearPattern extends Pattern {
    static create(x0: number, y0: number, x1: number, y1: number): LinearPattern {
        return wrapHandle(LinearPattern, cairo_pattern_create_linear(x0, y0, x1, y1) as NativeHandle);
    }
}

const cairo_pattern_create_radial = fn(
    LIB,
    "cairo_pattern_create_radial",
    [
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
    ],
    PATTERN_T,
);

export class RadialPattern extends Pattern {
    static create(cx0: number, cy0: number, radius0: number, cx1: number, cy1: number, radius1: number): RadialPattern {
        return wrapHandle(
            RadialPattern,
            cairo_pattern_create_radial(cx0, cy0, radius0, cx1, cy1, radius1) as NativeHandle,
        );
    }
}

const cairo_pattern_create_for_surface = fn(
    LIB,
    "cairo_pattern_create_for_surface",
    [{ type: SURFACE_T_NONE }],
    PATTERN_T,
);

export class SurfacePattern extends Pattern {
    static create(surface: Surface): SurfacePattern {
        return wrapHandle(SurfacePattern, cairo_pattern_create_for_surface(getHandle(surface)) as NativeHandle);
    }
}

const cairo_pattern_create_rgb = fn(
    LIB,
    "cairo_pattern_create_rgb",
    [{ type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }],
    PATTERN_T,
);
const cairo_pattern_create_rgba = fn(
    LIB,
    "cairo_pattern_create_rgba",
    [{ type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }],
    PATTERN_T,
);

export class SolidPattern extends Pattern {
    static create(r: number, g: number, b: number, a?: number): SolidPattern {
        const handle =
            a === undefined
                ? (cairo_pattern_create_rgb(r, g, b) as NativeHandle)
                : (cairo_pattern_create_rgba(r, g, b, a) as NativeHandle);
        return wrapHandle(SolidPattern, handle);
    }
}

const cairo_pattern_add_color_stop_rgb = fn(
    LIB,
    "cairo_pattern_add_color_stop_rgb",
    [
        { type: PATTERN_T_NONE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
    ],
    t.void,
);
Pattern.prototype.addColorStopRgb = function (offset: number, red: number, green: number, blue: number): void {
    cairo_pattern_add_color_stop_rgb(getHandle(this), offset, red, green, blue);
};

const cairo_pattern_add_color_stop_rgba = fn(
    LIB,
    "cairo_pattern_add_color_stop_rgba",
    [
        { type: PATTERN_T_NONE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
    ],
    t.void,
);
Pattern.prototype.addColorStopRgba = function (
    offset: number,
    red: number,
    green: number,
    blue: number,
    alpha: number,
): void {
    cairo_pattern_add_color_stop_rgba(getHandle(this), offset, red, green, blue, alpha);
};

const cairo_pattern_set_filter = fn(
    LIB,
    "cairo_pattern_set_filter",
    [{ type: PATTERN_T_NONE }, { type: INT_TYPE }],
    t.void,
);
Pattern.prototype.setFilter = function (filter: Filter): void {
    cairo_pattern_set_filter(getHandle(this), filter);
};

const cairo_pattern_get_filter = fn(LIB, "cairo_pattern_get_filter", [{ type: PATTERN_T_NONE }], INT_TYPE);
Pattern.prototype.getFilter = function (): Filter {
    return cairo_pattern_get_filter(getHandle(this)) as Filter;
};

const cairo_pattern_set_extend = fn(
    LIB,
    "cairo_pattern_set_extend",
    [{ type: PATTERN_T_NONE }, { type: INT_TYPE }],
    t.void,
);
Pattern.prototype.setExtend = function (extend: Extend): void {
    cairo_pattern_set_extend(getHandle(this), extend);
};

const cairo_pattern_get_extend = fn(LIB, "cairo_pattern_get_extend", [{ type: PATTERN_T_NONE }], INT_TYPE);
Pattern.prototype.getExtend = function (): Extend {
    return cairo_pattern_get_extend(getHandle(this)) as Extend;
};

const cairo_pattern_set_matrix = fn(
    LIB,
    "cairo_pattern_set_matrix",
    [{ type: PATTERN_T_NONE }, { type: MATRIX_T }],
    t.void,
);
Pattern.prototype.setMatrix = function (matrix: Matrix): void {
    cairo_pattern_set_matrix(getHandle(this), getHandle(matrix));
};

const cairo_pattern_get_matrix = fn(
    LIB,
    "cairo_pattern_get_matrix",
    [{ type: PATTERN_T_NONE }, { type: MATRIX_T }],
    t.void,
);
Pattern.prototype.getMatrix = function (): Matrix {
    const { handle, obj } = allocMatrix();
    cairo_pattern_get_matrix(getHandle(this), handle);
    return obj;
};

const cairo_pattern_get_type = fn(LIB, "cairo_pattern_get_type", [{ type: PATTERN_T_NONE }], INT_TYPE);
Pattern.prototype.getType = function (): PatternType {
    return cairo_pattern_get_type(getHandle(this)) as PatternType;
};

declare module "../generated/cairo/cairo.js" {
    interface Pattern {
        meshBeginPatch(): void;
        meshEndPatch(): void;
        meshMoveTo(x: number, y: number): void;
        meshLineTo(x: number, y: number): void;
        meshCurveTo(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void;
        meshSetControlPoint(pointNum: number, x: number, y: number): void;
        meshSetCornerColorRgb(cornerNum: number, r: number, g: number, b: number): void;
        meshSetCornerColorRgba(cornerNum: number, r: number, g: number, b: number, a: number): void;
        meshGetPatchCount(): number;
        meshGetControlPoint(patchNum: number, pointNum: number): { x: number; y: number };
        meshGetCornerColorRgba(patchNum: number, cornerNum: number): { r: number; g: number; b: number; a: number };

        getColorStopCount(): number;
        getColorStopRgba(index: number): { offset: number; r: number; g: number; b: number; a: number };
        getRgba(): { r: number; g: number; b: number; a: number };
        getSurface(): Surface;
        getLinearPoints(): { x0: number; y0: number; x1: number; y1: number };
        getRadialCircles(): { x0: number; y0: number; r0: number; x1: number; y1: number; r1: number };
        status(): Status;
    }
}

const cairo_pattern_create_mesh = fn(LIB, "cairo_pattern_create_mesh", [], PATTERN_T);

export class MeshPattern extends Pattern {
    static create(): MeshPattern {
        return wrapHandle(MeshPattern, cairo_pattern_create_mesh() as NativeHandle);
    }
}

const cairo_mesh_pattern_begin_patch = fn(LIB, "cairo_mesh_pattern_begin_patch", [{ type: PATTERN_T_NONE }], t.void);
Pattern.prototype.meshBeginPatch = function (): void {
    cairo_mesh_pattern_begin_patch(getHandle(this));
};

const cairo_mesh_pattern_end_patch = fn(LIB, "cairo_mesh_pattern_end_patch", [{ type: PATTERN_T_NONE }], t.void);
Pattern.prototype.meshEndPatch = function (): void {
    cairo_mesh_pattern_end_patch(getHandle(this));
};

const cairo_mesh_pattern_move_to = fn(
    LIB,
    "cairo_mesh_pattern_move_to",
    [{ type: PATTERN_T_NONE }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }],
    t.void,
);
Pattern.prototype.meshMoveTo = function (x: number, y: number): void {
    cairo_mesh_pattern_move_to(getHandle(this), x, y);
};

const cairo_mesh_pattern_line_to = fn(
    LIB,
    "cairo_mesh_pattern_line_to",
    [{ type: PATTERN_T_NONE }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }],
    t.void,
);
Pattern.prototype.meshLineTo = function (x: number, y: number): void {
    cairo_mesh_pattern_line_to(getHandle(this), x, y);
};

const cairo_mesh_pattern_curve_to = fn(
    LIB,
    "cairo_mesh_pattern_curve_to",
    [
        { type: PATTERN_T_NONE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
    ],
    t.void,
);
Pattern.prototype.meshCurveTo = function (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
): void {
    cairo_mesh_pattern_curve_to(getHandle(this), x1, y1, x2, y2, x3, y3);
};

const cairo_mesh_pattern_set_control_point = fn(
    LIB,
    "cairo_mesh_pattern_set_control_point",
    [{ type: PATTERN_T_NONE }, { type: INT_TYPE }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }],
    t.void,
);
Pattern.prototype.meshSetControlPoint = function (pointNum: number, x: number, y: number): void {
    cairo_mesh_pattern_set_control_point(getHandle(this), pointNum, x, y);
};

const cairo_mesh_pattern_set_corner_color_rgb = fn(
    LIB,
    "cairo_mesh_pattern_set_corner_color_rgb",
    [{ type: PATTERN_T_NONE }, { type: INT_TYPE }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }],
    t.void,
);
Pattern.prototype.meshSetCornerColorRgb = function (cornerNum: number, r: number, g: number, b: number): void {
    cairo_mesh_pattern_set_corner_color_rgb(getHandle(this), cornerNum, r, g, b);
};

const cairo_mesh_pattern_set_corner_color_rgba = fn(
    LIB,
    "cairo_mesh_pattern_set_corner_color_rgba",
    [
        { type: PATTERN_T_NONE },
        { type: INT_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
    ],
    t.void,
);
Pattern.prototype.meshSetCornerColorRgba = function (
    cornerNum: number,
    r: number,
    g: number,
    b: number,
    a: number,
): void {
    cairo_mesh_pattern_set_corner_color_rgba(getHandle(this), cornerNum, r, g, b, a);
};

const cairo_mesh_pattern_get_patch_count = fn(
    LIB,
    "cairo_mesh_pattern_get_patch_count",
    [{ type: PATTERN_T_NONE }, { type: INT_REF }],
    INT_TYPE,
);
Pattern.prototype.meshGetPatchCount = function (): number {
    const countRef = createRef(0);
    cairo_mesh_pattern_get_patch_count(getHandle(this), countRef);
    return countRef.value;
};

const cairo_mesh_pattern_get_control_point = fn(
    LIB,
    "cairo_mesh_pattern_get_control_point",
    [{ type: PATTERN_T_NONE }, { type: INT_TYPE }, { type: INT_TYPE }, { type: DOUBLE_REF }, { type: DOUBLE_REF }],
    INT_TYPE,
);
Pattern.prototype.meshGetControlPoint = function (patchNum: number, pointNum: number): { x: number; y: number } {
    const xRef = createRef(0);
    const yRef = createRef(0);
    cairo_mesh_pattern_get_control_point(getHandle(this), patchNum, pointNum, xRef, yRef);
    return { x: xRef.value, y: yRef.value };
};

const cairo_mesh_pattern_get_corner_color_rgba = fn(
    LIB,
    "cairo_mesh_pattern_get_corner_color_rgba",
    [
        { type: PATTERN_T_NONE },
        { type: INT_TYPE },
        { type: INT_TYPE },
        { type: DOUBLE_REF },
        { type: DOUBLE_REF },
        { type: DOUBLE_REF },
        { type: DOUBLE_REF },
    ],
    INT_TYPE,
);
Pattern.prototype.meshGetCornerColorRgba = function (
    patchNum: number,
    cornerNum: number,
): { r: number; g: number; b: number; a: number } {
    const rRef = createRef(0);
    const gRef = createRef(0);
    const bRef = createRef(0);
    const aRef = createRef(0);
    cairo_mesh_pattern_get_corner_color_rgba(getHandle(this), patchNum, cornerNum, rRef, gRef, bRef, aRef);
    return { r: rRef.value, g: gRef.value, b: bRef.value, a: aRef.value };
};

const cairo_pattern_get_color_stop_count = fn(
    LIB,
    "cairo_pattern_get_color_stop_count",
    [{ type: PATTERN_T_NONE }, { type: INT_REF }],
    INT_TYPE,
);
Pattern.prototype.getColorStopCount = function (): number {
    const countRef = createRef(0);
    cairo_pattern_get_color_stop_count(getHandle(this), countRef);
    return countRef.value;
};

const cairo_pattern_get_color_stop_rgba = fn(
    LIB,
    "cairo_pattern_get_color_stop_rgba",
    [
        { type: PATTERN_T_NONE },
        { type: INT_TYPE },
        { type: DOUBLE_REF },
        { type: DOUBLE_REF },
        { type: DOUBLE_REF },
        { type: DOUBLE_REF },
        { type: DOUBLE_REF },
    ],
    INT_TYPE,
);
Pattern.prototype.getColorStopRgba = function (index: number): {
    offset: number;
    r: number;
    g: number;
    b: number;
    a: number;
} {
    const offsetRef = createRef(0);
    const rRef = createRef(0);
    const gRef = createRef(0);
    const bRef = createRef(0);
    const aRef = createRef(0);
    cairo_pattern_get_color_stop_rgba(getHandle(this), index, offsetRef, rRef, gRef, bRef, aRef);
    return { offset: offsetRef.value, r: rRef.value, g: gRef.value, b: bRef.value, a: aRef.value };
};

const cairo_pattern_get_rgba = fn(
    LIB,
    "cairo_pattern_get_rgba",
    [{ type: PATTERN_T_NONE }, { type: DOUBLE_REF }, { type: DOUBLE_REF }, { type: DOUBLE_REF }, { type: DOUBLE_REF }],
    INT_TYPE,
);
Pattern.prototype.getRgba = function (): { r: number; g: number; b: number; a: number } {
    const rRef = createRef(0);
    const gRef = createRef(0);
    const bRef = createRef(0);
    const aRef = createRef(0);
    cairo_pattern_get_rgba(getHandle(this), rRef, gRef, bRef, aRef);
    return { r: rRef.value, g: gRef.value, b: bRef.value, a: aRef.value };
};

const cairo_pattern_get_surface = fn(
    LIB,
    "cairo_pattern_get_surface",
    [{ type: PATTERN_T_NONE }, { type: SURFACE_REF }],
    INT_TYPE,
);
Pattern.prototype.getSurface = function (): Surface {
    const surfRef = createRef<NativeHandle | null>(null);
    cairo_pattern_get_surface(getHandle(this), surfRef);
    return getNativeObject(surfRef.value, Surface) as Surface;
};

const cairo_pattern_get_linear_points = fn(
    LIB,
    "cairo_pattern_get_linear_points",
    [{ type: PATTERN_T_NONE }, { type: DOUBLE_REF }, { type: DOUBLE_REF }, { type: DOUBLE_REF }, { type: DOUBLE_REF }],
    INT_TYPE,
);
Pattern.prototype.getLinearPoints = function (): {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
} {
    const x0Ref = createRef(0);
    const y0Ref = createRef(0);
    const x1Ref = createRef(0);
    const y1Ref = createRef(0);
    cairo_pattern_get_linear_points(getHandle(this), x0Ref, y0Ref, x1Ref, y1Ref);
    return { x0: x0Ref.value, y0: y0Ref.value, x1: x1Ref.value, y1: y1Ref.value };
};

const cairo_pattern_get_radial_circles = fn(
    LIB,
    "cairo_pattern_get_radial_circles",
    [
        { type: PATTERN_T_NONE },
        { type: DOUBLE_REF },
        { type: DOUBLE_REF },
        { type: DOUBLE_REF },
        { type: DOUBLE_REF },
        { type: DOUBLE_REF },
        { type: DOUBLE_REF },
    ],
    INT_TYPE,
);
Pattern.prototype.getRadialCircles = function (): {
    x0: number;
    y0: number;
    r0: number;
    x1: number;
    y1: number;
    r1: number;
} {
    const x0Ref = createRef(0);
    const y0Ref = createRef(0);
    const r0Ref = createRef(0);
    const x1Ref = createRef(0);
    const y1Ref = createRef(0);
    const r1Ref = createRef(0);
    cairo_pattern_get_radial_circles(getHandle(this), x0Ref, y0Ref, r0Ref, x1Ref, y1Ref, r1Ref);
    return {
        x0: x0Ref.value,
        y0: y0Ref.value,
        r0: r0Ref.value,
        x1: x1Ref.value,
        y1: y1Ref.value,
        r1: r1Ref.value,
    };
};

const cairo_pattern_status = fn(LIB, "cairo_pattern_status", [{ type: PATTERN_T_NONE }], INT_TYPE);
Pattern.prototype.status = function (): Status {
    return cairo_pattern_status(getHandle(this)) as Status;
};

export enum Dither {
    NONE = 0,
    DEFAULT = 1,
    FAST = 2,
    GOOD = 3,
    BEST = 4,
}

declare module "../generated/cairo/cairo.js" {
    interface Pattern {
        meshGetPath(patchNum: number): PathData[];
        setDither(dither: Dither): void;
        getDither(): Dither;
    }
}

const cairo_mesh_pattern_get_path = fn(
    LIB,
    "cairo_mesh_pattern_get_path",
    [{ type: PATTERN_T_NONE }, { type: INT_TYPE }],
    PATH_STRUCT_T,
);
Pattern.prototype.meshGetPath = function (patchNum: number): PathData[] {
    return parsePath(cairo_mesh_pattern_get_path(getHandle(this), patchNum) as NativeHandle);
};

const cairo_pattern_set_dither = fn(
    LIB,
    "cairo_pattern_set_dither",
    [{ type: PATTERN_T_NONE }, { type: INT_TYPE }],
    t.void,
);
Pattern.prototype.setDither = function (dither: Dither): void {
    cairo_pattern_set_dither(getHandle(this), dither);
};

const cairo_pattern_get_dither = fn(LIB, "cairo_pattern_get_dither", [{ type: PATTERN_T_NONE }], INT_TYPE);
Pattern.prototype.getDither = function (): Dither {
    return cairo_pattern_get_dither(getHandle(this)) as Dither;
};
