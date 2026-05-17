import type { NativeHandle } from "@gtkx/native";
import type { FontSlant, FontType, FontWeight, Status } from "../generated/cairo/cairo.js";
import { FontFace } from "../generated/cairo/cairo.js";
import { getHandle } from "../handles.js";
import { t } from "../native.js";
import { getNativeObject } from "../registry.js";
import { FONT_FACE_T, FONT_FACE_T_NONE, INT_TYPE, LIB, STRING_BORROWED, STRING_FULL } from "./common.js";

const { fn } = t;
const FC_PATTERN_T = t.boxed("FcPattern", "borrowed", LIB);
const FT_FACE_T = t.boxed("FT_Face", "borrowed", LIB);

declare module "../generated/cairo/cairo.js" {
    interface FontFace {
        status(): Status;
        getType(): FontType;
        toyGetFamily(): string;
        toyGetSlant(): FontSlant;
        toyGetWeight(): FontWeight;
    }

    namespace FontFace {
        function createToy(family: string, slant: FontSlant, weight: FontWeight): FontFace;
    }
}

type FontFaceStatic = {
    createToy(family: string, slant: FontSlant, weight: FontWeight): FontFace;
    createFromFcPattern(pattern: NativeHandle): FontFace;
    createFromFtFace(ftFace: NativeHandle, loadFlags: number): FontFace;
};

const FontFaceWithStatics = FontFace as typeof FontFace & FontFaceStatic;

const cairo_toy_font_face_create = fn(
    LIB,
    "cairo_toy_font_face_create",
    [{ type: STRING_FULL }, { type: INT_TYPE }, { type: INT_TYPE }],
    FONT_FACE_T,
);
FontFaceWithStatics.createToy = (family: string, slant: FontSlant, weight: FontWeight): FontFace => {
    const ptr = cairo_toy_font_face_create(family, slant, weight) as NativeHandle;
    return getNativeObject(ptr, FontFace) as FontFace;
};

const cairo_font_face_status = fn(LIB, "cairo_font_face_status", [{ type: FONT_FACE_T_NONE }], INT_TYPE);
FontFace.prototype.status = function (): Status {
    return cairo_font_face_status(getHandle(this)) as Status;
};

const cairo_font_face_get_type = fn(LIB, "cairo_font_face_get_type", [{ type: FONT_FACE_T_NONE }], INT_TYPE);
FontFace.prototype.getType = function (): FontType {
    return cairo_font_face_get_type(getHandle(this)) as FontType;
};

const cairo_toy_font_face_get_family = fn(
    LIB,
    "cairo_toy_font_face_get_family",
    [{ type: FONT_FACE_T_NONE }],
    STRING_BORROWED,
);
FontFace.prototype.toyGetFamily = function (): string {
    return cairo_toy_font_face_get_family(getHandle(this)) as string;
};

const cairo_toy_font_face_get_slant = fn(LIB, "cairo_toy_font_face_get_slant", [{ type: FONT_FACE_T_NONE }], INT_TYPE);
FontFace.prototype.toyGetSlant = function (): FontSlant {
    return cairo_toy_font_face_get_slant(getHandle(this)) as FontSlant;
};

const cairo_toy_font_face_get_weight = fn(
    LIB,
    "cairo_toy_font_face_get_weight",
    [{ type: FONT_FACE_T_NONE }],
    INT_TYPE,
);
FontFace.prototype.toyGetWeight = function (): FontWeight {
    return cairo_toy_font_face_get_weight(getHandle(this)) as FontWeight;
};

declare module "../generated/cairo/cairo.js" {
    interface FontFace {
        ftGetSynthesize(): number;
        ftSetSynthesize(flags: number): void;
        ftUnsetSynthesize(flags: number): void;
    }

    namespace FontFace {
        function createFromFcPattern(pattern: NativeHandle): FontFace;
        function createFromFtFace(ftFace: NativeHandle, loadFlags: number): FontFace;
    }
}

const cairo_ft_font_face_create_for_pattern = fn(
    LIB,
    "cairo_ft_font_face_create_for_pattern",
    [{ type: FC_PATTERN_T }],
    FONT_FACE_T,
);
FontFaceWithStatics.createFromFcPattern = (pattern: NativeHandle): FontFace => {
    const ptr = cairo_ft_font_face_create_for_pattern(pattern) as NativeHandle;
    return getNativeObject(ptr, FontFace) as FontFace;
};

const cairo_ft_font_face_create_for_ft_face = fn(
    LIB,
    "cairo_ft_font_face_create_for_ft_face",
    [{ type: FT_FACE_T }, { type: INT_TYPE }],
    FONT_FACE_T,
);
FontFaceWithStatics.createFromFtFace = (ftFace: NativeHandle, loadFlags: number): FontFace => {
    const ptr = cairo_ft_font_face_create_for_ft_face(ftFace, loadFlags) as NativeHandle;
    return getNativeObject(ptr, FontFace) as FontFace;
};

const cairo_ft_font_face_get_synthesize = fn(
    LIB,
    "cairo_ft_font_face_get_synthesize",
    [{ type: FONT_FACE_T_NONE }],
    INT_TYPE,
);
FontFace.prototype.ftGetSynthesize = function (): number {
    return cairo_ft_font_face_get_synthesize(getHandle(this)) as number;
};

const cairo_ft_font_face_set_synthesize = fn(
    LIB,
    "cairo_ft_font_face_set_synthesize",
    [{ type: FONT_FACE_T_NONE }, { type: INT_TYPE }],
    t.void,
);
FontFace.prototype.ftSetSynthesize = function (flags: number): void {
    cairo_ft_font_face_set_synthesize(getHandle(this), flags);
};

const cairo_ft_font_face_unset_synthesize = fn(
    LIB,
    "cairo_ft_font_face_unset_synthesize",
    [{ type: FONT_FACE_T_NONE }, { type: INT_TYPE }],
    t.void,
);
FontFace.prototype.ftUnsetSynthesize = function (flags: number): void {
    cairo_ft_font_face_unset_synthesize(getHandle(this), flags);
};
