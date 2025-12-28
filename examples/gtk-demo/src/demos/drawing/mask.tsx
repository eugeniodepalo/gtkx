import * as cairo from "@gtkx/ffi/cairo";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkDrawingArea, GtkFrame, GtkLabel, GtkScale, GtkScrolledWindow } from "@gtkx/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./mask.tsx?raw";

// Draw a circular alpha mask
const drawCircularMask = (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;

    // Draw checkerboard background to show transparency
    const checkSize = 10;
    for (let y = 0; y < height; y += checkSize) {
        for (let x = 0; x < width; x += checkSize) {
            const isLight = (x / checkSize + y / checkSize) % 2 === 0;
            cairo.setSourceRgb(cr, isLight ? 0.85 : 0.7, isLight ? 0.85 : 0.7, isLight ? 0.85 : 0.7);
            cairo.rectangle(cr, x, y, checkSize, checkSize);
            cairo.fill(cr);
        }
    }

    // Create a colorful background pattern
    const bgGradient = cairo.patternCreateLinear(0, 0, width, height);
    cairo.patternAddColorStopRgb(bgGradient, 0, 0.9, 0.2, 0.2);
    cairo.patternAddColorStopRgb(bgGradient, 0.5, 0.2, 0.9, 0.2);
    cairo.patternAddColorStopRgb(bgGradient, 1, 0.2, 0.2, 0.9);

    // Draw the gradient as a rectangle
    cairo.save(cr);
    cairo.setSource(cr, bgGradient);
    cairo.rectangle(cr, 0, 0, width, height);

    // Create circular mask using clip
    cairo.arc(cr, centerX, centerY, radius, 0, 2 * Math.PI);
    cairo.clip(cr);
    cairo.paint(cr);
    cairo.restore(cr);

    cairo.patternDestroy(bgGradient);

    // Draw mask outline
    cairo.setSourceRgba(cr, 0, 0, 0, 0.3);
    cairo.setLineWidth(cr, 2);
    cairo.arc(cr, centerX, centerY, radius, 0, 2 * Math.PI);
    cairo.stroke(cr);
};

// Draw a radial gradient mask (soft edges)
const drawGradientMask = (feather: number) => {
    return (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
        const centerX = width / 2;
        const centerY = height / 2;
        const innerRadius = 20;
        const outerRadius = Math.min(width, height) / 2 - 10;

        // Draw checkerboard background
        const checkSize = 8;
        for (let y = 0; y < height; y += checkSize) {
            for (let x = 0; x < width; x += checkSize) {
                const isLight = (x / checkSize + y / checkSize) % 2 === 0;
                cairo.setSourceRgb(cr, isLight ? 0.9 : 0.75, isLight ? 0.9 : 0.75, isLight ? 0.9 : 0.75);
                cairo.rectangle(cr, x, y, checkSize, checkSize);
                cairo.fill(cr);
            }
        }

        // Draw colored pattern that will be masked
        cairo.setSourceRgb(cr, 0.2, 0.6, 0.9);
        cairo.rectangle(cr, 0, 0, width, height);
        cairo.fill(cr);

        // Create radial gradient for mask (using alpha)
        const maskRadius = innerRadius + (outerRadius - innerRadius) * (1 - feather);
        const mask = cairo.patternCreateRadial(centerX, centerY, 0, centerX, centerY, outerRadius);
        cairo.patternAddColorStopRgba(mask, 0, 0, 0, 0, 1); // Opaque center
        cairo.patternAddColorStopRgba(mask, maskRadius / outerRadius, 0, 0, 0, 1); // Inner edge
        cairo.patternAddColorStopRgba(mask, 1, 0, 0, 0, 0); // Transparent edge

        // Apply mask using DEST_IN operator
        cairo.setOperator(cr, cairo.Operator.DEST_IN);
        cairo.setSource(cr, mask);
        cairo.paint(cr);
        cairo.setOperator(cr, cairo.Operator.OVER);

        cairo.patternDestroy(mask);
    };
};

