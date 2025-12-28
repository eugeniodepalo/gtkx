import * as cairo from "@gtkx/ffi/cairo";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkDrawingArea, GtkFrame, GtkLabel } from "@gtkx/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./path-sweep.tsx?raw";

// Easing functions
const easings = {
    linear: (t: number) => t,
    easeInQuad: (t: number) => t * t,
    easeOutQuad: (t: number) => t * (2 - t),
    easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    easeInCubic: (t: number) => t * t * t,
    easeOutCubic: (t: number) => (t - 1) ** 3 + 1,
    easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t ** 3 : (t - 1) * (2 * t - 2) ** 2 + 1),
    easeOutElastic: (t: number) => {
        const p = 0.3;
        return 2 ** (-10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
    },
    easeOutBounce: (t: number) => {
        if (t < 1 / 2.75) {
            return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
            const t2 = t - 1.5 / 2.75;
            return 7.5625 * t2 * t2 + 0.75;
        } else if (t < 2.5 / 2.75) {
            const t2 = t - 2.25 / 2.75;
            return 7.5625 * t2 * t2 + 0.9375;
        } else {
            const t2 = t - 2.625 / 2.75;
            return 7.5625 * t2 * t2 + 0.984375;
        }
    },
};

type EasingName = keyof typeof easings;

// Path sweep with dash animation
const createDashSweepDrawFunc = (progress: number, dashLength: number = 20) => {
    return (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
        const padding = 30;
        const w = width - padding * 2;
        const h = height - padding * 2;

        // Draw full path in gray
        cairo.setSourceRgba(cr, 0.5, 0.5, 0.5, 0.3);
        cairo.setLineWidth(cr, 4);
        cairo.setLineCap(cr, cairo.LineCap.ROUND);

        cairo.moveTo(cr, padding, padding + h / 2);
        cairo.curveTo(
            cr,
            padding + w * 0.25,
            padding,
            padding + w * 0.25,
            padding + h,
            padding + w * 0.5,
            padding + h / 2,
        );
        cairo.curveTo(cr, padding + w * 0.75, padding, padding + w * 0.75, padding + h, padding + w, padding + h / 2);
        cairo.stroke(cr);

        // Calculate approximate path length
        const pathLength = w * 2;

        // Draw animated dash
        cairo.setSourceRgb(cr, 0.2, 0.6, 0.9);
        cairo.setLineWidth(cr, 6);

        // Use dash offset to create sweep effect
        const dashOffset = -progress * pathLength;
        cairo.setDash(cr, [dashLength, pathLength - dashLength], dashOffset);

        cairo.moveTo(cr, padding, padding + h / 2);
        cairo.curveTo(
            cr,
            padding + w * 0.25,
            padding,
            padding + w * 0.25,
            padding + h,
            padding + w * 0.5,
            padding + h / 2,
        );
        cairo.curveTo(cr, padding + w * 0.75, padding, padding + w * 0.75, padding + h, padding + w, padding + h / 2);
        cairo.stroke(cr);

        // Reset dash
        cairo.setDash(cr, [], 0);
    };
};

// Path reveal animation (drawing the path progressively)
const createPathRevealDrawFunc = (progress: number) => {
    return (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
        const padding = 30;
        const w = width - padding * 2;
        const h = height - padding * 2;
        const pathLength = w * 2.5;

        // Draw background path
        cairo.setSourceRgba(cr, 0.5, 0.5, 0.5, 0.2);
        cairo.setLineWidth(cr, 3);
        cairo.setLineCap(cr, cairo.LineCap.ROUND);

        // Star shape
        const centerX = width / 2;
        const centerY = height / 2;
        const outerRadius = Math.min(w, h) / 2 - 10;
        const innerRadius = outerRadius * 0.4;
        const points = 5;

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

        // Draw revealed portion
        cairo.setSourceRgb(cr, 0.9, 0.4, 0.3);
        cairo.setLineWidth(cr, 5);

        const visibleLength = progress * pathLength * 1.2;
        cairo.setDash(cr, [visibleLength, pathLength * 2], 0);

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

        cairo.setDash(cr, [], 0);
    };
};

