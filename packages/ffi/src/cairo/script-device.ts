import type { NativeHandle } from "@gtkx/native";
import type { Content } from "../generated/cairo/cairo.js";
import { Device, Surface } from "../generated/cairo/cairo.js";
import { getHandle } from "../handles.js";
import { t } from "../native.js";
import { getNativeObject, wrapHandle } from "../registry.js";
import {
    DEVICE_T,
    DEVICE_T_FULL,
    DOUBLE_TYPE,
    INT_TYPE,
    LIB,
    STRING_FULL,
    SURFACE_T,
    SURFACE_T_NONE,
} from "./common.js";

const { fn } = t;

export enum ScriptMode {
    ASCII = 0,
    BINARY = 1,
}

const cairo_script_create = fn(LIB, "cairo_script_create", [{ type: STRING_FULL }], DEVICE_T_FULL);
const cairo_script_set_mode = fn(LIB, "cairo_script_set_mode", [{ type: DEVICE_T }, { type: INT_TYPE }], t.void);
const cairo_script_get_mode = fn(LIB, "cairo_script_get_mode", [{ type: DEVICE_T }], INT_TYPE);
const cairo_script_write_comment = fn(
    LIB,
    "cairo_script_write_comment",
    [{ type: DEVICE_T }, { type: STRING_FULL }, { type: INT_TYPE }],
    t.void,
);
const cairo_script_surface_create = fn(
    LIB,
    "cairo_script_surface_create",
    [{ type: DEVICE_T }, { type: INT_TYPE }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }],
    SURFACE_T,
);
const cairo_script_surface_create_for_target = fn(
    LIB,
    "cairo_script_surface_create_for_target",
    [{ type: DEVICE_T }, { type: SURFACE_T_NONE }],
    SURFACE_T,
);

export class ScriptDevice extends Device {
    static create(filename: string): ScriptDevice {
        return wrapHandle(ScriptDevice, cairo_script_create(filename) as NativeHandle);
    }

    setMode(mode: ScriptMode): void {
        cairo_script_set_mode(getHandle(this), mode);
    }

    getMode(): ScriptMode {
        return cairo_script_get_mode(getHandle(this)) as ScriptMode;
    }

    writeComment(comment: string): void {
        const utf8 = new TextEncoder().encode(comment);
        cairo_script_write_comment(getHandle(this), comment, utf8.length);
    }

    createScriptSurface(content: Content, width: number, height: number): Surface {
        const ptr = cairo_script_surface_create(getHandle(this), content, width, height) as NativeHandle;
        return getNativeObject(ptr, Surface) as Surface;
    }

    createScriptSurfaceForTarget(target: Surface): Surface {
        const ptr = cairo_script_surface_create_for_target(getHandle(this), getHandle(target)) as NativeHandle;
        return getNativeObject(ptr, Surface) as Surface;
    }
}
