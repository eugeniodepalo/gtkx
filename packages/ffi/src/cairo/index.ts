export * from "../generated/cairo/cairo.js";

import "./device.js";
import "./font-face.js";
import "./scaled-font.js";

export type { CairoGlyph, CairoTextCluster, PathData } from "./common.js";
export { Context, type FontExtents, statusToString, type TextExtents } from "./context.js";
export { FontOptions } from "./font-options.js";
export { ImageSurface } from "./image-surface.js";
export { Matrix } from "./matrix.js";
export { Dither, LinearPattern, MeshPattern, RadialPattern, SolidPattern, SurfacePattern } from "./pattern.js";
export {
    PdfMetadata,
    PdfOutlineFlags,
    PdfSurface,
    PdfVersion,
    pdfGetVersions,
    pdfVersionToString,
} from "./pdf-surface.js";
export { PsLevel, PsSurface } from "./ps-surface.js";
export { RecordingSurface } from "./recording-surface.js";
export { Region } from "./region.js";
export { ScriptDevice, ScriptMode } from "./script-device.js";
export { imageCreateForData } from "./surface.js";
export { SvgSurface, SvgUnit, SvgVersion, svgGetVersions, svgVersionToString } from "./svg-surface.js";
export { TeeSurface } from "./tee-surface.js";
export { cairoVersion, cairoVersionString } from "./utilities.js";
