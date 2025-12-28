// biome-ignore-all lint/suspicious/noExplicitAny: Cairo FFI requires dynamic typing for GObject interop
// biome-ignore-all lint/style/noNonNullAssertion: Cairo FFI returns valid pointers that are guaranteed non-null
import { alloc, call, read } from "@gtkx/native";
import { Context } from "../generated/cairo/context.js";
import type {
    Antialias,
    FillRule,
    FontSlant,
    FontWeight,
    LineCap,
    LineJoin,
    Operator,
} from "../generated/cairo/enums.js";
import { FontOptions } from "../generated/cairo/font-options.js";
import { Pattern } from "../generated/cairo/pattern.js";

export { Context, Pattern, FontOptions };

const LIB = "libcairo.so.2";
const LIB_GOBJECT = "libcairo-gobject.so.2";

const FONT_OPTIONS_T = {
    type: "boxed",
    innerType: "CairoFontOptions",
    lib: LIB_GOBJECT,
    getTypeFn: "cairo_gobject_font_options_get_type",
    borrowed: true,
} as const;
const CAIRO_T = {
    type: "boxed",
    innerType: "CairoContext",
    lib: LIB_GOBJECT,
    getTypeFn: "cairo_gobject_context_get_type",
    borrowed: true,
} as const;
const PATTERN_T = {
    type: "boxed",
    innerType: "CairoPattern",
    lib: LIB_GOBJECT,
    getTypeFn: "cairo_gobject_pattern_get_type",
    borrowed: false,
} as const;
const PATTERN_T_BORROWED = {
    type: "boxed",
    innerType: "CairoPattern",
    lib: LIB_GOBJECT,
    getTypeFn: "cairo_gobject_pattern_get_type",
    borrowed: true,
} as const;
const DOUBLE_TYPE = { type: "float", size: 64 } as const;

declare module "../generated/cairo/context.js" {
    interface Context {
        moveTo(x: number, y: number): this;
        lineTo(x: number, y: number): this;
        curveTo(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): this;
        arc(xc: number, yc: number, radius: number, angle1: number, angle2: number): this;
        arcNegative(xc: number, yc: number, radius: number, angle1: number, angle2: number): this;
        rectangle(x: number, y: number, width: number, height: number): this;
        closePath(): this;
        newPath(): this;
        newSubPath(): this;

        stroke(): this;
        strokePreserve(): this;
        fill(): this;
        fillPreserve(): this;
        paint(): this;
        paintWithAlpha(alpha: number): this;
        clip(): this;
        clipPreserve(): this;
        resetClip(): this;

        setSourceRgb(red: number, green: number, blue: number): this;
        setSourceRgba(red: number, green: number, blue: number, alpha: number): this;
        setSource(pattern: Pattern): this;

        setLineWidth(width: number): this;
        setLineCap(lineCap: LineCap): this;
        setLineJoin(lineJoin: LineJoin): this;
        setDash(dashes: number[], offset: number): this;

        setFillRule(fillRule: FillRule): this;
        getFillRule(): FillRule;

        save(): this;
        restore(): this;
        translate(tx: number, ty: number): this;
        scale(sx: number, sy: number): this;
        rotate(angle: number): this;

        setOperator(op: Operator): this;

        selectFontFace(family: string, slant: FontSlant, weight: FontWeight): this;
        setFontSize(size: number): this;
        showText(text: string): this;
        textPath(text: string): this;
        textExtents(text: string): TextExtents;

        setFontOptions(options: FontOptions): this;
        getFontOptions(): FontOptions;
        setAntialias(antialias: Antialias): this;
        getAntialias(): Antialias;
    }
}

declare module "../generated/cairo/font-options.js" {
    interface FontOptions {
        setHintStyle(hintStyle: number): this;
        setAntialias(antialias: Antialias): this;
        setHintMetrics(hintMetrics: number): this;
        setSubpixelOrder(subpixelOrder: number): this;
    }
}

declare module "../generated/cairo/pattern.js" {
    interface Pattern {
        addColorStopRgb(offset: number, red: number, green: number, blue: number): this;
        addColorStopRgba(offset: number, red: number, green: number, blue: number, alpha: number): this;
    }

