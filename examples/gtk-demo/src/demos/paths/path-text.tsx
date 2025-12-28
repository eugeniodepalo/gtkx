import { type Context, FontSlant, FontWeight, LineCap } from "@gtkx/ffi/cairo";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkDrawingArea, GtkFrame, GtkLabel } from "@gtkx/react";
import { useEffect, useRef } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./path-text.tsx?raw";

// Helper to calculate point and tangent on a quadratic bezier curve
const getQuadraticBezierPoint = (
    t: number,
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
) => {
    const u = 1 - t;
    return {
        x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
        y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    };
};

const getQuadraticBezierTangent = (
    t: number,
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
) => {
    const u = 1 - t;
    const dx = 2 * u * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const dy = 2 * u * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    return Math.atan2(dy, dx);
};

// Draw text along a curved path
const drawTextOnCurve = (_self: Gtk.DrawingArea, cr: Context, width: number, height: number) => {
    const text = "Hello Curved World!";
    const fontSize = 24;

    // Define a quadratic bezier curve
    const p0 = { x: 30, y: height * 0.7 };
    const p1 = { x: width / 2, y: height * 0.1 };
    const p2 = { x: width - 30, y: height * 0.7 };

    // Draw the path for reference
    cr.setSourceRgba(0.6, 0.6, 0.6, 0.5)
        .setLineWidth(2)
        .setLineCap(LineCap.ROUND)
        .moveTo(p0.x, p0.y)
        .curveTo(
            p0.x + (p1.x - p0.x) * 0.66,
            p0.y + (p1.y - p0.y) * 0.66,
            p1.x + (p2.x - p1.x) * 0.33,
            p1.y + (p2.y - p1.y) * 0.33,
            p2.x,
            p2.y,
        )
        .stroke();

    // Set up font
    cr.selectFontFace("Sans", FontSlant.NORMAL, FontWeight.BOLD).setFontSize(fontSize);

    // Calculate approximate path length for character spacing
    const numSamples = 100;
    let pathLength = 0;
    let prevPoint = p0;
    for (let i = 1; i <= numSamples; i++) {
        const t = i / numSamples;
        const point = getQuadraticBezierPoint(t, p0, p1, p2);
        pathLength += Math.sqrt((point.x - prevPoint.x) ** 2 + (point.y - prevPoint.y) ** 2);
        prevPoint = point;
    }

    // Draw each character along the path
    const charWidth = pathLength / (text.length + 2);
    let currentLength = charWidth;

    cr.setSourceRgb(0.2, 0.4, 0.8);

    for (let i = 0; i < text.length; i++) {
        // Find the t parameter for the current length
        let t = 0;
        let accumulatedLength = 0;
        prevPoint = p0;

        for (let j = 1; j <= numSamples; j++) {
            const testT = j / numSamples;
            const point = getQuadraticBezierPoint(testT, p0, p1, p2);
            const segmentLength = Math.sqrt((point.x - prevPoint.x) ** 2 + (point.y - prevPoint.y) ** 2);
            accumulatedLength += segmentLength;

            if (accumulatedLength >= currentLength) {
                t = testT;
                break;
            }
            prevPoint = point;
        }

        const pos = getQuadraticBezierPoint(t, p0, p1, p2);
        const angle = getQuadraticBezierTangent(t, p0, p1, p2);

        cr.save()
            .translate(pos.x, pos.y)
            .rotate(angle)
            .moveTo(-charWidth / 4, fontSize / 3)
            .showText(text.charAt(i));
        cr.restore();

        currentLength += charWidth;
    }
};

// Draw text along a wave path
const drawTextOnWave = (_self: Gtk.DrawingArea, cr: Context, width: number, height: number) => {
    const text = "Wavy Text Animation";
    const fontSize = 20;
    const amplitude = 30;
    const frequency = 2;

    // Draw wave path for reference
    cr.setSourceRgba(0.6, 0.6, 0.6, 0.4)
        .setLineWidth(1)
        .moveTo(20, height / 2);
    for (let x = 20; x < width - 20; x++) {
        const y = height / 2 + Math.sin(((x - 20) / (width - 40)) * frequency * Math.PI * 2) * amplitude;
        cr.lineTo(x, y);
    }
    cr.stroke();

    // Set up font
    cr.selectFontFace("Sans", FontSlant.NORMAL, FontWeight.NORMAL).setFontSize(fontSize);

    // Draw each character
    cr.setSourceRgb(0.8, 0.3, 0.5);
    const charSpacing = (width - 60) / text.length;

    for (let i = 0; i < text.length; i++) {
        const x = 30 + i * charSpacing;
        const normalizedX = (x - 20) / (width - 40);
        const y = height / 2 + Math.sin(normalizedX * frequency * Math.PI * 2) * amplitude;
        const angle = Math.atan2(
            (Math.cos(normalizedX * frequency * Math.PI * 2) * amplitude * frequency * Math.PI * 2) / (width - 40),
            1,
        );

        cr.save()
            .translate(x, y)
            .rotate(angle)
            .moveTo(0, fontSize / 3)
            .showText(text.charAt(i));
        cr.restore();
    }
};

