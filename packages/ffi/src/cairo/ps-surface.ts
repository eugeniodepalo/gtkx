import { Surface } from "../generated/cairo/surface.js";
import { call, t } from "../native.js";
import { createFileSurface, DOUBLE_TYPE, INT_TYPE, LIB, SURFACE_T_NONE } from "./common.js";
import { enumToString, getEnumList } from "./enum-helpers.js";

export enum PsLevel {
    LEVEL_2 = 0,
    LEVEL_3 = 1,
}

export class PsSurface extends Surface {
    static override readonly glibTypeName: string = "CairoSurface";

    constructor(filename: string, widthInPoints: number, heightInPoints: number) {
        super(createFileSurface("cairo_ps_surface_create", filename, widthInPoints, heightInPoints));
    }

    setSize(widthInPoints: number, heightInPoints: number): void {
        call(
            LIB,
            "cairo_ps_surface_set_size",
            [
                { type: SURFACE_T_NONE, value: this.handle },
                { type: DOUBLE_TYPE, value: widthInPoints },
                { type: DOUBLE_TYPE, value: heightInPoints },
            ],
            t.void,
        );
    }

    setEps(eps: boolean): void {
        call(
            LIB,
            "cairo_ps_surface_set_eps",
            [
                { type: SURFACE_T_NONE, value: this.handle },
                { type: t.boolean, value: eps },
            ],
            t.void,
        );
    }

    getEps(): boolean {
        return call(
            LIB,
            "cairo_ps_surface_get_eps",
            [{ type: SURFACE_T_NONE, value: this.handle }],
            t.boolean,
        ) as boolean;
    }

    restrictToLevel(level: PsLevel): void {
        call(
            LIB,
            "cairo_ps_surface_restrict_to_level",
            [
                { type: SURFACE_T_NONE, value: this.handle },
                { type: INT_TYPE, value: level },
            ],
            t.void,
        );
    }

    dscComment(comment: string): void {
        call(
            LIB,
            "cairo_ps_surface_dsc_comment",
            [
                { type: SURFACE_T_NONE, value: this.handle },
                { type: t.string("full"), value: comment },
            ],
            t.void,
        );
    }

    dscBeginSetup(): void {
        call(LIB, "cairo_ps_surface_dsc_begin_setup", [{ type: SURFACE_T_NONE, value: this.handle }], t.void);
    }

    dscBeginPageSetup(): void {
        call(LIB, "cairo_ps_surface_dsc_begin_page_setup", [{ type: SURFACE_T_NONE, value: this.handle }], t.void);
    }

    static getLevels(): PsLevel[] {
        return getEnumList<PsLevel>("cairo_ps_get_levels");
    }

    static levelToString(level: PsLevel): string {
        return enumToString("cairo_ps_level_to_string", level);
    }
}
