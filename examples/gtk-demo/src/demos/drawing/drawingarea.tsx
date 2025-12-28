import * as cairo from "@gtkx/ffi/cairo";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkDrawingArea, GtkFrame, GtkLabel } from "@gtkx/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./drawingarea.tsx?raw";

// Draw a simple circle
const drawCircle = (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;

    // Draw filled circle
    cairo.setSourceRgb(cr, 0.2, 0.6, 0.9);
    cairo.arc(cr, centerX, centerY, radius, 0, 2 * Math.PI);
    cairo.fill(cr);

    // Draw border
    cairo.setSourceRgb(cr, 0.1, 0.4, 0.7);
    cairo.setLineWidth(cr, 3);
    cairo.arc(cr, centerX, centerY, radius, 0, 2 * Math.PI);
    cairo.stroke(cr);
};

// Draw basic shapes showcase
const drawShapes = (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
    const padding = 20;

    // Rectangle
    cairo.setSourceRgb(cr, 0.9, 0.3, 0.3);
    cairo.rectangle(cr, padding, padding, 80, 60);
    cairo.fill(cr);

    // Circle
    cairo.setSourceRgb(cr, 0.3, 0.8, 0.3);
    cairo.arc(cr, width / 2, height / 2, 40, 0, 2 * Math.PI);
    cairo.fill(cr);

    // Triangle using lines
    cairo.setSourceRgb(cr, 0.3, 0.3, 0.9);
    cairo.moveTo(cr, width - padding - 40, height - padding);
    cairo.lineTo(cr, width - padding, height - padding);
    cairo.lineTo(cr, width - padding - 20, height - padding - 60);
    cairo.closePath(cr);
    cairo.fill(cr);

    // Curved line
    cairo.setSourceRgb(cr, 0.8, 0.5, 0.2);
    cairo.setLineWidth(cr, 4);
    cairo.moveTo(cr, padding, height - padding);
    cairo.curveTo(cr, width / 4, padding, (3 * width) / 4, height - padding, width - padding, padding);
    cairo.stroke(cr);
};

// Helper to draw an oval path
const ovalPath = (cr: cairo.Context, xc: number, yc: number, xr: number, yr: number) => {
    cairo.save(cr);
    cairo.translate(cr, xc, yc);
    cairo.scale(cr, 1, yr / xr);
    cairo.arc(cr, 0, 0, xr, 0, 2 * Math.PI);
    cairo.restore(cr);
};

// Helper to draw checkerboard background
const fillChecks = (cr: cairo.Context, width: number, height: number) => {
    const checkSize = 8;
    cairo.setSourceRgb(cr, 0.4, 0.4, 0.4);
    cairo.rectangle(cr, 0, 0, width, height);
    cairo.fill(cr);

    cairo.setSourceRgb(cr, 0.6, 0.6, 0.6);
    for (let y = 0; y < height; y += checkSize * 2) {
        for (let x = 0; x < width; x += checkSize * 2) {
            cairo.rectangle(cr, x, y, checkSize, checkSize);
            cairo.rectangle(cr, x + checkSize, y + checkSize, checkSize, checkSize);
        }
    }
    cairo.fill(cr);
};

// Draw three colored circles for compositing demo
const draw3Circles = (cr: cairo.Context, xc: number, yc: number, radius: number) => {
    const subradius = radius * 0.7;

    // Red circle
    cairo.setSourceRgba(cr, 1, 0, 0, 0.5);
    ovalPath(cr, xc + radius / 2, yc - subradius / 2, subradius, subradius);
    cairo.fill(cr);

    // Green circle
    cairo.setSourceRgba(cr, 0, 1, 0, 0.5);
    ovalPath(cr, xc, yc + subradius / 2, subradius, subradius);
    cairo.fill(cr);

    // Blue circle
    cairo.setSourceRgba(cr, 0, 0, 1, 0.5);
    ovalPath(cr, xc - radius / 2, yc - subradius / 2, subradius, subradius);
    cairo.fill(cr);
};

// Draw compositing/knockout effect - similar to GTK demo
const drawCompositing = (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
    const radius = Math.min(width, height) / 2 - 10;
    const xc = width / 2;
    const yc = height / 2;

    // Draw checkerboard background
    fillChecks(cr, width, height);

    // Draw overlapping semi-transparent circles
    draw3Circles(cr, xc, yc, radius);
};

// Draw knockout effect using DEST_OUT operator
const drawKnockout = (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
    const radius = Math.min(width, height) / 2 - 10;
    const xc = width / 2;
    const yc = height / 2;

    // Draw checkerboard background
    fillChecks(cr, width, height);

    // First draw a white circle
    cairo.setSourceRgb(cr, 1, 1, 1);
    cairo.arc(cr, xc, yc, radius, 0, 2 * Math.PI);
    cairo.fill(cr);

    // Then knock out the three circles using DEST_OUT
    cairo.setOperator(cr, cairo.Operator.DEST_OUT);
    draw3Circles(cr, xc, yc, radius);

    // Reset operator
    cairo.setOperator(cr, cairo.Operator.OVER);
};

// Draw a star shape
const drawStar = (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 10;
    const innerRadius = outerRadius * 0.4;
    const points = 5;

    cairo.setSourceRgb(cr, 0.95, 0.8, 0.2);

    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        if (i === 0) {
            cairo.moveTo(cr, x, y);
        } else {
            cairo.lineTo(cr, x, y);
        }
    }
    cairo.closePath(cr);
    cairo.fill(cr);

    // Add outline
    cairo.setSourceRgb(cr, 0.8, 0.6, 0.1);
    cairo.setLineWidth(cr, 2);
    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        if (i === 0) {
            cairo.moveTo(cr, x, y);
        } else {
            cairo.lineTo(cr, x, y);
        }
    }
    cairo.closePath(cr);
    cairo.stroke(cr);
};

