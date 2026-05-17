import { createRef, type NativeHandle } from "@gtkx/native";
import type { Content, Format, RectangleInt, Status, SurfaceType } from "../generated/cairo/cairo.js";
import { Device, Surface } from "../generated/cairo/cairo.js";
import { getHandle, setHandle } from "../handles.js";
import { alloc, read, t, write } from "../native.js";
import { getNativeObject } from "../registry.js";
import {
    callGetXY,
    DEVICE_T,
    DOUBLE_REF,
    DOUBLE_TYPE,
    INT_TYPE,
    LIB,
    RECT_INT_T,
    STRING_FULL,
    SURFACE_T,
    SURFACE_T_NONE,
    ULONG_TYPE,
} from "./common.js";
import { ImageSurface } from "./image-surface.js";

const { fn } = t;
const MIME_DATA_T = t.boxed("mime_data", "borrowed", LIB);
const MIME_DATA_REF = t.ref(t.boxed("guint8*", "borrowed", LIB));
const ULONG_REF = t.ref(ULONG_TYPE);
const IMAGE_DATA_T = t.struct("guint8*", "borrowed");

declare module "../generated/cairo/cairo.js" {
    interface Surface {
        finish(): void;
        createSimilar(content: "COLOR" | "ALPHA" | "COLOR_ALPHA", width: number, height: number): Surface;
        flush(): void;
        markDirty(): void;
        writeToPng(filename: string): void;
        getType(): SurfaceType;
        getContent(): Content;
    }
}

const cairo_surface_finish = fn(LIB, "cairo_surface_finish", [{ type: SURFACE_T_NONE }], t.void);
Surface.prototype.finish = function (): void {
    cairo_surface_finish(getHandle(this));
};

const CONTENT_MAP = {
    COLOR: 0x1000,
    ALPHA: 0x2000,
    COLOR_ALPHA: 0x3000,
} as const;

const cairo_surface_create_similar = fn(
    LIB,
    "cairo_surface_create_similar",
    [{ type: SURFACE_T_NONE }, { type: INT_TYPE }, { type: INT_TYPE }, { type: INT_TYPE }],
    SURFACE_T,
);
Surface.prototype.createSimilar = function (
    content: "COLOR" | "ALPHA" | "COLOR_ALPHA",
    width: number,
    height: number,
): Surface {
    const ptr = cairo_surface_create_similar(getHandle(this), CONTENT_MAP[content], width, height) as NativeHandle;
    return getNativeObject(ptr, Surface) as Surface;
};

const cairo_surface_flush = fn(LIB, "cairo_surface_flush", [{ type: SURFACE_T_NONE }], t.void);
Surface.prototype.flush = function (): void {
    cairo_surface_flush(getHandle(this));
};

const cairo_surface_mark_dirty = fn(LIB, "cairo_surface_mark_dirty", [{ type: SURFACE_T_NONE }], t.void);
Surface.prototype.markDirty = function (): void {
    cairo_surface_mark_dirty(getHandle(this));
};

const cairo_surface_write_to_png = fn(
    LIB,
    "cairo_surface_write_to_png",
    [{ type: SURFACE_T_NONE }, { type: STRING_FULL }],
    INT_TYPE,
);
Surface.prototype.writeToPng = function (filename: string): void {
    cairo_surface_write_to_png(getHandle(this), filename);
};

const cairo_surface_get_type = fn(LIB, "cairo_surface_get_type", [{ type: SURFACE_T_NONE }], INT_TYPE);
Surface.prototype.getType = function (): SurfaceType {
    return cairo_surface_get_type(getHandle(this)) as SurfaceType;
};

const cairo_surface_get_content = fn(LIB, "cairo_surface_get_content", [{ type: SURFACE_T_NONE }], INT_TYPE);
Surface.prototype.getContent = function (): Content {
    return cairo_surface_get_content(getHandle(this)) as Content;
};

declare module "../generated/cairo/cairo.js" {
    interface Surface {
        status(): Status;
        createSimilarImage(format: Format, width: number, height: number): ImageSurface;
        createForRectangle(x: number, y: number, width: number, height: number): Surface;
        setDeviceOffset(xOffset: number, yOffset: number): void;
        getDeviceOffset(): { x: number; y: number };
        setDeviceScale(xScale: number, yScale: number): void;
        getDeviceScale(): { x: number; y: number };
        setFallbackResolution(xPpi: number, yPpi: number): void;
        getFallbackResolution(): { x: number; y: number };
        markDirtyRectangle(x: number, y: number, width: number, height: number): void;
        copyPage(): void;
        showPage(): void;
        hasShowTextGlyphs(): boolean;
    }
}

const cairo_surface_status = fn(LIB, "cairo_surface_status", [{ type: SURFACE_T_NONE }], INT_TYPE);
Surface.prototype.status = function (): Status {
    return cairo_surface_status(getHandle(this)) as Status;
};

