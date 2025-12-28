import * as cairo from "@gtkx/ffi/cairo";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkDrawingArea, GtkFrame, GtkLabel } from "@gtkx/react";
import { useEffect, useRef } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./path-fill.tsx?raw";

// Draw a complex path with solid fill
const drawSolidFill = (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const size = Math.min(width, height) * 0.4;

    // Create a heart shape using bezier curves
    cairo.save(cr);
    cairo.translate(cr, centerX, centerY);

    cairo.moveTo(cr, 0, -size * 0.3);
    cairo.curveTo(cr, -size * 0.8, -size, -size * 0.8, size * 0.2, 0, size * 0.6);
    cairo.curveTo(cr, size * 0.8, size * 0.2, size * 0.8, -size, 0, -size * 0.3);
    cairo.closePath(cr);

    // Fill with solid color
    cairo.setSourceRgb(cr, 0.9, 0.2, 0.3);
    cairo.fillPreserve(cr);

    // Stroke outline
    cairo.setSourceRgb(cr, 0.7, 0.1, 0.2);
    cairo.setLineWidth(cr, 3);
    cairo.stroke(cr);

    cairo.restore(cr);
};

// Draw with linear gradient fill
const drawLinearGradient = (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
    const padding = 20;
    const rectWidth = width - padding * 2;
    const rectHeight = height - padding * 2;

    // Create linear gradient
    const gradient = cairo.patternCreateLinear(padding, padding, padding + rectWidth, padding + rectHeight);
    cairo.patternAddColorStopRgb(gradient, 0, 0.2, 0.4, 0.8);
    cairo.patternAddColorStopRgb(gradient, 0.5, 0.5, 0.2, 0.7);
    cairo.patternAddColorStopRgb(gradient, 1, 0.9, 0.3, 0.5);

    // Draw rounded rectangle path
    const radius = 20;
    cairo.moveTo(cr, padding + radius, padding);
    cairo.lineTo(cr, padding + rectWidth - radius, padding);
    cairo.arc(cr, padding + rectWidth - radius, padding + radius, radius, -Math.PI / 2, 0);
    cairo.lineTo(cr, padding + rectWidth, padding + rectHeight - radius);
    cairo.arc(cr, padding + rectWidth - radius, padding + rectHeight - radius, radius, 0, Math.PI / 2);
    cairo.lineTo(cr, padding + radius, padding + rectHeight);
    cairo.arc(cr, padding + radius, padding + rectHeight - radius, radius, Math.PI / 2, Math.PI);
    cairo.lineTo(cr, padding, padding + radius);
    cairo.arc(cr, padding + radius, padding + radius, radius, Math.PI, (3 * Math.PI) / 2);
    cairo.closePath(cr);

    cairo.setSource(cr, gradient);
    cairo.fill(cr);

    cairo.patternDestroy(gradient);
};

// Draw with radial gradient fill
const drawRadialGradient = (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;

    // Create radial gradient
    const gradient = cairo.patternCreateRadial(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        radius * 0.1,
        centerX,
        centerY,
        radius,
    );
    cairo.patternAddColorStopRgb(gradient, 0, 1, 1, 0.8);
    cairo.patternAddColorStopRgb(gradient, 0.5, 0.9, 0.6, 0.1);
    cairo.patternAddColorStopRgb(gradient, 1, 0.8, 0.3, 0);

    // Draw circle
    cairo.arc(cr, centerX, centerY, radius, 0, 2 * Math.PI);
    cairo.setSource(cr, gradient);
    cairo.fill(cr);

    cairo.patternDestroy(gradient);
};

// Draw demonstrating even-odd fill rule (creates holes)
const drawEvenOddFill = (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 10;
    const innerRadius = outerRadius * 0.5;

    // Outer circle (clockwise)
    cairo.arc(cr, centerX, centerY, outerRadius, 0, 2 * Math.PI);

    // Inner circle (also clockwise - with even-odd, this creates a hole)
    cairo.newSubPath(cr);
    cairo.arc(cr, centerX, centerY, innerRadius, 0, 2 * Math.PI);

    // Use even-odd fill rule
    cairo.setFillRule(cr, cairo.FillRule.EVEN_ODD);
    cairo.setSourceRgb(cr, 0.3, 0.6, 0.9);
    cairo.fillPreserve(cr);

    cairo.setSourceRgb(cr, 0.1, 0.3, 0.6);
    cairo.setLineWidth(cr, 2);
    cairo.stroke(cr);

    // Reset to default
    cairo.setFillRule(cr, cairo.FillRule.WINDING);
};

