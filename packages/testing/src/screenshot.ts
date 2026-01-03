import * as Gsk from "@gtkx/ffi/gsk";
import * as Gtk from "@gtkx/ffi/gtk";
import type { ScreenshotResult } from "./types.js";

const bytesToBase64 = (bytes: number[]): string => {
    return Buffer.from(bytes).toString("base64");
};

/**
 * Captures a screenshot of a GTK widget as a PNG image.
 *
 * @param widget - The widget to capture (typically a Window)
 * @returns Screenshot result containing base64-encoded PNG data and dimensions
 * @throws Error if widget has no size, is not realized, or rendering fails
 *
 * @example
 * ```tsx
 * import { render, screenshot } from "@gtkx/testing";
 * import * as Gtk from "@gtkx/ffi/gtk";
 *
 * const { container } = await render(<MyApp />);
 * const window = container.getWindows()[0];
 * const result = screenshot(window);
 * console.log(result.mimeType); // "image/png"
 * ```
 */
export const screenshot = (widget: Gtk.Widget): ScreenshotResult => {
    const paintable = new Gtk.WidgetPaintable(widget);
    const width = paintable.getIntrinsicWidth();
    const height = paintable.getIntrinsicHeight();

    if (width <= 0 || height <= 0) {
        throw new Error("Widget has no size - ensure it is realized and visible");
    }

    const snapshot = new Gtk.Snapshot();
    paintable.snapshot(snapshot, width, height);
    const renderNode = snapshot.toNode();

    if (!renderNode) {
        throw new Error("Widget produced no render content");
    }

    const display = widget.getDisplay();
    if (!display) {
        throw new Error("Widget has no display - ensure it is realized");
    }

    const renderer = new Gsk.CairoRenderer();
    renderer.realizeForDisplay(display);

    try {
        const texture = renderer.renderTexture(renderNode);
        const pngBytes = texture.saveToPngBytes();
        const data = pngBytes.getData();

        if (!data) {
            throw new Error("Failed to serialize screenshot to PNG");
        }

        return {
            data: bytesToBase64(data),
            mimeType: "image/png",
            width,
            height,
        };
    } finally {
        renderer.unrealize();
    }
};