const cairo_surface_create_similar_image = fn(
    LIB,
    "cairo_surface_create_similar_image",
    [{ type: SURFACE_T_NONE }, { type: INT_TYPE }, { type: INT_TYPE }, { type: INT_TYPE }],
    SURFACE_T,
);
Surface.prototype.createSimilarImage = function (format: Format, width: number, height: number): ImageSurface {
    const ptr = cairo_surface_create_similar_image(getHandle(this), format, width, height) as NativeHandle;
    const surface = Object.create(ImageSurface.prototype) as ImageSurface;
    setHandle(surface, ptr);
    return surface;
};

const cairo_surface_create_for_rectangle = fn(
    LIB,
    "cairo_surface_create_for_rectangle",
    [
        { type: SURFACE_T_NONE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
        { type: DOUBLE_TYPE },
    ],
    SURFACE_T,
);
Surface.prototype.createForRectangle = function (x: number, y: number, width: number, height: number): Surface {
    const ptr = cairo_surface_create_for_rectangle(getHandle(this), x, y, width, height) as NativeHandle;
    return getNativeObject(ptr, Surface) as Surface;
};

const cairo_surface_set_device_offset = fn(
    LIB,
    "cairo_surface_set_device_offset",
    [{ type: SURFACE_T_NONE }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }],
    t.void,
);
Surface.prototype.setDeviceOffset = function (xOffset: number, yOffset: number): void {
    cairo_surface_set_device_offset(getHandle(this), xOffset, yOffset);
};

const cairo_surface_get_device_offset = fn(
    LIB,
    "cairo_surface_get_device_offset",
    [{ type: SURFACE_T_NONE }, { type: DOUBLE_REF }, { type: DOUBLE_REF }],
    t.void,
);
Surface.prototype.getDeviceOffset = function (): { x: number; y: number } {
    return callGetXY(getHandle(this), cairo_surface_get_device_offset);
};

const cairo_surface_set_device_scale = fn(
    LIB,
    "cairo_surface_set_device_scale",
    [{ type: SURFACE_T_NONE }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }],
    t.void,
);
Surface.prototype.setDeviceScale = function (xScale: number, yScale: number): void {
    cairo_surface_set_device_scale(getHandle(this), xScale, yScale);
};

const cairo_surface_get_device_scale = fn(
    LIB,
    "cairo_surface_get_device_scale",
    [{ type: SURFACE_T_NONE }, { type: DOUBLE_REF }, { type: DOUBLE_REF }],
    t.void,
);
Surface.prototype.getDeviceScale = function (): { x: number; y: number } {
    return callGetXY(getHandle(this), cairo_surface_get_device_scale);
};

const cairo_surface_set_fallback_resolution = fn(
    LIB,
    "cairo_surface_set_fallback_resolution",
    [{ type: SURFACE_T_NONE }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }],
    t.void,
);
Surface.prototype.setFallbackResolution = function (xPpi: number, yPpi: number): void {
    cairo_surface_set_fallback_resolution(getHandle(this), xPpi, yPpi);
};

const cairo_surface_get_fallback_resolution = fn(
    LIB,
    "cairo_surface_get_fallback_resolution",
    [{ type: SURFACE_T_NONE }, { type: DOUBLE_REF }, { type: DOUBLE_REF }],
    t.void,
);
Surface.prototype.getFallbackResolution = function (): { x: number; y: number } {
    return callGetXY(getHandle(this), cairo_surface_get_fallback_resolution);
};

const cairo_surface_mark_dirty_rectangle = fn(
    LIB,
    "cairo_surface_mark_dirty_rectangle",
    [{ type: SURFACE_T_NONE }, { type: INT_TYPE }, { type: INT_TYPE }, { type: INT_TYPE }, { type: INT_TYPE }],
    t.void,
);
Surface.prototype.markDirtyRectangle = function (x: number, y: number, width: number, height: number): void {
    cairo_surface_mark_dirty_rectangle(getHandle(this), x, y, width, height);
};

const cairo_surface_copy_page = fn(LIB, "cairo_surface_copy_page", [{ type: SURFACE_T_NONE }], t.void);
Surface.prototype.copyPage = function (): void {
    cairo_surface_copy_page(getHandle(this));
};

const cairo_surface_show_page = fn(LIB, "cairo_surface_show_page", [{ type: SURFACE_T_NONE }], t.void);
Surface.prototype.showPage = function (): void {
    cairo_surface_show_page(getHandle(this));
};

const cairo_surface_has_show_text_glyphs = fn(
    LIB,
    "cairo_surface_has_show_text_glyphs",
    [{ type: SURFACE_T_NONE }],
    t.boolean,
);
Surface.prototype.hasShowTextGlyphs = function (): boolean {
    return cairo_surface_has_show_text_glyphs(getHandle(this)) as boolean;
};