// Draw demonstrating winding fill rule (no holes with same direction)
const drawWindingFill = (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 10;
    const innerRadius = outerRadius * 0.5;

    // Outer circle (clockwise)
    cairo.arc(cr, centerX, centerY, outerRadius, 0, 2 * Math.PI);

    // Inner circle (counter-clockwise - with winding, this creates a hole)
    cairo.newSubPath(cr);
    cairo.arcNegative(cr, centerX, centerY, innerRadius, 2 * Math.PI, 0);

    // Use winding fill rule (default)
    cairo.setFillRule(cr, cairo.FillRule.WINDING);
    cairo.setSourceRgb(cr, 0.9, 0.5, 0.2);
    cairo.fillPreserve(cr);

    cairo.setSourceRgb(cr, 0.6, 0.3, 0.1);
    cairo.setLineWidth(cr, 2);
    cairo.stroke(cr);
};

// Draw complex polygon with gradient
const drawComplexPolygon = (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 15;
    const points = 6;

    // Create hexagon path
    for (let i = 0; i < points; i++) {
        const angle = (i * 2 * Math.PI) / points - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        if (i === 0) {
            cairo.moveTo(cr, x, y);
        } else {
            cairo.lineTo(cr, x, y);
        }
    }
    cairo.closePath(cr);

    // Create gradient
    const gradient = cairo.patternCreateLinear(0, 0, width, height);
    cairo.patternAddColorStopRgb(gradient, 0, 0.4, 0.8, 0.4);
    cairo.patternAddColorStopRgb(gradient, 1, 0.2, 0.5, 0.3);

    cairo.setSource(cr, gradient);
    cairo.fillPreserve(cr);

    cairo.setSourceRgb(cr, 0.1, 0.4, 0.2);
    cairo.setLineWidth(cr, 3);
    cairo.stroke(cr);

    cairo.patternDestroy(gradient);
};

// Component to display a drawing canvas with label
const DrawingCanvas = ({
    width,
    height,
    drawFunc,
    label,
}: {
    width: number;
    height: number;
    drawFunc: (self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => void;
    label: string;
}) => {
    const ref = useRef<Gtk.DrawingArea | null>(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.setDrawFunc(drawFunc);
        }
    }, [drawFunc]);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
            <GtkDrawingArea ref={ref} contentWidth={width} contentHeight={height} cssClasses={["card"]} />
            <GtkLabel label={label} cssClasses={["dim-label", "caption"]} />
        </GtkBox>
    );
};

const PathFillDemo = () => {
    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Vector Path Fills" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="Paths can be filled with solid colors, linear gradients, or radial gradients. The fill rule determines how overlapping paths are filled."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Solid and Gradient Fills */}
            <GtkFrame label="Solid & Gradient Fills">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={24}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                    halign={Gtk.Align.CENTER}
                >
                    <DrawingCanvas width={140} height={140} drawFunc={drawSolidFill} label="Solid Fill (Heart)" />
                    <DrawingCanvas width={160} height={120} drawFunc={drawLinearGradient} label="Linear Gradient" />
                    <DrawingCanvas width={140} height={140} drawFunc={drawRadialGradient} label="Radial Gradient" />
                </GtkBox>
            </GtkFrame>

            {/* Fill Rules */}
            <GtkFrame label="Fill Rules">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Fill rules determine how overlapping paths are filled. Even-odd creates holes when paths overlap, while winding considers path direction."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={32} halign={Gtk.Align.CENTER}>
                        <DrawingCanvas width={140} height={140} drawFunc={drawEvenOddFill} label="Even-Odd Fill Rule" />
                        <DrawingCanvas
                            width={140}
                            height={140}
                            drawFunc={drawWindingFill}
                            label="Winding Fill Rule (CCW inner)"
                        />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Complex Shapes */}
            <GtkFrame label="Complex Shapes">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={24}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                    halign={Gtk.Align.CENTER}
                >
                    <DrawingCanvas
                        width={160}
                        height={160}
                        drawFunc={drawComplexPolygon}
                        label="Hexagon with Gradient"
                    />
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const pathFillDemo: Demo = {
    id: "path-fill",
    title: "Path Fills",
    description: "Vector path fills with gradients and fill rules",
    keywords: ["path", "fill", "gradient", "linear", "radial", "even-odd", "winding", "vector", "cairo"],
    component: PathFillDemo,
    sourceCode,
};
