import type { NativeHandle } from "@gtkx/native";
import { Surface } from "../generated/cairo/cairo.js";
import { getHandle } from "../handles.js";
import { t } from "../native.js";
import { wrapHandle } from "../registry.js";
import { LIB, SURFACE_T, SURFACE_T_NONE } from "./common.js";

const { fn } = t;

const cairo_tee_surface_create = fn(LIB, "cairo_tee_surface_create", [{ type: SURFACE_T_NONE }], SURFACE_T);
const cairo_tee_surface_add = fn(
    LIB,
    "cairo_tee_surface_add",
    [{ type: SURFACE_T_NONE }, { type: SURFACE_T_NONE }],
    t.void,
);
const cairo_tee_surface_remove = fn(
    LIB,
    "cairo_tee_surface_remove",
    [{ type: SURFACE_T_NONE }, { type: SURFACE_T_NONE }],
    t.void,
);

export class TeeSurface extends Surface {
    static create(primary: Surface): TeeSurface {
        return wrapHandle(TeeSurface, cairo_tee_surface_create(getHandle(primary)) as NativeHandle);
    }

    add(target: Surface): void {
        cairo_tee_surface_add(getHandle(this), getHandle(target));
    }

    remove(target: Surface): void {
        cairo_tee_surface_remove(getHandle(this), getHandle(target));
    }
}
