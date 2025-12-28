import { css } from "@gtkx/css";
import * as cairo from "@gtkx/ffi/cairo";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkDrawingArea, GtkFrame, GtkLabel, GtkScale, GtkScrolledWindow } from "@gtkx/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./transparent.tsx?raw";

const transparencyInfoStyle = css`
    background-color: alpha(@accent_bg_color, 0.1);
    border-radius: 8px;
    padding: 12px;
`;

// Drawing function that demonstrates transparency with checkerboard background
const drawTransparencyDemo = (alpha: number, gradientType: "solid" | "linear" | "radial") => {
    return (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
        // Draw checkerboard to show transparency
        const checkSize = 10;
        for (let y = 0; y < height; y += checkSize) {
            for (let x = 0; x < width; x += checkSize) {
                const isLight = (x / checkSize + y / checkSize) % 2 === 0;
                cairo.setSourceRgb(cr, isLight ? 0.9 : 0.7, isLight ? 0.9 : 0.7, isLight ? 0.9 : 0.7);
                cairo.rectangle(cr, x, y, checkSize, checkSize);
                cairo.fill(cr);
            }
        }

        // Draw semi-transparent overlay based on gradient type
        if (gradientType === "solid") {
            cairo.setSourceRgba(cr, 0.2, 0.4, 0.8, alpha);
            cairo.rectangle(cr, 20, 20, width - 40, height - 40);
            cairo.fill(cr);
        } else if (gradientType === "linear") {
            const gradient = cairo.patternCreateLinear(0, 0, width, height);
            cairo.patternAddColorStopRgba(gradient, 0, 0.8, 0.2, 0.2, alpha);
            cairo.patternAddColorStopRgba(gradient, 0.5, 0.2, 0.8, 0.2, alpha);
            cairo.patternAddColorStopRgba(gradient, 1, 0.2, 0.2, 0.8, alpha);
            cairo.setSource(cr, gradient);
            cairo.rectangle(cr, 20, 20, width - 40, height - 40);
            cairo.fill(cr);
            cairo.patternDestroy(gradient);
        } else {
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 2 - 20;
            const gradient = cairo.patternCreateRadial(centerX, centerY, 0, centerX, centerY, radius);
            cairo.patternAddColorStopRgba(gradient, 0, 1, 1, 0.2, alpha);
            cairo.patternAddColorStopRgba(gradient, 0.5, 0.8, 0.4, 0.2, alpha);
            cairo.patternAddColorStopRgba(gradient, 1, 0.2, 0.2, 0.8, alpha * 0.5);
            cairo.setSource(cr, gradient);
            cairo.arc(cr, centerX, centerY, radius, 0, 2 * Math.PI);
            cairo.fill(cr);
            cairo.patternDestroy(gradient);
        }

        // Add text to show alpha value
        cairo.setSourceRgba(cr, 0, 0, 0, 0.8);
        cairo.moveTo(cr, 30, height - 30);
        cairo.setFontSize(cr, 14);
        cairo.showText(cr, `Alpha: ${alpha.toFixed(2)}`);
    };
};

// Draw overlapping transparent shapes
const drawOverlappingShapes = (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
    // White background
    cairo.setSourceRgb(cr, 1, 1, 1);
    cairo.rectangle(cr, 0, 0, width, height);
    cairo.fill(cr);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 50;
    const offset = 35;

    // Red circle (top)
    cairo.setSourceRgba(cr, 0.9, 0.1, 0.1, 0.6);
    cairo.arc(cr, centerX, centerY - offset, radius, 0, 2 * Math.PI);
    cairo.fill(cr);

    // Green circle (bottom-left)
    cairo.setSourceRgba(cr, 0.1, 0.9, 0.1, 0.6);
    cairo.arc(cr, centerX - offset, centerY + offset * 0.5, radius, 0, 2 * Math.PI);
    cairo.fill(cr);

    // Blue circle (bottom-right)
    cairo.setSourceRgba(cr, 0.1, 0.1, 0.9, 0.6);
    cairo.arc(cr, centerX + offset, centerY + offset * 0.5, radius, 0, 2 * Math.PI);
    cairo.fill(cr);
};