    namespace Pattern {
        function createLinear(x0: number, y0: number, x1: number, y1: number): Pattern;
        function createRadial(
            cx0: number,
            cy0: number,
            radius0: number,
            cx1: number,
            cy1: number,
            radius1: number,
        ): Pattern;
    }
}

Context.prototype.moveTo = function (x: number, y: number): Context {
    call(
        LIB,
        "cairo_move_to",
        [
            { type: CAIRO_T, value: this.id },
            { type: DOUBLE_TYPE, value: x },
            { type: DOUBLE_TYPE, value: y },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.lineTo = function (x: number, y: number): Context {
    call(
        LIB,
        "cairo_line_to",
        [
            { type: CAIRO_T, value: this.id },
            { type: DOUBLE_TYPE, value: x },
            { type: DOUBLE_TYPE, value: y },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.curveTo = function (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): Context {
    call(
        LIB,
        "cairo_curve_to",
        [
            { type: CAIRO_T, value: this.id },
            { type: DOUBLE_TYPE, value: x1 },
            { type: DOUBLE_TYPE, value: y1 },
            { type: DOUBLE_TYPE, value: x2 },
            { type: DOUBLE_TYPE, value: y2 },
            { type: DOUBLE_TYPE, value: x3 },
            { type: DOUBLE_TYPE, value: y3 },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.arc = function (xc: number, yc: number, radius: number, angle1: number, angle2: number): Context {
    call(
        LIB,
        "cairo_arc",
        [
            { type: CAIRO_T, value: this.id },
            { type: DOUBLE_TYPE, value: xc },
            { type: DOUBLE_TYPE, value: yc },
            { type: DOUBLE_TYPE, value: radius },
            { type: DOUBLE_TYPE, value: angle1 },
            { type: DOUBLE_TYPE, value: angle2 },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.arcNegative = function (
    xc: number,
    yc: number,
    radius: number,
    angle1: number,
    angle2: number,
): Context {
    call(
        LIB,
        "cairo_arc_negative",
        [
            { type: CAIRO_T, value: this.id },
            { type: DOUBLE_TYPE, value: xc },
            { type: DOUBLE_TYPE, value: yc },
            { type: DOUBLE_TYPE, value: radius },
            { type: DOUBLE_TYPE, value: angle1 },
            { type: DOUBLE_TYPE, value: angle2 },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.rectangle = function (x: number, y: number, width: number, height: number): Context {
    call(
        LIB,
        "cairo_rectangle",
        [
            { type: CAIRO_T, value: this.id },
            { type: DOUBLE_TYPE, value: x },
            { type: DOUBLE_TYPE, value: y },
            { type: DOUBLE_TYPE, value: width },
            { type: DOUBLE_TYPE, value: height },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.closePath = function (): Context {
    call(LIB, "cairo_close_path", [{ type: CAIRO_T, value: this.id }], { type: "undefined" });
    return this;
};

Context.prototype.newPath = function (): Context {
    call(LIB, "cairo_new_path", [{ type: CAIRO_T, value: this.id }], { type: "undefined" });
    return this;
};

Context.prototype.newSubPath = function (): Context {
    call(LIB, "cairo_new_sub_path", [{ type: CAIRO_T, value: this.id }], { type: "undefined" });
    return this;
};

Context.prototype.stroke = function (): Context {
    call(LIB, "cairo_stroke", [{ type: CAIRO_T, value: this.id }], { type: "undefined" });
    return this;
};

Context.prototype.strokePreserve = function (): Context {
    call(LIB, "cairo_stroke_preserve", [{ type: CAIRO_T, value: this.id }], { type: "undefined" });
    return this;
};

Context.prototype.fill = function (): Context {
    call(LIB, "cairo_fill", [{ type: CAIRO_T, value: this.id }], { type: "undefined" });
    return this;
};

Context.prototype.fillPreserve = function (): Context {
    call(LIB, "cairo_fill_preserve", [{ type: CAIRO_T, value: this.id }], { type: "undefined" });
    return this;
};

Context.prototype.paint = function (): Context {
    call(LIB, "cairo_paint", [{ type: CAIRO_T, value: this.id }], { type: "undefined" });
    return this;
};

Context.prototype.paintWithAlpha = function (alpha: number): Context {
    call(
        LIB,
        "cairo_paint_with_alpha",
        [
            { type: CAIRO_T, value: this.id },
            { type: DOUBLE_TYPE, value: alpha },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.clip = function (): Context {
    call(LIB, "cairo_clip", [{ type: CAIRO_T, value: this.id }], { type: "undefined" });
    return this;
};

Context.prototype.clipPreserve = function (): Context {
    call(LIB, "cairo_clip_preserve", [{ type: CAIRO_T, value: this.id }], { type: "undefined" });
    return this;
};

Context.prototype.resetClip = function (): Context {
    call(LIB, "cairo_reset_clip", [{ type: CAIRO_T, value: this.id }], { type: "undefined" });
    return this;
};

Context.prototype.setSourceRgb = function (red: number, green: number, blue: number): Context {
    call(
        LIB,
        "cairo_set_source_rgb",
        [
            { type: CAIRO_T, value: this.id },
            { type: DOUBLE_TYPE, value: red },
            { type: DOUBLE_TYPE, value: green },
            { type: DOUBLE_TYPE, value: blue },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.setSourceRgba = function (red: number, green: number, blue: number, alpha: number): Context {
    call(
        LIB,
        "cairo_set_source_rgba",
        [
            { type: CAIRO_T, value: this.id },
            { type: DOUBLE_TYPE, value: red },
            { type: DOUBLE_TYPE, value: green },
            { type: DOUBLE_TYPE, value: blue },
            { type: DOUBLE_TYPE, value: alpha },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.setSource = function (pattern: Pattern): Context {
    call(
        LIB,
        "cairo_set_source",
        [
            { type: CAIRO_T, value: this.id },
            { type: PATTERN_T_BORROWED, value: pattern.id },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.setLineWidth = function (width: number): Context {
    call(
        LIB,
        "cairo_set_line_width",
        [
            { type: CAIRO_T, value: this.id },
            { type: DOUBLE_TYPE, value: width },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.setLineCap = function (lineCap: LineCap): Context {
    call(
        LIB,
        "cairo_set_line_cap",
        [
            { type: CAIRO_T, value: this.id },
            { type: { type: "int", size: 32, unsigned: false }, value: lineCap },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.setLineJoin = function (lineJoin: LineJoin): Context {
    call(
        LIB,
        "cairo_set_line_join",
        [
            { type: CAIRO_T, value: this.id },
            { type: { type: "int", size: 32, unsigned: false }, value: lineJoin },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.setDash = function (dashes: number[], offset: number): Context {
    call(
        LIB,
        "cairo_set_dash",
        [
            { type: CAIRO_T, value: this.id },
            { type: { type: "array", itemType: DOUBLE_TYPE }, value: dashes },
            { type: { type: "int", size: 32, unsigned: false }, value: dashes.length },
            { type: DOUBLE_TYPE, value: offset },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.setFillRule = function (fillRule: FillRule): Context {
    call(
        LIB,
        "cairo_set_fill_rule",
        [
            { type: CAIRO_T, value: this.id },
            { type: { type: "int", size: 32, unsigned: false }, value: fillRule },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.getFillRule = function (): FillRule {
    return call(LIB, "cairo_get_fill_rule", [{ type: CAIRO_T, value: this.id }], {
        type: "int",
        size: 32,
        unsigned: false,
    }) as FillRule;
};

Context.prototype.save = function (): Context {
    call(LIB, "cairo_save", [{ type: CAIRO_T, value: this.id }], { type: "undefined" });
    return this;
};

Context.prototype.restore = function (): Context {
    call(LIB, "cairo_restore", [{ type: CAIRO_T, value: this.id }], { type: "undefined" });
    return this;
};

Context.prototype.translate = function (tx: number, ty: number): Context {
    call(
        LIB,
        "cairo_translate",
        [
            { type: CAIRO_T, value: this.id },
            { type: DOUBLE_TYPE, value: tx },
            { type: DOUBLE_TYPE, value: ty },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.scale = function (sx: number, sy: number): Context {
    call(
        LIB,
        "cairo_scale",
        [
            { type: CAIRO_T, value: this.id },
            { type: DOUBLE_TYPE, value: sx },
            { type: DOUBLE_TYPE, value: sy },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.rotate = function (angle: number): Context {
    call(
        LIB,
        "cairo_rotate",
        [
            { type: CAIRO_T, value: this.id },
            { type: DOUBLE_TYPE, value: angle },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.setOperator = function (op: Operator): Context {
    call(
        LIB,
        "cairo_set_operator",
        [
            { type: CAIRO_T, value: this.id },
            { type: { type: "int", size: 32, unsigned: false }, value: op },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.selectFontFace = function (family: string, slant: FontSlant, weight: FontWeight): Context {
    call(
        LIB,
        "cairo_select_font_face",
        [
            { type: CAIRO_T, value: this.id },
            { type: { type: "string" }, value: family },
            { type: { type: "int", size: 32, unsigned: false }, value: slant },
            { type: { type: "int", size: 32, unsigned: false }, value: weight },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.setFontSize = function (size: number): Context {
    call(
        LIB,
        "cairo_set_font_size",
        [
            { type: CAIRO_T, value: this.id },
            { type: DOUBLE_TYPE, value: size },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.showText = function (text: string): Context {
    call(
        LIB,
        "cairo_show_text",
        [
            { type: CAIRO_T, value: this.id },
            { type: { type: "string" }, value: text },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.textPath = function (text: string): Context {
    call(
        LIB,
        "cairo_text_path",
        [
            { type: CAIRO_T, value: this.id },
            { type: { type: "string" }, value: text },
        ],
        { type: "undefined" },
    );
    return this;
};

export interface TextExtents {
    xBearing: number;
    yBearing: number;
    width: number;
    height: number;
    xAdvance: number;
    yAdvance: number;
}

Context.prototype.textExtents = function (text: string): TextExtents {
    const extents = alloc(48, "cairo_text_extents_t", LIB);
    call(
        LIB,
        "cairo_text_extents",
        [
            { type: CAIRO_T, value: this.id },
            { type: { type: "string" }, value: text },
            { type: { type: "boxed", innerType: "cairo_text_extents_t", lib: LIB, borrowed: true }, value: extents },
        ],
        { type: "undefined" },
    );
    return {
        xBearing: read(extents, DOUBLE_TYPE, 0) as number,
        yBearing: read(extents, DOUBLE_TYPE, 8) as number,
        width: read(extents, DOUBLE_TYPE, 16) as number,
        height: read(extents, DOUBLE_TYPE, 24) as number,
        xAdvance: read(extents, DOUBLE_TYPE, 32) as number,
        yAdvance: read(extents, DOUBLE_TYPE, 40) as number,
    };
};

Context.prototype.setFontOptions = function (options: FontOptions): Context {
    call(
        LIB,
        "cairo_set_font_options",
        [
            { type: CAIRO_T, value: this.id },
            { type: FONT_OPTIONS_T, value: (options as any)?.id ?? options },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.getFontOptions = function (): FontOptions {
    const options = new FontOptions();
    call(
        LIB,
        "cairo_get_font_options",
        [
            { type: CAIRO_T, value: this.id },
            { type: FONT_OPTIONS_T, value: (options as any)?.id ?? options },
        ],
        { type: "undefined" },
    );
    return options;
};

Context.prototype.setAntialias = function (antialias: Antialias): Context {
    call(
        LIB,
        "cairo_set_antialias",
        [
            { type: CAIRO_T, value: this.id },
            { type: { type: "int", size: 32, unsigned: false }, value: antialias },
        ],
        { type: "undefined" },
    );
    return this;
};

Context.prototype.getAntialias = function (): Antialias {
    return call(LIB, "cairo_get_antialias", [{ type: CAIRO_T, value: this.id }], {
        type: "int",
        size: 32,
        unsigned: false,
    }) as Antialias;
};

(Pattern as any).createLinear = (x0: number, y0: number, x1: number, y1: number): Pattern => {
    const ptr = call(
        LIB,
        "cairo_pattern_create_linear",
        [
            { type: DOUBLE_TYPE, value: x0 },
            { type: DOUBLE_TYPE, value: y0 },
            { type: DOUBLE_TYPE, value: x1 },
            { type: DOUBLE_TYPE, value: y1 },
        ],
        PATTERN_T,
    );
    return Pattern.fromPtr(ptr);
};

(Pattern as any).createRadial = (
    cx0: number,
    cy0: number,
    radius0: number,
    cx1: number,
    cy1: number,
    radius1: number,
): Pattern => {
    const ptr = call(
        LIB,
        "cairo_pattern_create_radial",
        [
            { type: DOUBLE_TYPE, value: cx0 },
            { type: DOUBLE_TYPE, value: cy0 },
            { type: DOUBLE_TYPE, value: radius0 },
            { type: DOUBLE_TYPE, value: cx1 },
            { type: DOUBLE_TYPE, value: cy1 },
            { type: DOUBLE_TYPE, value: radius1 },
        ],
        PATTERN_T,
    );
    return Pattern.fromPtr(ptr);
};

Pattern.prototype.addColorStopRgb = function (offset: number, red: number, green: number, blue: number): Pattern {
    call(
        LIB,
        "cairo_pattern_add_color_stop_rgb",
        [
            { type: PATTERN_T_BORROWED, value: this.id },
            { type: DOUBLE_TYPE, value: offset },
            { type: DOUBLE_TYPE, value: red },
            { type: DOUBLE_TYPE, value: green },
            { type: DOUBLE_TYPE, value: blue },
        ],
        { type: "undefined" },
    );
    return this;
};

Pattern.prototype.addColorStopRgba = function (
    offset: number,
    red: number,
    green: number,
    blue: number,
    alpha: number,
): Pattern {
    call(
        LIB,
        "cairo_pattern_add_color_stop_rgba",
        [
            { type: PATTERN_T_BORROWED, value: this.id },
            { type: DOUBLE_TYPE, value: offset },
            { type: DOUBLE_TYPE, value: red },
            { type: DOUBLE_TYPE, value: green },
            { type: DOUBLE_TYPE, value: blue },
            { type: DOUBLE_TYPE, value: alpha },
        ],
        { type: "undefined" },
    );
    return this;
};

// Override createPtr to allow `new FontOptions()` to work
(FontOptions.prototype as any).createPtr = (): unknown =>
    call(LIB, "cairo_font_options_create", [], {
        type: "boxed",
        innerType: "CairoFontOptions",
        lib: LIB_GOBJECT,
        getTypeFn: "cairo_gobject_font_options_get_type",
        borrowed: false,
    });

FontOptions.prototype.setHintStyle = function (hintStyle: number): FontOptions {
    call(
        LIB,
        "cairo_font_options_set_hint_style",
        [
            { type: FONT_OPTIONS_T, value: this.id },
            { type: { type: "int", size: 32, unsigned: false }, value: hintStyle },
        ],
        { type: "undefined" },
    );
    return this;
};

FontOptions.prototype.setAntialias = function (antialias: Antialias): FontOptions {
    call(
        LIB,
        "cairo_font_options_set_antialias",
        [
            { type: FONT_OPTIONS_T, value: this.id },
            { type: { type: "int", size: 32, unsigned: false }, value: antialias },
        ],
        { type: "undefined" },
    );
    return this;
};

FontOptions.prototype.setHintMetrics = function (hintMetrics: number): FontOptions {
    call(
        LIB,
        "cairo_font_options_set_hint_metrics",
        [
            { type: FONT_OPTIONS_T, value: this.id },
            { type: { type: "int", size: 32, unsigned: false }, value: hintMetrics },
        ],
        { type: "undefined" },
    );
    return this;
};

FontOptions.prototype.setSubpixelOrder = function (subpixelOrder: number): FontOptions {
    call(
        LIB,
        "cairo_font_options_set_subpixel_order",
        [
            { type: FONT_OPTIONS_T, value: this.id },
            { type: { type: "int", size: 32, unsigned: false }, value: subpixelOrder },
        ],
        { type: "undefined" },
    );
    return this;
};