// Draw a star-shaped mask
const drawStarMask = (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 15;
    const innerRadius = outerRadius * 0.4;
    const points = 5;

    // Draw checkerboard background
    const checkSize = 8;
    for (let y = 0; y < height; y += checkSize) {
        for (let x = 0; x < width; x += checkSize) {
            const isLight = (x / checkSize + y / checkSize) % 2 === 0;
            cairo.setSourceRgb(cr, isLight ? 0.85 : 0.7, isLight ? 0.85 : 0.7, isLight ? 0.85 : 0.7);
            cairo.rectangle(cr, x, y, checkSize, checkSize);
            cairo.fill(cr);
        }
    }

    // Create gradient background
    const bgGradient = cairo.patternCreateLinear(0, 0, width, height);
    cairo.patternAddColorStopRgb(bgGradient, 0, 0.95, 0.8, 0.2);
    cairo.patternAddColorStopRgb(bgGradient, 1, 0.9, 0.4, 0.1);

    cairo.save(cr);
    cairo.setSource(cr, bgGradient);
    cairo.rectangle(cr, 0, 0, width, height);

    // Create star path for clipping
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
    cairo.clip(cr);
    cairo.paint(cr);
    cairo.restore(cr);

    cairo.patternDestroy(bgGradient);
};

// Draw horizontal gradient mask
const drawHorizontalGradientMask = (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
    // Draw checkerboard
    const checkSize = 8;
    for (let y = 0; y < height; y += checkSize) {
        for (let x = 0; x < width; x += checkSize) {
            const isLight = (x / checkSize + y / checkSize) % 2 === 0;
            cairo.setSourceRgb(cr, isLight ? 0.85 : 0.7, isLight ? 0.85 : 0.7, isLight ? 0.85 : 0.7);
            cairo.rectangle(cr, x, y, checkSize, checkSize);
            cairo.fill(cr);
        }
    }

    // Draw image (solid color for demo)
    cairo.setSourceRgb(cr, 0.6, 0.2, 0.8);
    cairo.rectangle(cr, 0, 0, width, height);
    cairo.fill(cr);

    // Create horizontal gradient mask
    const mask = cairo.patternCreateLinear(0, 0, width, 0);
    cairo.patternAddColorStopRgba(mask, 0, 0, 0, 0, 0);
    cairo.patternAddColorStopRgba(mask, 0.3, 0, 0, 0, 1);
    cairo.patternAddColorStopRgba(mask, 0.7, 0, 0, 0, 1);
    cairo.patternAddColorStopRgba(mask, 1, 0, 0, 0, 0);

    cairo.setOperator(cr, cairo.Operator.DEST_IN);
    cairo.setSource(cr, mask);
    cairo.paint(cr);
    cairo.setOperator(cr, cairo.Operator.OVER);

    cairo.patternDestroy(mask);
};

// Draw text as mask
const drawTextMask = (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
    // Draw checkerboard
    const checkSize = 8;
    for (let y = 0; y < height; y += checkSize) {
        for (let x = 0; x < width; x += checkSize) {
            const isLight = (x / checkSize + y / checkSize) % 2 === 0;
            cairo.setSourceRgb(cr, isLight ? 0.85 : 0.7, isLight ? 0.85 : 0.7, isLight ? 0.85 : 0.7);
            cairo.rectangle(cr, x, y, checkSize, checkSize);
            cairo.fill(cr);
        }
    }

    // Create colorful background
    const gradient = cairo.patternCreateLinear(0, 0, width, height);
    cairo.patternAddColorStopRgb(gradient, 0, 0.9, 0.2, 0.5);
    cairo.patternAddColorStopRgb(gradient, 0.5, 0.5, 0.2, 0.9);
    cairo.patternAddColorStopRgb(gradient, 1, 0.2, 0.9, 0.9);

    cairo.save(cr);

    // Draw text path as clip mask
    cairo.selectFontFace(cr, "Sans", cairo.FontSlant.NORMAL, cairo.FontWeight.BOLD);
    cairo.setFontSize(cr, 48);

    const text = "MASK";
    const extents = cairo.textExtents(cr, text);
    const x = (width - extents.width) / 2 - extents.xBearing;
    const y = (height - extents.height) / 2 - extents.yBearing;

    cairo.moveTo(cr, x, y);
    cairo.textPath(cr, text);
    cairo.clip(cr);

    // Fill with gradient through the text mask
    cairo.setSource(cr, gradient);
    cairo.paint(cr);

    cairo.restore(cr);
    cairo.patternDestroy(gradient);
};