// Multiple dash sweep
const createMultiDashSweepDrawFunc = (progress: number) => {
    return (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
        const padding = 30;
        const w = width - padding * 2;
        const h = height - padding * 2;

        // Draw spiral
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(w, h) / 2;
        const spiralTurns = 3;
        const numPoints = 100;

        // Background
        cairo.setSourceRgba(cr, 0.5, 0.5, 0.5, 0.2);
        cairo.setLineWidth(cr, 2);

        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const angle = t * spiralTurns * 2 * Math.PI;
            const radius = t * maxRadius;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            if (i === 0) {
                cairo.moveTo(cr, x, y);
            } else {
                cairo.lineTo(cr, x, y);
            }
        }
        cairo.stroke(cr);

        // Animated dashes
        const pathLength = spiralTurns * Math.PI * maxRadius;
        const dashLength = pathLength / 8;
        const gapLength = dashLength;
        const dashOffset = -progress * pathLength * 2;

        cairo.setSourceRgb(cr, 0.4, 0.8, 0.5);
        cairo.setLineWidth(cr, 4);
        cairo.setLineCap(cr, cairo.LineCap.ROUND);
        cairo.setDash(cr, [dashLength, gapLength], dashOffset);

        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const angle = t * spiralTurns * 2 * Math.PI;
            const radius = t * maxRadius;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            if (i === 0) {
                cairo.moveTo(cr, x, y);
            } else {
                cairo.lineTo(cr, x, y);
            }
        }
        cairo.stroke(cr);

        cairo.setDash(cr, [], 0);
    };
};

// Animated sweep component
const AnimatedSweep = ({
    width,
    height,
    createDrawFunc,
    label,
    speed = 1,
    easing = "linear" as EasingName,
}: {
    width: number;
    height: number;
    createDrawFunc: (
        progress: number,
        extra?: number,
    ) => (self: Gtk.DrawingArea, cr: cairo.Context, w: number, h: number) => void;
    label: string;
    speed?: number;
    easing?: EasingName;
}) => {
    const ref = useRef<Gtk.DrawingArea | null>(null);
    const progressRef = useRef(0);
    const directionRef = useRef(1);

    useEffect(() => {
        const interval = setInterval(() => {
            progressRef.current += 0.01 * speed * directionRef.current;
            if (progressRef.current >= 1) {
                directionRef.current = -1;
            } else if (progressRef.current <= 0) {
                directionRef.current = 1;
            }

            const easedProgress = easings[easing](Math.max(0, Math.min(1, progressRef.current)));

            if (ref.current) {
                ref.current.setDrawFunc(createDrawFunc(easedProgress, 80));
                ref.current.queueDraw();
            }
        }, 16);

        return () => clearInterval(interval);
    }, [createDrawFunc, speed, easing]);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
            <GtkDrawingArea ref={ref} contentWidth={width} contentHeight={height} cssClasses={["card"]} />
            <GtkLabel label={label} cssClasses={["dim-label", "caption"]} />
        </GtkBox>
    );
};

