import type { NativeHandle } from "@gtkx/native";
import { Surface } from "../generated/cairo/cairo.js";
import { getHandle } from "../handles.js";
import { t } from "../native.js";
import { wrapHandle } from "../registry.js";
import { fileSurfaceCreate, INT_TYPE, LIB, SURFACE_T_NONE } from "./common.js";
import { enumListGetter, enumToStringFn } from "./enum-helpers.js";

const { fn } = t;

export enum SvgUnit {
    USER = 0,
    EM = 1,
    EX = 2,
    PX = 3,
    IN = 4,
    CM = 5,
    MM = 6,
    PT = 7,
    PC = 8,
    PERCENT = 9,
}

export enum SvgVersion {
    VERSION_1_1 = 0,
    VERSION_1_2 = 1,
}

const cairo_svg_surface_create = fileSurfaceCreate("cairo_svg_surface_create");
const cairo_svg_surface_set_document_unit = fn(
    LIB,
    "cairo_svg_surface_set_document_unit",
    [{ type: SURFACE_T_NONE }, { type: INT_TYPE }],
    t.void,
);
const cairo_svg_surface_get_document_unit = fn(
    LIB,
    "cairo_svg_surface_get_document_unit",
    [{ type: SURFACE_T_NONE }],
    INT_TYPE,
);
const cairo_svg_surface_restrict_to_version = fn(
    LIB,
    "cairo_svg_surface_restrict_to_version",
    [{ type: SURFACE_T_NONE }, { type: INT_TYPE }],
    t.void,
);

export class SvgSurface extends Surface {
    declare setDocumentUnit: (unit: SvgUnit) => void;
    declare getDocumentUnit: () => SvgUnit;
    declare restrictToVersion: (version: SvgVersion) => void;

    static create(filename: string, widthInPoints: number, heightInPoints: number): SvgSurface {
        return wrapHandle(
            SvgSurface,
            cairo_svg_surface_create(filename, widthInPoints, heightInPoints) as NativeHandle,
        );
    }
}

SvgSurface.prototype.setDocumentUnit = function (this: SvgSurface, unit: SvgUnit): void {
    cairo_svg_surface_set_document_unit(getHandle(this), unit);
};

SvgSurface.prototype.getDocumentUnit = function (this: SvgSurface): SvgUnit {
    return cairo_svg_surface_get_document_unit(getHandle(this)) as SvgUnit;
};

SvgSurface.prototype.restrictToVersion = function (this: SvgSurface, version: SvgVersion): void {
    cairo_svg_surface_restrict_to_version(getHandle(this), version);
};

export const svgGetVersions = enumListGetter<SvgVersion>("cairo_svg_get_versions");

export const svgVersionToString = enumToStringFn<SvgVersion>("cairo_svg_version_to_string");