// Component to wrap drawing area with draw function
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

// Type for storing stroke points
interface Point {
    x: number;
    y: number;
}

type Stroke = Point[];

// Interactive scribble area component
const ScribbleArea = () => {
    const ref = useRef<Gtk.DrawingArea | null>(null);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const currentStrokeRef = useRef<Stroke>([]);
    const startPointRef = useRef<Point | null>(null);

    const drawScribble = useCallback(
        (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
            // White background
            cairo.setSourceRgb(cr, 1, 1, 1);
            cairo.rectangle(cr, 0, 0, width, height);
            cairo.fill(cr);

            // Draw all completed strokes
            cairo.setSourceRgb(cr, 0, 0, 0);
            cairo.setLineWidth(cr, 3);
            cairo.setLineCap(cr, cairo.LineCap.ROUND);
            cairo.setLineJoin(cr, cairo.LineJoin.ROUND);

            for (const stroke of strokes) {
                const [first, ...rest] = stroke;
                if (!first || rest.length === 0) continue;
                cairo.moveTo(cr, first.x, first.y);
                for (const point of rest) {
                    cairo.lineTo(cr, point.x, point.y);
                }
                cairo.stroke(cr);
            }

            // Draw current stroke in progress
            const currentStroke = currentStrokeRef.current;
            const [currentFirst, ...currentRest] = currentStroke;
            if (currentFirst && currentRest.length > 0) {
                cairo.moveTo(cr, currentFirst.x, currentFirst.y);
                for (const point of currentRest) {
                    cairo.lineTo(cr, point.x, point.y);
                }
                cairo.stroke(cr);
            }
        },
        [strokes],
    );

    useEffect(() => {
        const area = ref.current;
        if (!area) return;

        area.setDrawFunc(drawScribble);

        // Set up drag gesture for drawing
        const drag = new Gtk.GestureDrag();

        drag.connect("drag-begin", (_gesture: Gtk.GestureDrag, startX: number, startY: number) => {
            startPointRef.current = { x: startX, y: startY };
            currentStrokeRef.current = [{ x: startX, y: startY }];
            area.queueDraw();
        });

        drag.connect("drag-update", (_gesture: Gtk.GestureDrag, offsetX: number, offsetY: number) => {
            if (startPointRef.current) {
                const x = startPointRef.current.x + offsetX;
                const y = startPointRef.current.y + offsetY;
                currentStrokeRef.current.push({ x, y });
                area.queueDraw();
            }
        });

        drag.connect("drag-end", (_gesture: Gtk.GestureDrag, _offsetX: number, _offsetY: number) => {
            if (currentStrokeRef.current.length > 0) {
                setStrokes((prev) => [...prev, [...currentStrokeRef.current]]);
                currentStrokeRef.current = [];
                startPointRef.current = null;
            }
        });

        area.addController(drag);
    }, [drawScribble]);

    const handleClear = () => {
        setStrokes([]);
        currentStrokeRef.current = [];
        startPointRef.current = null;
    };

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
            <GtkDrawingArea ref={ref} contentWidth={300} contentHeight={200} cssClasses={["card"]} />
            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8} halign={Gtk.Align.CENTER}>
                <GtkLabel label="Draw with mouse or touch" cssClasses={["dim-label", "caption"]} />
                <GtkButton label="Clear" onClicked={handleClear} cssClasses={["flat"]} />
            </GtkBox>
        </GtkBox>
    );
};

const DrawingAreaDemo = () => {
    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Drawing Area" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GtkDrawingArea allows custom drawing using Cairo graphics. Set a draw function to render shapes, paths, and patterns."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Interactive Scribble */}
            <GtkFrame label="Interactive Scribble">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                    halign={Gtk.Align.CENTER}
                >
                    <ScribbleArea />
                </GtkBox>
            </GtkFrame>

            {/* Basic Shapes */}
            <GtkFrame label="Basic Shapes">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={24}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                    halign={Gtk.Align.CENTER}
                >
                    <DrawingCanvas width={120} height={120} drawFunc={drawCircle} label="Circle" />
                    <DrawingCanvas width={200} height={150} drawFunc={drawShapes} label="Multiple Shapes" />
                    <DrawingCanvas width={120} height={120} drawFunc={drawStar} label="Star" />
                </GtkBox>
            </GtkFrame>

            {/* Compositing / Alpha Blending */}
            <GtkFrame label="Compositing & Alpha Blending">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={24}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                    halign={Gtk.Align.CENTER}
                >
                    <DrawingCanvas width={150} height={150} drawFunc={drawCompositing} label="Alpha Blending" />
                    <DrawingCanvas width={150} height={150} drawFunc={drawKnockout} label="Knockout (DEST_OUT)" />
                </GtkBox>
            </GtkFrame>

            {/* Cairo API Info */}
            <GtkFrame label="Cairo Drawing API">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel label="Available Cairo functions:" cssClasses={["heading"]} halign={Gtk.Align.START} />
                    <GtkLabel
                        label={`Path: moveTo, lineTo, curveTo, arc, rectangle, closePath
Draw: fill, stroke, paint, setOperator
Style: setSourceRgb/Rgba, setLineWidth, setLineCap/Join
Transform: save, restore, translate, scale, rotate`}
                        halign={Gtk.Align.START}
                        cssClasses={["monospace"]}
                    />
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const drawingAreaDemo: Demo = {
    id: "drawingarea",
    title: "Drawing Area",
    description: "Custom drawing with Cairo graphics",
    keywords: ["drawing", "canvas", "cairo", "GtkDrawingArea", "custom", "graphics", "shapes", "paths", "scribble"],
    component: DrawingAreaDemo,
    sourceCode,
};
