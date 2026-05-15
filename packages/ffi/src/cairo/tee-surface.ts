import type { NativeHandle } from "@gtkx/native";
import { Surface } from "../generated/cairo/cairo.js";
import { getHandle } from "../handles.js";
import { call, t } from "../native.js";
import { wrapHandle } from "../registry.js";
import { LIB, SURFACE_T, SURFACE_T_NONE } from "./common.js";

export class TeeSurface extends Surface {
    static create(primary: Surface): TeeSurface {
        const handle = call(
            LIB,
            "cairo_tee_surface_create",
            [{ type: SURFACE_T_NONE, value: getHandle(primary) }],
            SURFACE_T,
        ) as NativeHandle;
        return wrapHandle(TeeSurface, handle);
    }

    add(target: Surface): void {
        call(
            LIB,
            "cairo_tee_surface_add",
            [
                { type: SURFACE_T_NONE, value: getHandle(this) },
                { type: SURFACE_T_NONE, value: getHandle(target) },
            ],
            t.void,
        );
    }

    remove(target: Surface): void {
        call(
            LIB,
            "cairo_tee_surface_remove",
            [
                { type: SURFACE_T_NONE, value: getHandle(this) },
                { type: SURFACE_T_NONE, value: getHandle(target) },
            ],
            t.void,
        );
    }
}
