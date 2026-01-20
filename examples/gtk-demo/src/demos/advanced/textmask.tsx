import { type Context, Pattern } from "@gtkx/ffi/cairo";
import type * as Gtk from "@gtkx/ffi/gtk";
import * as Pango from "@gtkx/ffi/pango";
import * as PangoCairo from "@gtkx/ffi/pangocairo";
import { GtkDrawingArea } from "@gtkx/react";
import { useCallback } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./textmask.tsx?raw";

const TextmaskDemo = () => {
    const drawFunc = useCallback((_area: Gtk.DrawingArea, cr: Context, width: number, height: number) => {
        cr.save();

        const layout = PangoCairo.createLayout(cr);
        const fontDesc = Pango.FontDescription.fromString("sans bold 34");
        layout.setFontDescription(fontDesc);
        layout.setText("Pango power!\nPango power!\nPango power!", -1);

        cr.moveTo(30, 20);
        PangoCairo.layoutPath(cr, layout);

        const pattern = Pattern.createLinear(0, 0, width, height);
        pattern.addColorStopRgb(0.0, 1.0, 0.0, 0.0);
        pattern.addColorStopRgb(0.2, 1.0, 0.0, 0.0);
        pattern.addColorStopRgb(0.3, 1.0, 1.0, 0.0);
        pattern.addColorStopRgb(0.4, 0.0, 1.0, 0.0);
        pattern.addColorStopRgb(0.6, 0.0, 1.0, 1.0);
        pattern.addColorStopRgb(0.7, 0.0, 0.0, 1.0);
        pattern.addColorStopRgb(0.8, 1.0, 0.0, 1.0);
        pattern.addColorStopRgb(1.0, 1.0, 0.0, 1.0);

        cr.setSource(pattern);
        cr.fillPreserve();

        cr.setSourceRgb(0, 0, 0);
        cr.setLineWidth(0.5);
        cr.stroke();

        cr.restore();
    }, []);

    return <GtkDrawingArea onDraw={drawFunc} widthRequest={400} heightRequest={240} />;
};

export const textmaskDemo: Demo = {
    id: "textmask",
    title: "Pango/Text Mask",
    description: "This demo shows how to use PangoCairo to draw text with more than just a single color.",
    keywords: ["text", "mask", "clip", "gradient", "cairo", "pango"],
    component: TextmaskDemo,
    sourceCode,
};
