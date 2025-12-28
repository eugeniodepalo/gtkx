import { type Context, FontSlant, FontWeight, LineCap } from "@gtkx/ffi/cairo";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkDrawingArea, GtkFrame, GtkLabel, GtkScale } from "@gtkx/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./path-walk.tsx?raw";

// Path types
type PathPoint = { x: number; y: number; angle: number };

// Calculate points along a cubic bezier curve
const getCubicBezierPoint = (
    t: number,
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
): PathPoint => {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
    const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;

    // Calculate tangent
    const dx = 3 * uu * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * tt * (p3.x - p2.x);
    const dy = 3 * uu * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * tt * (p3.y - p2.y);
    const angle = Math.atan2(dy, dx);

    return { x, y, angle };
};

// Pre-calculate path points for arc-length parameterization
const buildPathTable = (
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    numSamples: number = 500,
): { points: PathPoint[]; totalLength: number; lengths: number[] } => {
    const points: PathPoint[] = [];
    const lengths: number[] = [0];
    let totalLength = 0;

    for (let i = 0; i <= numSamples; i++) {
        const t = i / numSamples;
        const point = getCubicBezierPoint(t, p0, p1, p2, p3);
        points.push(point);

        if (i > 0) {
            const prev = points[i - 1] as PathPoint;
            const segmentLength = Math.sqrt((point.x - prev.x) ** 2 + (point.y - prev.y) ** 2);
            totalLength += segmentLength;
            lengths.push(totalLength);
        }
    }

    return { points, totalLength, lengths };
};

// Get point at a specific distance along the path
const getPointAtLength = (
    targetLength: number,
    pathTable: { points: PathPoint[]; totalLength: number; lengths: number[] },
): PathPoint => {
    const { points, lengths } = pathTable;

    // Binary search for the segment
    let low = 0;
    let high = lengths.length - 1;

    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if ((lengths[mid] as number) < targetLength) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }

    const idx = Math.max(0, low - 1);
    const nextIdx = Math.min(lengths.length - 1, idx + 1);

    if (idx === nextIdx) {
        return points[idx] as PathPoint;
    }

    // Interpolate between points
    const segmentStart = lengths[idx] as number;
    const segmentEnd = lengths[nextIdx] as number;
    const segmentLength = segmentEnd - segmentStart;
    const t = segmentLength > 0 ? (targetLength - segmentStart) / segmentLength : 0;

    const p1 = points[idx] as PathPoint;
    const p2 = points[nextIdx] as PathPoint;

    return {
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t,
        angle: p1.angle + (p2.angle - p1.angle) * t,
    };
};

// Draw an arrow shape at a position
const drawArrow = (cr: Context, x: number, y: number, angle: number, size: number) => {
    cr.save().translate(x, y).rotate(angle);

    // Arrow body
    cr.moveTo(size * 0.6, 0)
        .lineTo(-size * 0.4, -size * 0.4)
        .lineTo(-size * 0.2, 0)
        .lineTo(-size * 0.4, size * 0.4)
        .closePath();

    cr.restore();
};

// Draw a car shape
const drawCar = (cr: Context, x: number, y: number, angle: number, size: number) => {
    cr.save().translate(x, y).rotate(angle);

    // Car body
    cr.setSourceRgb(0.2, 0.5, 0.8)
        .rectangle(-size * 0.5, -size * 0.25, size, size * 0.5)
        .fill();

    // Roof
    cr.setSourceRgb(0.3, 0.6, 0.9)
        .rectangle(-size * 0.2, -size * 0.2, size * 0.5, size * 0.4)
        .fill();

    // Wheels
    cr.setSourceRgb(0.2, 0.2, 0.2)
        .arc(-size * 0.3, -size * 0.3, size * 0.12, 0, 2 * Math.PI)
        .fill();
    cr.arc(size * 0.3, -size * 0.3, size * 0.12, 0, 2 * Math.PI).fill();
    cr.arc(-size * 0.3, size * 0.3, size * 0.12, 0, 2 * Math.PI).fill();
    cr.arc(size * 0.3, size * 0.3, size * 0.12, 0, 2 * Math.PI).fill();

    cr.restore();
};