declare module "../generated/cairo/cairo.js" {
    interface Surface {
        setMimeData(mimeType: string, data: Uint8Array): void;
        getMimeData(mimeType: string): Uint8Array | null;
        supportsMimeType(mimeType: string): boolean;
        mapToImage(extents?: RectangleInt): ImageSurface;
        unmapImage(image: ImageSurface): void;
        getDevice(): Device | null;
    }
}

const cairo_surface_set_mime_data = fn(
    LIB,
    "cairo_surface_set_mime_data",
    [
        { type: SURFACE_T_NONE },
        { type: STRING_FULL },
        { type: MIME_DATA_T },
        { type: ULONG_TYPE },
        { type: t.uint64 },
        { type: t.uint64 },
    ],
    INT_TYPE,
);
Surface.prototype.setMimeData = function (mimeType: string, data: Uint8Array): void {
    const buf = alloc(data.length, "mime_data", LIB);
    for (let i = 0; i < data.length; i++) {
        write(buf, t.uint8, i, data[i]);
    }
    cairo_surface_set_mime_data(getHandle(this), mimeType, buf, data.length, 0, 0);
};

const cairo_surface_get_mime_data = fn(
    LIB,
    "cairo_surface_get_mime_data",
    [{ type: SURFACE_T_NONE }, { type: STRING_FULL }, { type: MIME_DATA_REF }, { type: ULONG_REF }],
    t.void,
);
Surface.prototype.getMimeData = function (mimeType: string): Uint8Array | null {
    const dataRef = createRef(null);
    const lengthRef = createRef(0);
    cairo_surface_get_mime_data(getHandle(this), mimeType, dataRef, lengthRef);
    const length = lengthRef.value;
    if (length === 0 || dataRef.value === null) return null;
    const result = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        result[i] = read(dataRef.value, t.uint8, i) as number;
    }
    return result;
};

const cairo_surface_supports_mime_type = fn(
    LIB,
    "cairo_surface_supports_mime_type",
    [{ type: SURFACE_T_NONE }, { type: STRING_FULL }],
    t.boolean,
);
Surface.prototype.supportsMimeType = function (mimeType: string): boolean {
    return cairo_surface_supports_mime_type(getHandle(this), mimeType) as boolean;
};

const cairo_surface_map_to_image_rect = fn(
    LIB,
    "cairo_surface_map_to_image",
    [{ type: SURFACE_T_NONE }, { type: RECT_INT_T }],
    SURFACE_T_NONE,
);
const cairo_surface_map_to_image_full = fn(
    LIB,
    "cairo_surface_map_to_image",
    [{ type: SURFACE_T_NONE }, { type: t.uint64 }],
    SURFACE_T_NONE,
);
Surface.prototype.mapToImage = function (extents?: RectangleInt): ImageSurface {
    const ptr = extents
        ? cairo_surface_map_to_image_rect(getHandle(this), getHandle(extents))
        : cairo_surface_map_to_image_full(getHandle(this), 0);
    const surface = Object.create(ImageSurface.prototype) as ImageSurface;
    setHandle(surface, ptr as NativeHandle);
    return surface;
};

const cairo_surface_unmap_image = fn(
    LIB,
    "cairo_surface_unmap_image",
    [{ type: SURFACE_T_NONE }, { type: SURFACE_T_NONE }],
    t.void,
);
Surface.prototype.unmapImage = function (image: ImageSurface): void {
    cairo_surface_unmap_image(getHandle(this), getHandle(image));
};

const cairo_surface_get_device = fn(LIB, "cairo_surface_get_device", [{ type: SURFACE_T_NONE }], DEVICE_T);
Surface.prototype.getDevice = function (): Device | null {
    const ptr = cairo_surface_get_device(getHandle(this)) as NativeHandle | null;
    if (ptr === null) return null;
    return getNativeObject(ptr, Device) as Device;
};

const cairo_image_surface_get_data = fn(LIB, "cairo_image_surface_get_data", [{ type: SURFACE_T_NONE }], IMAGE_DATA_T);

export const imageCreateForData = (
    data: Uint8Array,
    format: Format,
    width: number,
    height: number,
    stride: number,
): ImageSurface => {
    const surface = ImageSurface.create(format, width, height);
    surface.flush();
    const actualStride = surface.getStride();
    const ptr = cairo_image_surface_get_data(getHandle(surface)) as NativeHandle;
    const rowBytes = Math.min(stride, actualStride);
    for (let row = 0; row < height; row++) {
        const srcOffset = row * stride;
        const dstOffset = row * actualStride;
        for (let col = 0; col < rowBytes; col++) {
            if (srcOffset + col < data.length) {
                write(ptr, t.uint8, dstOffset + col, data[srcOffset + col]);
            }
        }
    }
    surface.markDirty();
    return surface;
};
