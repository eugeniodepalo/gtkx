import type { NativeHandle } from "@gtkx/native";
import { Surface } from "../generated/cairo/cairo.js";
import { getHandle } from "../handles.js";
import { t } from "../native.js";
import { wrapHandle } from "../registry.js";
import { DOUBLE_TYPE, fileSurfaceCreate, INT_TYPE, LIB, STRING_FULL, SURFACE_T_NONE } from "./common.js";
import { enumListGetter, enumToStringFn } from "./enum-helpers.js";

const { fn } = t;

export enum PdfMetadata {
    TITLE = 0,
    AUTHOR = 1,
    SUBJECT = 2,
    KEYWORDS = 3,
    CREATOR = 4,
    CREATE_DATE = 5,
    MOD_DATE = 6,
}

export enum PdfVersion {
    VERSION_1_4 = 0,
    VERSION_1_5 = 1,
    VERSION_1_6 = 2,
    VERSION_1_7 = 3,
    VERSION_2_0 = 4,
}

export enum PdfOutlineFlags {
    OPEN = 1,
    BOLD = 2,
    ITALIC = 4,
}

const cairo_pdf_surface_create = fileSurfaceCreate("cairo_pdf_surface_create");
const cairo_pdf_surface_set_size = fn(
    LIB,
    "cairo_pdf_surface_set_size",
    [{ type: SURFACE_T_NONE }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }],
    t.void,
);
const cairo_pdf_surface_set_metadata = fn(
    LIB,
    "cairo_pdf_surface_set_metadata",
    [{ type: SURFACE_T_NONE }, { type: INT_TYPE }, { type: STRING_FULL }],
    t.void,
);
const cairo_pdf_surface_set_page_label = fn(
    LIB,
    "cairo_pdf_surface_set_page_label",
    [{ type: SURFACE_T_NONE }, { type: STRING_FULL }],
    t.void,
);
const cairo_pdf_surface_set_thumbnail_size = fn(
    LIB,
    "cairo_pdf_surface_set_thumbnail_size",
    [{ type: SURFACE_T_NONE }, { type: INT_TYPE }, { type: INT_TYPE }],
    t.void,
);
const cairo_pdf_surface_restrict_to_version = fn(
    LIB,
    "cairo_pdf_surface_restrict_to_version",
    [{ type: SURFACE_T_NONE }, { type: INT_TYPE }],
    t.void,
);
const cairo_pdf_surface_add_outline = fn(
    LIB,
    "cairo_pdf_surface_add_outline",
    [{ type: SURFACE_T_NONE }, { type: INT_TYPE }, { type: STRING_FULL }, { type: STRING_FULL }, { type: INT_TYPE }],
    INT_TYPE,
);

export class PdfSurface extends Surface {
    declare restrictToVersion: (version: PdfVersion) => void;
    declare addOutline: (parentId: number, name: string, linkAttribs: string, flags: PdfOutlineFlags) => number;

    /**
     * Creates a PDF surface that writes its output to the given filename.
     */
    static create(filename: string, widthInPoints: number, heightInPoints: number): PdfSurface {
        return wrapHandle(
            PdfSurface,
            cairo_pdf_surface_create(filename, widthInPoints, heightInPoints) as NativeHandle,
        );
    }

    setSize(widthInPoints: number, heightInPoints: number): void {
        cairo_pdf_surface_set_size(getHandle(this), widthInPoints, heightInPoints);
    }

    setMetadata(metadata: PdfMetadata, value: string): void {
        cairo_pdf_surface_set_metadata(getHandle(this), metadata, value);
    }

    setPageLabel(label: string): void {
        cairo_pdf_surface_set_page_label(getHandle(this), label);
    }

    setThumbnailSize(width: number, height: number): void {
        cairo_pdf_surface_set_thumbnail_size(getHandle(this), width, height);
    }
}

PdfSurface.prototype.restrictToVersion = function (this: PdfSurface, version: PdfVersion): void {
    cairo_pdf_surface_restrict_to_version(getHandle(this), version);
};

PdfSurface.prototype.addOutline = function (
    this: PdfSurface,
    parentId: number,
    name: string,
    linkAttribs: string,
    flags: PdfOutlineFlags,
): number {
    return cairo_pdf_surface_add_outline(getHandle(this), parentId, name, linkAttribs, flags) as number;
};

export const pdfGetVersions = enumListGetter<PdfVersion>("cairo_pdf_get_versions");

export const pdfVersionToString = enumToStringFn<PdfVersion>("cairo_pdf_version_to_string");
