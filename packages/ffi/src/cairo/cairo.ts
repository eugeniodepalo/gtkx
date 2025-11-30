/**
 * Cairo drawing function bindings via libcairo.
 * These wrap Cairo calls for use in GtkDrawingArea draw callbacks.
 */

import { call } from "@gtkx/native";

const LIB = "libcairo.so.2";

// Type descriptor for cairo_t* (raw pointer as unsigned 64-bit integer)
// This allows passing either the raw pointer number from draw callbacks
// or a wrapped ObjectId from other contexts.
const CAIRO_T = { type: "int", size: 64, unsigned: true } as const;

// ============================================================================
// Path Construction
// ============================================================================

/**
 * Begin a new sub-path. After this call the current point will be (x, y).
 */
export function moveTo(cr: unknown, x: number, y: number): void {
    call(
        LIB,
        "cairo_move_to",
        [
            { type: CAIRO_T, value: cr },
            { type: { type: "float", size: 64 }, value: x },
            { type: { type: "float", size: 64 }, value: y },
        ],
        { type: "undefined" },
    );
}

/**
 * Adds a line to the path from the current point to position (x, y).
 */
export function lineTo(cr: unknown, x: number, y: number): void {
    call(
        LIB,
        "cairo_line_to",
        [
            { type: CAIRO_T, value: cr },
            { type: { type: "float", size: 64 }, value: x },
            { type: { type: "float", size: 64 }, value: y },
        ],
        { type: "undefined" },
    );
}

/**
 * Adds a cubic Bezier spline to the path.
 */
export function curveTo(cr: unknown, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
    call(
        LIB,
        "cairo_curve_to",
        [
            { type: CAIRO_T, value: cr },
            { type: { type: "float", size: 64 }, value: x1 },
            { type: { type: "float", size: 64 }, value: y1 },
            { type: { type: "float", size: 64 }, value: x2 },
            { type: { type: "float", size: 64 }, value: y2 },
            { type: { type: "float", size: 64 }, value: x3 },
            { type: { type: "float", size: 64 }, value: y3 },
        ],
        { type: "undefined" },
    );
}

/**
 * Adds a circular arc to the current path.
 * @param xc - X position of the center of the arc
 * @param yc - Y position of the center of the arc
 * @param radius - The radius of the arc
 * @param angle1 - The start angle, in radians
 * @param angle2 - The end angle, in radians
 */
export function arc(cr: unknown, xc: number, yc: number, radius: number, angle1: number, angle2: number): void {
    call(
        LIB,
        "cairo_arc",
        [
            { type: CAIRO_T, value: cr },
            { type: { type: "float", size: 64 }, value: xc },
            { type: { type: "float", size: 64 }, value: yc },
            { type: { type: "float", size: 64 }, value: radius },
            { type: { type: "float", size: 64 }, value: angle1 },
            { type: { type: "float", size: 64 }, value: angle2 },
        ],
        { type: "undefined" },
    );
}

/**
 * Adds a circular arc to the current path (counter-clockwise).
 */
export function arcNegative(cr: unknown, xc: number, yc: number, radius: number, angle1: number, angle2: number): void {
    call(
        LIB,
        "cairo_arc_negative",
        [
            { type: CAIRO_T, value: cr },
            { type: { type: "float", size: 64 }, value: xc },
            { type: { type: "float", size: 64 }, value: yc },
            { type: { type: "float", size: 64 }, value: radius },
            { type: { type: "float", size: 64 }, value: angle1 },
            { type: { type: "float", size: 64 }, value: angle2 },
        ],
        { type: "undefined" },
    );
}

/**
 * Adds a closed sub-path rectangle to the current path.
 */
export function rectangle(cr: unknown, x: number, y: number, width: number, height: number): void {
    call(
        LIB,
        "cairo_rectangle",
        [
            { type: CAIRO_T, value: cr },
            { type: { type: "float", size: 64 }, value: x },
            { type: { type: "float", size: 64 }, value: y },
            { type: { type: "float", size: 64 }, value: width },
            { type: { type: "float", size: 64 }, value: height },
        ],
        { type: "undefined" },
    );
}