// Draw text along a circular path
const drawTextOnCircle = (_self: Gtk.DrawingArea, cr: Context, width: number, height: number) => {
    const text = "Circular Path Text - Goes Around - ";
    const fontSize = 16;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 30;

    // Draw circle for reference
    cr.setSourceRgba(0.6, 0.6, 0.6, 0.4)
        .setLineWidth(1)
        .arc(centerX, centerY, radius, 0, 2 * Math.PI)
        .stroke();

    // Set up font
    cr.selectFontFace("Sans", FontSlant.NORMAL, FontWeight.NORMAL).setFontSize(fontSize);

    // Calculate angle step per character
    const angleStep = (2 * Math.PI) / text.length;

    cr.setSourceRgb(0.3, 0.7, 0.4);

    for (let i = 0; i < text.length; i++) {
        const angle = -Math.PI / 2 + i * angleStep;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        cr.save()
            .translate(x, y)
            .rotate(angle + Math.PI / 2)
            .moveTo(-fontSize / 4, 0)
            .showText(text.charAt(i));
        cr.restore();
    }
};

// Draw spiral text
const drawTextOnSpiral = (_self: Gtk.DrawingArea, cr: Context, width: number, height: number) => {
    const text = "Spiral text winds inward towards the center...";
    const fontSize = 12;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 20;
    const minRadius = 20;
    const totalRotations = 2.5;

    // Draw spiral for reference
    cr.setSourceRgba(0.6, 0.6, 0.6, 0.3).setLineWidth(1);
    for (let i = 0; i <= 200; i++) {
        const t = i / 200;
        const angle = t * totalRotations * 2 * Math.PI;
        const radius = maxRadius - t * (maxRadius - minRadius);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        if (i === 0) {
            cr.moveTo(x, y);
        } else {
            cr.lineTo(x, y);
        }
    }
    cr.stroke();

    // Set up font
    cr.selectFontFace("Sans", FontSlant.NORMAL, FontWeight.NORMAL).setFontSize(fontSize).setSourceRgb(0.6, 0.4, 0.8);

    for (let i = 0; i < text.length; i++) {
        const t = i / text.length;
        const angle = t * totalRotations * 2 * Math.PI;
        const radius = maxRadius - t * (maxRadius - minRadius);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        cr.save()
            .translate(x, y)
            .rotate(angle + Math.PI / 2)
            .moveTo(0, fontSize / 3)
            .showText(text.charAt(i));
        cr.restore();
    }
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
    drawFunc: (self: Gtk.DrawingArea, cr: Context, width: number, height: number) => void;
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

const PathTextDemo = () => {
    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Text Along Paths" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="Position text glyphs along curved paths. Each character is positioned and rotated to follow the path tangent."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Bezier Curve Text */}
            <GtkFrame label="Bezier Curve">
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
                        width={350}
                        height={150}
                        drawFunc={drawTextOnCurve}
                        label="Text on Quadratic Bezier"
                    />
                </GtkBox>
            </GtkFrame>

            {/* Wave and Circle */}
            <GtkFrame label="Trigonometric Paths">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={24}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                    halign={Gtk.Align.CENTER}
                >
                    <DrawingCanvas width={320} height={120} drawFunc={drawTextOnWave} label="Sine Wave Path" />
                    <DrawingCanvas width={200} height={200} drawFunc={drawTextOnCircle} label="Circular Path" />
                </GtkBox>
            </GtkFrame>

            {/* Spiral */}
            <GtkFrame label="Spiral Path">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={24}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                    halign={Gtk.Align.CENTER}
                >
                    <DrawingCanvas width={250} height={250} drawFunc={drawTextOnSpiral} label="Archimedean Spiral" />
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const pathTextDemo: Demo = {
    id: "path-text",
    title: "Text on Path",
    description: "Position text glyphs along curved paths",
    keywords: ["path", "text", "curve", "bezier", "circle", "spiral", "wave", "glyphs", "typography"],
    component: PathTextDemo,
    sourceCode,
};