// Draw a simple plane
const drawPlane = (cr: Context, x: number, y: number, angle: number, size: number) => {
    cr.save().translate(x, y).rotate(angle);

    // Fuselage
    cr.setSourceRgb(0.9, 0.9, 0.95)
        .moveTo(size * 0.6, 0)
        .lineTo(-size * 0.4, -size * 0.1)
        .lineTo(-size * 0.5, 0)
        .lineTo(-size * 0.4, size * 0.1)
        .closePath()
        .fill();

    // Wings
    cr.setSourceRgb(0.7, 0.7, 0.8)
        .moveTo(0, 0)
        .lineTo(-size * 0.15, -size * 0.5)
        .lineTo(-size * 0.25, -size * 0.5)
        .lineTo(-size * 0.15, 0)
        .closePath()
        .fill();
    cr.moveTo(0, 0)
        .lineTo(-size * 0.15, size * 0.5)
        .lineTo(-size * 0.25, size * 0.5)
        .lineTo(-size * 0.15, 0)
        .closePath()
        .fill();

    // Tail
    cr.moveTo(-size * 0.4, 0)
        .lineTo(-size * 0.5, -size * 0.2)
        .lineTo(-size * 0.55, -size * 0.2)
        .lineTo(-size * 0.5, 0)
        .closePath()
        .fill();

    cr.restore();
};