// Draw layered transparency with different operators
const drawLayeredTransparency = (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
    // Draw checkerboard background
    const checkSize = 8;
    for (let y = 0; y < height; y += checkSize) {
        for (let x = 0; x < width; x += checkSize) {
            const isLight = (x / checkSize + y / checkSize) % 2 === 0;
            cairo.setSourceRgb(cr, isLight ? 0.85 : 0.65, isLight ? 0.85 : 0.65, isLight ? 0.85 : 0.65);
            cairo.rectangle(cr, x, y, checkSize, checkSize);
            cairo.fill(cr);
        }
    }

    // Layer 1: Base rectangle
    cairo.setSourceRgba(cr, 0.2, 0.6, 0.9, 0.7);
    cairo.rectangle(cr, 20, 20, width - 40, height - 40);
    cairo.fill(cr);

    // Layer 2: Inner rectangle with different alpha
    cairo.setSourceRgba(cr, 0.9, 0.3, 0.3, 0.5);
    cairo.rectangle(cr, 40, 40, width - 80, height - 80);
    cairo.fill(cr);

    // Layer 3: Innermost rectangle
    cairo.setSourceRgba(cr, 0.3, 0.9, 0.3, 0.6);
    cairo.rectangle(cr, 60, 60, width - 120, height - 120);
    cairo.fill(cr);
};