/**
 * Adds a line segment to the path from the current point to the beginning of the current sub-path.
 */
export function closePath(cr: unknown): void {
    call(LIB, "cairo_close_path", [{ type: CAIRO_T, value: cr }], { type: "undefined" });
}

/**
 * Clears the current path.
 */
export function newPath(cr: unknown): void {
    call(LIB, "cairo_new_path", [{ type: CAIRO_T, value: cr }], { type: "undefined" });
}

/**
 * Begin a new sub-path without clearing the current path.
 */
export function newSubPath(cr: unknown): void {
    call(LIB, "cairo_new_sub_path", [{ type: CAIRO_T, value: cr }], { type: "undefined" });
}

// ============================================================================
// Drawing Operations
// ============================================================================

/**
 * Stroke the current path according to the current line width, line join, line cap, and dash settings.
 */
export function stroke(cr: unknown): void {
    call(LIB, "cairo_stroke", [{ type: CAIRO_T, value: cr }], { type: "undefined" });
}

/**
 * Stroke the current path but preserve the path for further use.
 */
export function strokePreserve(cr: unknown): void {
    call(LIB, "cairo_stroke_preserve", [{ type: CAIRO_T, value: cr }], { type: "undefined" });
}

/**
 * Fill the current path according to the current fill rule.
 */
export function fill(cr: unknown): void {
    call(LIB, "cairo_fill", [{ type: CAIRO_T, value: cr }], { type: "undefined" });
}

/**
 * Fill the current path but preserve the path for further use.
 */
export function fillPreserve(cr: unknown): void {
    call(LIB, "cairo_fill_preserve", [{ type: CAIRO_T, value: cr }], { type: "undefined" });
}

/**
 * Paint the current source everywhere within the current clip region.
 */
export function paint(cr: unknown): void {
    call(LIB, "cairo_paint", [{ type: CAIRO_T, value: cr }], { type: "undefined" });
}

/**
 * Paint the current source using alpha as a mask.
 */
export function paintWithAlpha(cr: unknown, alpha: number): void {
    call(
        LIB,
        "cairo_paint_with_alpha",
        [
            { type: CAIRO_T, value: cr },
            { type: { type: "float", size: 64 }, value: alpha },
        ],
        { type: "undefined" },
    );
}

// ============================================================================
// Source/Color Operations
// ============================================================================

/**
 * Sets the source pattern to an opaque color (RGB).
 */
export function setSourceRgb(cr: unknown, red: number, green: number, blue: number): void {
    call(
        LIB,
        "cairo_set_source_rgb",
        [
            { type: CAIRO_T, value: cr },
            { type: { type: "float", size: 64 }, value: red },
            { type: { type: "float", size: 64 }, value: green },
            { type: { type: "float", size: 64 }, value: blue },
        ],
        { type: "undefined" },
    );
}

/**
 * Sets the source pattern to a translucent color (RGBA).
 */
export function setSourceRgba(cr: unknown, red: number, green: number, blue: number, alpha: number): void {
    call(
        LIB,
        "cairo_set_source_rgba",
        [
            { type: CAIRO_T, value: cr },
            { type: { type: "float", size: 64 }, value: red },
            { type: { type: "float", size: 64 }, value: green },
            { type: { type: "float", size: 64 }, value: blue },
            { type: { type: "float", size: 64 }, value: alpha },
        ],
        { type: "undefined" },
    );
}

// ============================================================================
// Line Properties
// ============================================================================

/**
 * Sets the current line width.
 */
export function setLineWidth(cr: unknown, width: number): void {
    call(
        LIB,
        "cairo_set_line_width",
        [
            { type: CAIRO_T, value: cr },
            { type: { type: "float", size: 64 }, value: width },
        ],
        { type: "undefined" },
    );
}

/**
 * Sets the current line cap style.
 * @param lineCap - 0 = BUTT, 1 = ROUND, 2 = SQUARE
 */
export function setLineCap(cr: unknown, lineCap: number): void {
    call(
        LIB,
        "cairo_set_line_cap",
        [
            { type: CAIRO_T, value: cr },
            { type: { type: "int", size: 32, unsigned: false }, value: lineCap },
        ],
        { type: "undefined" },
    );
}