// Interactive path walk component
const PathWalkDemo = () => {
    const ref = useRef<Gtk.DrawingArea | null>(null);
    const [speed, setSpeed] = useState(1);
    const [objectType, setObjectType] = useState<"arrow" | "car" | "plane">("arrow");
    const [isRunning, setIsRunning] = useState(true);
    const [showPath, setShowPath] = useState(true);
    const progressRef = useRef(0);
    const pathTableRef = useRef<ReturnType<typeof buildPathTable> | null>(null);
    const speedAdjustment = useMemo(() => new Gtk.Adjustment(1, 0.2, 3, 0.1, 0.5, 0), []);

    const canvasWidth = 500;
    const canvasHeight = 350;

    // Build path on mount
    useEffect(() => {
        const padding = 40;
        const p0 = { x: padding, y: canvasHeight - padding };
        const p1 = { x: canvasWidth * 0.25, y: padding };
        const p2 = { x: canvasWidth * 0.75, y: canvasHeight - padding };
        const p3 = { x: canvasWidth - padding, y: padding };

        pathTableRef.current = buildPathTable(p0, p1, p2, p3);
    }, []);

    const drawScene = useCallback(
        (progress: number) => {
            return (_self: Gtk.DrawingArea, cr: Context, width: number, height: number) => {
                if (!pathTableRef.current) return;

                const { totalLength } = pathTableRef.current;
                const padding = 40;

                // Define bezier control points
                const p0 = { x: padding, y: height - padding };
                const p1 = { x: width * 0.25, y: padding };
                const p2 = { x: width * 0.75, y: height - padding };
                const p3 = { x: width - padding, y: padding };

                // Draw path
                if (showPath) {
                    cr.setSourceRgba(0.5, 0.5, 0.5, 0.4)
                        .setLineWidth(3)
                        .setLineCap(LineCap.ROUND)
                        .moveTo(p0.x, p0.y)
                        .curveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y)
                        .stroke();

                    // Draw control points
                    cr.setSourceRgba(0.8, 0.4, 0.4, 0.5).setLineWidth(1);

                    // Control lines
                    cr.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y).stroke();
                    cr.moveTo(p2.x, p2.y).lineTo(p3.x, p3.y).stroke();

                    // Control points
                    for (const p of [p0, p1, p2, p3]) {
                        cr.arc(p.x, p.y, 5, 0, 2 * Math.PI).fill();
                    }
                }

                // Get position on path
                const distance = progress * totalLength;
                const point = getPointAtLength(distance, pathTableRef.current);

                // Draw trail
                cr.setSourceRgba(0.2, 0.6, 0.9, 0.3).setLineWidth(2);
                const numTrailPoints = 30;
                for (let i = numTrailPoints; i >= 0; i--) {
                    const trailProgress = Math.max(0, progress - i * 0.005);
                    const trailDistance = trailProgress * totalLength;
                    const trailPoint = getPointAtLength(trailDistance, pathTableRef.current);
                    if (i === numTrailPoints) {
                        cr.moveTo(trailPoint.x, trailPoint.y);
                    } else {
                        cr.lineTo(trailPoint.x, trailPoint.y);
                    }
                }
                cr.stroke();

                // Draw object
                const objectSize = 25;
                switch (objectType) {
                    case "arrow":
                        cr.setSourceRgb(0.9, 0.4, 0.2);
                        drawArrow(cr, point.x, point.y, point.angle, objectSize);
                        cr.fill();
                        break;
                    case "car":
                        drawCar(cr, point.x, point.y, point.angle, objectSize);
                        break;
                    case "plane":
                        drawPlane(cr, point.x, point.y, point.angle, objectSize);
                        break;
                }

                // Draw progress info
                cr.selectFontFace("Sans", FontSlant.NORMAL, FontWeight.NORMAL)
                    .setFontSize(12)
                    .setSourceRgb(0.5, 0.5, 0.5)
                    .moveTo(10, 20)
                    .showText(`Progress: ${(progress * 100).toFixed(1)}%`);
                cr.moveTo(10, 35).showText(`Angle: ${((point.angle * 180) / Math.PI).toFixed(1)}°`);
            };
        },
        [objectType, showPath],
    );

    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            progressRef.current = (progressRef.current + 0.003 * speed) % 1;
            if (ref.current) {
                ref.current.setDrawFunc(drawScene(progressRef.current));
                ref.current.queueDraw();
            }
        }, 16);

        return () => clearInterval(interval);
    }, [drawScene, speed, isRunning]);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Object Walking Along Path" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="Animate objects along bezier paths with proper tangent rotation. Uses arc-length parameterization for constant speed."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            <GtkFrame label="Path Animation">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={16}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkDrawingArea
                        ref={ref}
                        contentWidth={canvasWidth}
                        contentHeight={canvasHeight}
                        cssClasses={["card"]}
                        halign={Gtk.Align.CENTER}
                    />

                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={16} halign={Gtk.Align.CENTER}>
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                            <GtkLabel label="Speed:" cssClasses={["dim-label"]} />
                            <GtkScale
                                orientation={Gtk.Orientation.HORIZONTAL}
                                drawValue
                                valuePos={Gtk.PositionType.RIGHT}
                                digits={1}
                                adjustment={speedAdjustment}
                                onValueChanged={(range: Gtk.Range) => setSpeed(range.getValue())}
                                widthRequest={120}
                            />
                        </GtkBox>
                        <GtkButton
                            label={isRunning ? "Pause" : "Play"}
                            onClicked={() => setIsRunning(!isRunning)}
                            cssClasses={["flat"]}
                        />
                        <GtkButton
                            label={showPath ? "Hide Path" : "Show Path"}
                            onClicked={() => setShowPath(!showPath)}
                            cssClasses={["flat"]}
                        />
                    </GtkBox>

                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8} halign={Gtk.Align.CENTER}>
                        <GtkLabel label="Object:" cssClasses={["dim-label"]} />
                        <GtkButton
                            label="Arrow"
                            onClicked={() => setObjectType("arrow")}
                            cssClasses={objectType === "arrow" ? ["suggested-action"] : ["flat"]}
                        />
                        <GtkButton
                            label="Car"
                            onClicked={() => setObjectType("car")}
                            cssClasses={objectType === "car" ? ["suggested-action"] : ["flat"]}
                        />
                        <GtkButton
                            label="Plane"
                            onClicked={() => setObjectType("plane")}
                            cssClasses={objectType === "plane" ? ["suggested-action"] : ["flat"]}
                        />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="How It Works">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="1. Build a lookup table of path points with cumulative lengths"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkLabel
                        label="2. Use binary search to find position at any distance"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkLabel
                        label="3. Calculate tangent angle from path derivative"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkLabel
                        label="4. Rotate object to align with path direction"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const pathWalkDemo: Demo = {
    id: "path-walk",
    title: "Path Walk",
    description: "Animate objects along paths with tangent rotation",
    keywords: ["path", "walk", "animation", "bezier", "tangent", "rotation", "arc-length", "parameterization"],
    component: PathWalkDemo,
    sourceCode,
};
