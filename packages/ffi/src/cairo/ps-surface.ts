import type { NativeHandle } from "@gtkx/native";
import { Surface } from "../generated/cairo/cairo.js";
import { getHandle } from "../handles.js";
import { t } from "../native.js";
import { wrapHandle } from "../registry.js";
import { DOUBLE_TYPE, fileSurfaceCreate, INT_TYPE, LIB, STRING_FULL, SURFACE_T_NONE } from "./common.js";
import { enumListGetter, enumToStringFn } from "./enum-helpers.js";

const { fn } = t;

export enum PsLevel {
    LEVEL_2 = 0,
    LEVEL_3 = 1,
}

const cairo_ps_surface_create = fileSurfaceCreate("cairo_ps_surface_create");
const cairo_ps_surface_set_size = fn(
    LIB,
    "cairo_ps_surface_set_size",
    [{ type: SURFACE_T_NONE }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }],
    t.void,
);
const cairo_ps_surface_set_eps = fn(
    LIB,
    "cairo_ps_surface_set_eps",
    [{ type: SURFACE_T_NONE }, { type: t.boolean }],
    t.void,
);
const cairo_ps_surface_get_eps = fn(LIB, "cairo_ps_surface_get_eps", [{ type: SURFACE_T_NONE }], t.boolean);
const cairo_ps_surface_restrict_to_level = fn(
    LIB,
    "cairo_ps_surface_restrict_to_level",
    [{ type: SURFACE_T_NONE }, { type: INT_TYPE }],
    t.void,
);
const cairo_ps_surface_dsc_comment = fn(
    LIB,
    "cairo_ps_surface_dsc_comment",
    [{ type: SURFACE_T_NONE }, { type: STRING_FULL }],
    t.void,
);
const cairo_ps_surface_dsc_begin_setup = fn(
    LIB,
    "cairo_ps_surface_dsc_begin_setup",
    [{ type: SURFACE_T_NONE }],
    t.void,
);
const cairo_ps_surface_dsc_begin_page_setup = fn(
    LIB,
    "cairo_ps_surface_dsc_begin_page_setup",
    [{ type: SURFACE_T_NONE }],
    t.void,
);

const psGetLevels = enumListGetter<PsLevel>("cairo_ps_get_levels");
const psLevelToString = enumToStringFn<PsLevel>("cairo_ps_level_to_string");

export class PsSurface extends Surface {
    static create(filename: string, widthInPoints: number, heightInPoints: number): PsSurface {
        return wrapHandle(PsSurface, cairo_ps_surface_create(filename, widthInPoints, heightInPoints) as NativeHandle);
    }

    setSize(widthInPoints: number, heightInPoints: number): void {
        cairo_ps_surface_set_size(getHandle(this), widthInPoints, heightInPoints);
    }

    setEps(eps: boolean): void {
        cairo_ps_surface_set_eps(getHandle(this), eps);
    }

    getEps(): boolean {
        return cairo_ps_surface_get_eps(getHandle(this)) as boolean;
    }

    restrictToLevel(level: PsLevel): void {
        cairo_ps_surface_restrict_to_level(getHandle(this), level);
    }

    dscComment(comment: string): void {
        cairo_ps_surface_dsc_comment(getHandle(this), comment);
    }

    dscBeginSetup(): void {
        cairo_ps_surface_dsc_begin_setup(getHandle(this));
    }

    dscBeginPageSetup(): void {
        cairo_ps_surface_dsc_begin_page_setup(getHandle(this));
    }

    static getLevels(): PsLevel[] {
        return psGetLevels();
    }

    static levelToString(level: PsLevel): string {
        return psLevelToString(level);
    }
}