// Easing function visualizer
const EasingVisualizer = () => {
    const ref = useRef<Gtk.DrawingArea | null>(null);
    const [selectedEasing, setSelectedEasing] = useState<EasingName>("easeOutQuad");
    const progressRef = useRef(0);

    const drawEasing = useCallback(
        (progress: number) => {
            return (_self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => {
                const padding = 30;
                const w = width - padding * 2;
                const h = height - padding * 2;

                // Draw axes
                cairo.setSourceRgba(cr, 0.5, 0.5, 0.5, 0.5);
                cairo.setLineWidth(cr, 1);
                cairo.moveTo(cr, padding, padding);
                cairo.lineTo(cr, padding, padding + h);
                cairo.lineTo(cr, padding + w, padding + h);
                cairo.stroke(cr);

                // Draw easing curve
                cairo.setSourceRgba(cr, 0.5, 0.5, 0.5, 0.3);
                cairo.setLineWidth(cr, 2);
                const easingFn = easings[selectedEasing];

                for (let i = 0; i <= 100; i++) {
                    const t = i / 100;
                    const x = padding + t * w;
                    const y = padding + h - easingFn(t) * h;
                    if (i === 0) {
                        cairo.moveTo(cr, x, y);
                    } else {
                        cairo.lineTo(cr, x, y);
                    }
                }
                cairo.stroke(cr);

                // Draw current position
                const x = padding + progress * w;
                const y = padding + h - easingFn(progress) * h;

                // Vertical line
                cairo.setSourceRgba(cr, 0.2, 0.6, 0.9, 0.5);
                cairo.setLineWidth(cr, 1);
                cairo.moveTo(cr, x, padding + h);
                cairo.lineTo(cr, x, y);
                cairo.stroke(cr);

                // Horizontal line
                cairo.moveTo(cr, padding, y);
                cairo.lineTo(cr, x, y);
                cairo.stroke(cr);

                // Point
                cairo.setSourceRgb(cr, 0.9, 0.3, 0.3);
                cairo.arc(cr, x, y, 6, 0, 2 * Math.PI);
                cairo.fill(cr);

                // Labels
                cairo.selectFontFace(cr, "Sans", cairo.FontSlant.NORMAL, cairo.FontWeight.NORMAL);
                cairo.setFontSize(cr, 10);
                cairo.setSourceRgb(cr, 0.5, 0.5, 0.5);
                cairo.moveTo(cr, padding - 5, padding + h + 15);
                cairo.showText(cr, "0");
                cairo.moveTo(cr, padding + w - 5, padding + h + 15);
                cairo.showText(cr, "1");
                cairo.moveTo(cr, padding - 20, padding + h);
                cairo.showText(cr, "0");
                cairo.moveTo(cr, padding - 20, padding + 5);
                cairo.showText(cr, "1");
            };
        },
        [selectedEasing],
    );

    useEffect(() => {
        const interval = setInterval(() => {
            progressRef.current = (progressRef.current + 0.008) % 1;
            if (ref.current) {
                ref.current.setDrawFunc(drawEasing(progressRef.current));
                ref.current.queueDraw();
            }
        }, 16);

        return () => clearInterval(interval);
    }, [drawEasing]);

    const easingNames = Object.keys(easings) as EasingName[];

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
            <GtkDrawingArea
                ref={ref}
                contentWidth={300}
                contentHeight={200}
                cssClasses={["card"]}
                halign={Gtk.Align.CENTER}
            />
            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={4} halign={Gtk.Align.CENTER} homogeneous>
                {easingNames.slice(0, 5).map((name) => (
                    <GtkButton
                        key={name}
                        label={name.replace("ease", "")}
                        onClicked={() => setSelectedEasing(name)}
                        cssClasses={selectedEasing === name ? ["suggested-action"] : ["flat"]}
                    />
                ))}
            </GtkBox>
            <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={4} halign={Gtk.Align.CENTER} homogeneous>
                {easingNames.slice(5).map((name) => (
                    <GtkButton
                        key={name}
                        label={name.replace("ease", "")}
                        onClicked={() => setSelectedEasing(name)}
                        cssClasses={selectedEasing === name ? ["suggested-action"] : ["flat"]}
                    />
                ))}
            </GtkBox>
        </GtkBox>
    );
};

const PathSweepDemo = () => {
    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Path Sweep Animations" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="Animate dash offset along paths to create sweep and reveal effects. Use easing functions for natural motion."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Sweep Animations */}
            <GtkFrame label="Sweep Effects">
                <GtkBox
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={24}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                    halign={Gtk.Align.CENTER}
                >
                    <AnimatedSweep
                        width={200}
                        height={150}
                        createDrawFunc={createDashSweepDrawFunc}
                        label="Dash Sweep"
                        easing="easeInOutQuad"
                    />
                    <AnimatedSweep
                        width={180}
                        height={180}
                        createDrawFunc={createPathRevealDrawFunc}
                        label="Path Reveal"
                        easing="easeOutCubic"
                    />
                    <AnimatedSweep
                        width={180}
                        height={180}
                        createDrawFunc={createMultiDashSweepDrawFunc}
                        label="Multi-Dash Spiral"
                        speed={0.5}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Easing Functions */}
            <GtkFrame label="Easing Functions">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={0}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <EasingVisualizer />
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const pathSweepDemo: Demo = {
    id: "path-sweep",
    title: "Path Sweep",
    description: "Animate dash offset for sweep and reveal effects",
    keywords: ["path", "sweep", "dash", "animation", "reveal", "easing", "offset", "stroke"],
    component: PathSweepDemo,
    sourceCode,
};