const MaskDemo = () => {
    const [feather, setFeather] = useState(0.5);
    const gradientMaskRef = useRef<Gtk.DrawingArea | null>(null);
    const circularMaskRef = useRef<Gtk.DrawingArea | null>(null);
    const starMaskRef = useRef<Gtk.DrawingArea | null>(null);
    const horizontalMaskRef = useRef<Gtk.DrawingArea | null>(null);
    const textMaskRef = useRef<Gtk.DrawingArea | null>(null);

    const featherAdjustment = useMemo(() => new Gtk.Adjustment(0.5, 0, 1, 0.05, 0.1, 0), []);

    // Set up circular mask
    useEffect(() => {
        const area = circularMaskRef.current;
        if (area) {
            area.setDrawFunc(drawCircularMask);
        }
    }, []);

    // Update gradient mask when feather changes
    useEffect(() => {
        const area = gradientMaskRef.current;
        if (area) {
            area.setDrawFunc(drawGradientMask(feather));
            area.queueDraw();
        }
    }, [feather]);

    // Set up star mask
    useEffect(() => {
        const area = starMaskRef.current;
        if (area) {
            area.setDrawFunc(drawStarMask);
        }
    }, []);

    // Set up horizontal gradient mask
    useEffect(() => {
        const area = horizontalMaskRef.current;
        if (area) {
            area.setDrawFunc(drawHorizontalGradientMask);
        }
    }, []);

    // Set up text mask
    useEffect(() => {
        const area = textMaskRef.current;
        if (area) {
            area.setDrawFunc(drawTextMask);
        }
    }, []);

    return (
        <GtkScrolledWindow hscrollbarPolicy={Gtk.PolicyType.NEVER}>
            <GtkBox
                orientation={Gtk.Orientation.VERTICAL}
                spacing={20}
                marginStart={20}
                marginEnd={20}
                marginTop={20}
                marginBottom={20}
            >
                <GtkLabel label="Masking Effects" cssClasses={["title-2"]} halign={Gtk.Align.START} />

                <GtkLabel
                    label="Cairo provides powerful masking capabilities through clipping paths, alpha gradients, and compositing operators. Masks control which parts of content are visible."
                    wrap
                    halign={Gtk.Align.START}
                    cssClasses={["dim-label"]}
                />

                {/* Alpha mask types */}
                <GtkFrame label="Mask Types">
                    <GtkBox
                        orientation={Gtk.Orientation.HORIZONTAL}
                        spacing={24}
                        marginStart={16}
                        marginEnd={16}
                        marginTop={16}
                        marginBottom={16}
                        halign={Gtk.Align.CENTER}
                    >
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} halign={Gtk.Align.CENTER}>
                            <GtkDrawingArea
                                ref={circularMaskRef}
                                contentWidth={150}
                                contentHeight={150}
                                cssClasses={["card"]}
                            />
                            <GtkLabel label="Circular Clip" cssClasses={["dim-label", "caption"]} />
                        </GtkBox>

                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} halign={Gtk.Align.CENTER}>
                            <GtkDrawingArea
                                ref={starMaskRef}
                                contentWidth={150}
                                contentHeight={150}
                                cssClasses={["card"]}
                            />
                            <GtkLabel label="Star Clip" cssClasses={["dim-label", "caption"]} />
                        </GtkBox>

                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} halign={Gtk.Align.CENTER}>
                            <GtkDrawingArea
                                ref={textMaskRef}
                                contentWidth={150}
                                contentHeight={150}
                                cssClasses={["card"]}
                            />
                            <GtkLabel label="Text Mask" cssClasses={["dim-label", "caption"]} />
                        </GtkBox>
                    </GtkBox>
                </GtkFrame>

                {/* Gradient mask with feather control */}
                <GtkFrame label="Gradient Mask (Soft Edges)">
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={16}
                        marginStart={16}
                        marginEnd={16}
                        marginTop={16}
                        marginBottom={16}
                    >
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={24} halign={Gtk.Align.CENTER}>
                            <GtkDrawingArea
                                ref={gradientMaskRef}
                                contentWidth={200}
                                contentHeight={200}
                                cssClasses={["card"]}
                            />
                            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} valign={Gtk.Align.CENTER}>
                                <GtkLabel
                                    label="Radial gradient masks create soft, feathered edges. Adjust the feather amount to control edge softness."
                                    wrap
                                    widthRequest={200}
                                    cssClasses={["dim-label"]}
                                />
                            </GtkBox>
                        </GtkBox>

                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="Feather:" widthRequest={60} halign={Gtk.Align.START} />
                            <GtkScale
                                orientation={Gtk.Orientation.HORIZONTAL}
                                adjustment={featherAdjustment}
                                drawValue
                                digits={2}
                                valuePos={Gtk.PositionType.RIGHT}
                                hexpand
                                onValueChanged={(scale: Gtk.Range) => setFeather(scale.getValue())}
                            />
                        </GtkBox>
                    </GtkBox>
                </GtkFrame>

                {/* Horizontal gradient mask */}
                <GtkFrame label="Linear Gradient Mask">
                    <GtkBox
                        orientation={Gtk.Orientation.HORIZONTAL}
                        spacing={24}
                        marginStart={16}
                        marginEnd={16}
                        marginTop={16}
                        marginBottom={16}
                    >
                        <GtkDrawingArea
                            ref={horizontalMaskRef}
                            contentWidth={250}
                            contentHeight={120}
                            cssClasses={["card"]}
                        />
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} valign={Gtk.Align.CENTER}>
                            <GtkLabel
                                label="Linear gradient masks can create fade-in/fade-out effects, useful for content that scrolls or transitions."
                                wrap
                                widthRequest={200}
                                cssClasses={["dim-label"]}
                            />
                        </GtkBox>
                    </GtkBox>
                </GtkFrame>

                {/* Masking techniques */}
                <GtkFrame label="Masking Techniques">
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={12}
                        marginStart={12}
                        marginEnd={12}
                        marginTop={12}
                        marginBottom={12}
                    >
                        <GtkLabel
                            label="1. Clipping (clip/clipPreserve):"
                            cssClasses={["heading"]}
                            halign={Gtk.Align.START}
                        />
                        <GtkLabel
                            label="Define a path, then clip(). Only content inside the path is visible. Hard edges."
                            wrap
                            halign={Gtk.Align.START}
                            cssClasses={["dim-label"]}
                        />

                        <GtkLabel
                            label="2. Alpha Masking (DEST_IN operator):"
                            cssClasses={["heading"]}
                            halign={Gtk.Align.START}
                            marginTop={8}
                        />
                        <GtkLabel
                            label="Draw content, then use setOperator(DEST_IN) with a gradient pattern. Alpha values control transparency for soft edges."
                            wrap
                            halign={Gtk.Align.START}
                            cssClasses={["dim-label"]}
                        />

                        <GtkLabel
                            label="3. Text Path Masking:"
                            cssClasses={["heading"]}
                            halign={Gtk.Align.START}
                            marginTop={8}
                        />
                        <GtkLabel
                            label="Use textPath() to create a path from text, then clip() to use text as a mask shape."
                            wrap
                            halign={Gtk.Align.START}
                            cssClasses={["dim-label"]}
                        />
                    </GtkBox>
                </GtkFrame>

                {/* Cairo operators info */}
                <GtkFrame label="Cairo Compositing Operators">
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={8}
                        marginStart={12}
                        marginEnd={12}
                        marginTop={12}
                        marginBottom={12}
                    >
                        <GtkLabel
                            label="Key operators for masking:"
                            cssClasses={["heading"]}
                            halign={Gtk.Align.START}
                        />
                        <GtkLabel
                            label={`OVER - Default, draws source over destination
DEST_IN - Keep destination where source is opaque
DEST_OUT - Remove destination where source is opaque
SOURCE - Replace destination with source
XOR - Combine non-overlapping regions`}
                            halign={Gtk.Align.START}
                            cssClasses={["monospace"]}
                        />
                    </GtkBox>
                </GtkFrame>
            </GtkBox>
        </GtkScrolledWindow>
    );
};

export const maskDemo: Demo = {
    id: "mask",
    title: "Masking Effects",
    description: "Alpha masks, gradient masks, and image-based masks with Cairo",
    keywords: ["mask", "alpha", "clip", "gradient", "cairo", "compositing", "transparency", "feather"],
    component: MaskDemo,
    sourceCode,
};