/**
 * Sets the current line join style.
 * @param lineJoin - 0 = MITER, 1 = ROUND, 2 = BEVEL
 */
export function setLineJoin(cr: unknown, lineJoin: number): void {
    call(
        LIB,
        "cairo_set_line_join",
        [
            { type: CAIRO_T, value: cr },
            { type: { type: "int", size: 32, unsigned: false }, value: lineJoin },
        ],
        { type: "undefined" },
    );
}

/**
 * Sets the dash pattern to be used by stroke.
 */
export function setDash(cr: unknown, dashes: number[], offset: number): void {
    call(
        LIB,
        "cairo_set_dash",
        [
            { type: CAIRO_T, value: cr },
            { type: { type: "array", itemType: { type: "float", size: 64 } }, value: dashes },
            { type: { type: "int", size: 32, unsigned: false }, value: dashes.length },
            { type: { type: "float", size: 64 }, value: offset },
        ],
        { type: "undefined" },
    );
}

// ============================================================================
// State Management
// ============================================================================

/**
 * Makes a copy of the current state and saves it on an internal stack.
 */
export function save(cr: unknown): void {
    call(LIB, "cairo_save", [{ type: CAIRO_T, value: cr }], { type: "undefined" });
}

/**
 * Restores the state saved by a preceding call to save().
 */
export function restore(cr: unknown): void {
    call(LIB, "cairo_restore", [{ type: CAIRO_T, value: cr }], { type: "undefined" });
}

// ============================================================================
// Transformations
// ============================================================================

/**
 * Modifies the current transformation matrix by translating.
 */
export function translate(cr: unknown, tx: number, ty: number): void {
    call(
        LIB,
        "cairo_translate",
        [
            { type: CAIRO_T, value: cr },
            { type: { type: "float", size: 64 }, value: tx },
            { type: { type: "float", size: 64 }, value: ty },
        ],
        { type: "undefined" },
    );
}

/**
 * Modifies the current transformation matrix by scaling.
 */
export function scale(cr: unknown, sx: number, sy: number): void {
    call(
        LIB,
        "cairo_scale",
        [
            { type: CAIRO_T, value: cr },
            { type: { type: "float", size: 64 }, value: sx },
            { type: { type: "float", size: 64 }, value: sy },
        ],
        { type: "undefined" },
    );
}

/**
 * Modifies the current transformation matrix by rotating.
 * @param angle - Angle of rotation in radians
 */
export function rotate(cr: unknown, angle: number): void {
    call(
        LIB,
        "cairo_rotate",
        [
            { type: CAIRO_T, value: cr },
            { type: { type: "float", size: 64 }, value: angle },
        ],
        { type: "undefined" },
    );
}

// ============================================================================
// Clipping
// ============================================================================

/**
 * Establishes a new clip region by intersecting the current clip region with the current path.
 */
export function clip(cr: unknown): void {
    call(LIB, "cairo_clip", [{ type: CAIRO_T, value: cr }], { type: "undefined" });
}

/**
 * Establishes a new clip region but preserves the path for further use.
 */
export function clipPreserve(cr: unknown): void {
    call(LIB, "cairo_clip_preserve", [{ type: CAIRO_T, value: cr }], { type: "undefined" });
}

/**
 * Reset the current clip region to its original, unrestricted state.
 */
export function resetClip(cr: unknown): void {
    call(LIB, "cairo_reset_clip", [{ type: CAIRO_T, value: cr }], { type: "undefined" });
}

// ============================================================================
// Operator
// ============================================================================

/**
 * Sets the compositing operator.
 * @param op - Operator constant (e.g., CAIRO_OPERATOR_OVER = 2)
 */
export function setOperator(cr: unknown, op: number): void {
    call(
        LIB,
        "cairo_set_operator",
        [
            { type: CAIRO_T, value: cr },
            { type: { type: "int", size: 32, unsigned: false }, value: op },
        ],
        { type: "undefined" },
    );
}