const TransparentDemo = () => {
    const [alpha, setAlpha] = useState(0.5);
    const [gradientType, setGradientType] = useState<"solid" | "linear" | "radial">("solid");
    const mainDrawingRef = useRef<Gtk.DrawingArea | null>(null);
    const overlappingRef = useRef<Gtk.DrawingArea | null>(null);
    const layeredRef = useRef<Gtk.DrawingArea | null>(null);

    const alphaAdjustment = useMemo(() => new Gtk.Adjustment(0.5, 0, 1, 0.05, 0.1, 0), []);

    // Update main drawing area
    useEffect(() => {
        const area = mainDrawingRef.current;
        if (area) {
            area.setDrawFunc(drawTransparencyDemo(alpha, gradientType));
            area.queueDraw();
        }
    }, [alpha, gradientType]);

    // Set up overlapping shapes drawing
    useEffect(() => {
        const area = overlappingRef.current;
        if (area) {
            area.setDrawFunc(drawOverlappingShapes);
        }
    }, []);

    // Set up layered transparency drawing
    useEffect(() => {
        const area = layeredRef.current;
        if (area) {
            area.setDrawFunc(drawLayeredTransparency);
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
                <GtkLabel label="Transparency & RGBA" cssClasses={["title-2"]} halign={Gtk.Align.START} />

                <GtkLabel
                    label="GTK4 supports RGBA visuals for transparent and translucent windows and widgets. Cairo drawing can use alpha channels for smooth transparency effects."
                    wrap
                    halign={Gtk.Align.START}
                    cssClasses={["dim-label"]}
                />

                {/* Interactive transparency demo */}
                <GtkFrame label="Adjustable Transparency">
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={16}
                        marginStart={16}
                        marginEnd={16}
                        marginTop={16}
                        marginBottom={16}
                    >
                        <GtkDrawingArea
                            ref={mainDrawingRef}
                            contentWidth={300}
                            contentHeight={150}
                            halign={Gtk.Align.CENTER}
                            cssClasses={["card"]}
                        />

                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                            <GtkLabel label="Alpha:" widthRequest={60} halign={Gtk.Align.START} />
                            <GtkScale
                                orientation={Gtk.Orientation.HORIZONTAL}
                                adjustment={alphaAdjustment}
                                drawValue
                                digits={2}
                                valuePos={Gtk.PositionType.RIGHT}
                                hexpand
                                onValueChanged={(scale: Gtk.Range) => setAlpha(scale.getValue())}
                            />
                        </GtkBox>

                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8} halign={Gtk.Align.CENTER}>
                            <GtkLabel label="Gradient:" />
                            {(["solid", "linear", "radial"] as const).map((type) => (
                                <GtkButton
                                    key={type}
                                    label={type.charAt(0).toUpperCase() + type.slice(1)}
                                    cssClasses={gradientType === type ? ["suggested-action"] : []}
                                    onClicked={() => setGradientType(type)}
                                />
                            ))}
                        </GtkBox>
                    </GtkBox>
                </GtkFrame>

                {/* Overlapping shapes demo */}
                <GtkFrame label="Overlapping Transparent Shapes">
                    <GtkBox
                        orientation={Gtk.Orientation.HORIZONTAL}
                        spacing={16}
                        marginStart={16}
                        marginEnd={16}
                        marginTop={16}
                        marginBottom={16}
                    >
                        <GtkDrawingArea
                            ref={overlappingRef}
                            contentWidth={200}
                            contentHeight={180}
                            cssClasses={["card"]}
                        />
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} valign={Gtk.Align.CENTER}>
                            <GtkLabel
                                label="RGB circles at 60% opacity blend together where they overlap, creating secondary and tertiary colors."
                                wrap
                                widthRequest={200}
                                cssClasses={["dim-label"]}
                            />
                            <GtkLabel label="Red + Green = Yellow" cssClasses={["caption"]} halign={Gtk.Align.START} />
                            <GtkLabel label="Green + Blue = Cyan" cssClasses={["caption"]} halign={Gtk.Align.START} />
                            <GtkLabel label="Red + Blue = Magenta" cssClasses={["caption"]} halign={Gtk.Align.START} />
                        </GtkBox>
                    </GtkBox>
                </GtkFrame>

                {/* Layered transparency */}
                <GtkFrame label="Layered Transparency">
                    <GtkBox
                        orientation={Gtk.Orientation.HORIZONTAL}
                        spacing={16}
                        marginStart={16}
                        marginEnd={16}
                        marginTop={16}
                        marginBottom={16}
                    >
                        <GtkDrawingArea ref={layeredRef} contentWidth={200} contentHeight={150} cssClasses={["card"]} />
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} valign={Gtk.Align.CENTER}>
                            <GtkLabel
                                label="Multiple layers stack with their alpha values affecting the final composited color."
                                wrap
                                widthRequest={200}
                                cssClasses={["dim-label"]}
                            />
                            <GtkLabel label="Layer 1: Blue @ 70%" cssClasses={["caption"]} halign={Gtk.Align.START} />
                            <GtkLabel label="Layer 2: Red @ 50%" cssClasses={["caption"]} halign={Gtk.Align.START} />
                            <GtkLabel label="Layer 3: Green @ 60%" cssClasses={["caption"]} halign={Gtk.Align.START} />
                        </GtkBox>
                    </GtkBox>
                </GtkFrame>

                {/* Window transparency info */}
                <GtkFrame label="Transparent Windows">
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={12}
                        marginStart={16}
                        marginEnd={16}
                        marginTop={16}
                        marginBottom={16}
                    >
                        <GtkLabel
                            label="For transparent windows, GTK4 requires:"
                            cssClasses={["heading"]}
                            halign={Gtk.Align.START}
                        />
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} cssClasses={[transparencyInfoStyle]}>
                            <GtkLabel
                                label="1. An RGBA visual (usually automatic on modern systems)"
                                halign={Gtk.Align.START}
                            />
                            <GtkLabel
                                label="2. CSS with transparent background: background-color: transparent;"
                                halign={Gtk.Align.START}
                            />
                            <GtkLabel
                                label="3. Compositor support (Wayland/X11 with compositing)"
                                halign={Gtk.Align.START}
                            />
                        </GtkBox>

                        <GtkLabel
                            label="Cairo RGBA Functions:"
                            cssClasses={["heading"]}
                            halign={Gtk.Align.START}
                            marginTop={8}
                        />
                        <GtkLabel
                            label={`setSourceRgba(cr, r, g, b, alpha) - Set color with alpha
patternAddColorStopRgba(pattern, offset, r, g, b, a) - Gradient stop with alpha
setOperator(cr, operator) - Control blending mode`}
                            halign={Gtk.Align.START}
                            cssClasses={["monospace"]}
                        />
                    </GtkBox>
                </GtkFrame>

                {/* Alpha blending explanation */}
                <GtkFrame label="Alpha Blending">
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={8}
                        marginStart={12}
                        marginEnd={12}
                        marginTop={12}
                        marginBottom={12}
                    >
                        <GtkLabel label="Alpha blending formula:" cssClasses={["heading"]} halign={Gtk.Align.START} />
                        <GtkLabel
                            label="result = (source * alpha) + (destination * (1 - alpha))"
                            halign={Gtk.Align.START}
                            cssClasses={["monospace"]}
                        />
                        <GtkLabel
                            label="Where alpha ranges from 0.0 (fully transparent) to 1.0 (fully opaque)."
                            wrap
                            halign={Gtk.Align.START}
                            cssClasses={["dim-label"]}
                            marginTop={4}
                        />
                    </GtkBox>
                </GtkFrame>
            </GtkBox>
        </GtkScrolledWindow>
    );
};

export const transparentDemo: Demo = {
    id: "transparent",
    title: "Transparency",
    description: "Transparent and translucent windows with RGBA visuals",
    keywords: ["transparent", "translucent", "rgba", "alpha", "opacity", "window", "cairo", "blending"],
    component: TransparentDemo,
    sourceCode,
};
