import type { NativeHandle } from "@gtkx/native";
import { Surface } from "../generated/cairo/cairo.js";
import { call, t } from "../native.js";
import { wrapHandle } from "../object.js";
import { LIB, SURFACE_T, SURFACE_T_NONE } from "./common.js";

export class TeeSurface extends Surface {
    static create(primary: Surface): TeeSurface {
        const handle = call(
            LIB,
            "cairo_tee_surface_create",
            [{ type: SURFACE_T_NONE, value: primary.handle }],
            SURFACE_T,
        ) as NativeHandle;
        return wrapHandle(TeeSurface, handle);
    }

    add(target: Surface): void {
        call(
            LIB,
            "cairo_tee_surface_add",
            [
                { type: SURFACE_T_NONE, value: this.handle },
                { type: SURFACE_T_NONE, value: target.handle },
            ],
            t.void,
        );
    }

    remove(target: Surface): void {
        call(
            LIB,
            "cairo_tee_surface_remove",
            [
                { type: SURFACE_T_NONE, value: this.handle },
                { type: SURFACE_T_NONE, value: target.handle },
            ],
            t.void,
        );
    }
}
