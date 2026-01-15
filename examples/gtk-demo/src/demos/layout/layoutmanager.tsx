import { css } from "@gtkx/css";
import * as Gdk from "@gtkx/ffi/gdk";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkFixed, GtkFrame, GtkLabel, x } from "@gtkx/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./layoutmanager.tsx?raw";

const CHILD_COUNT = 16;
const COLUMNS = 4;
const CHILD_SIZE = 50;
const CONTAINER_SIZE = 400;

const COLORS = [
    "rgba(239, 41, 41, 0.8)",
    "rgba(252, 175, 62, 0.8)",
    "rgba(252, 233, 79, 0.8)",
    "rgba(138, 226, 52, 0.8)",
    "rgba(114, 159, 207, 0.8)",
    "rgba(173, 127, 168, 0.8)",
    "rgba(233, 185, 110, 0.8)",
    "rgba(136, 138, 133, 0.8)",
    "rgba(204, 0, 0, 0.8)",
    "rgba(206, 92, 0, 0.8)",
    "rgba(196, 160, 0, 0.8)",
    "rgba(78, 154, 6, 0.8)",
    "rgba(52, 101, 164, 0.8)",
    "rgba(117, 80, 123, 0.8)",
    "rgba(193, 125, 17, 0.8)",
    "rgba(85, 87, 83, 0.8)",
];

const childStyles = COLORS.map(
    (color) => css`
        frame& {
            background-color: ${color};
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
        }
    `,
);

const containerStyle = css`
    background: linear-gradient(135deg, alpha(@window_bg_color, 0.95), alpha(@window_bg_color, 0.85));
    border-radius: 12px;
`;

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface ChildData {
    id: number;
    circlePosition: number;
}

const LayoutManagerDemo = () => {
    const [transitionProgress, setTransitionProgress] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [targetProgress, setTargetProgress] = useState(0);

    const fixedRef = useRef<Gtk.Fixed | null>(null);
    const tickIdRef = useRef<number | null>(null);
    const animStartTimeRef = useRef<number | null>(null);
    const animStartProgressRef = useRef<number>(0);

    const [children, setChildren] = useState<ChildData[]>(() =>
        Array.from({ length: CHILD_COUNT }, (_, i) => ({
            id: i,
            circlePosition: i,
        })),
    );

    const centerX = CONTAINER_SIZE / 2;
    const centerY = CONTAINER_SIZE / 2;
    const gridSpacing = 8;
    const gridCellSize = CHILD_SIZE + gridSpacing;
    const circleRadius = (COLUMNS * CHILD_SIZE) / Math.PI;

    const getGridPosition = useCallback(
        (index: number) => {
            const col = index % COLUMNS;
            const row = Math.floor(index / COLUMNS);
            const gridWidth = COLUMNS * gridCellSize - gridSpacing;
            const gridHeight = COLUMNS * gridCellSize - gridSpacing;
            const startX = centerX - gridWidth / 2;
            const startY = centerY - gridHeight / 2;
            return {
                x: startX + col * gridCellSize,
                y: startY + row * gridCellSize,
            };
        },
        [centerX, centerY, gridCellSize],
    );

    const getCirclePosition = useCallback(
        (circlePos: number) => {
            const angle = (circlePos * Math.PI) / (CHILD_COUNT / 2);
            return {
                x: centerX + Math.sin(angle) * circleRadius - CHILD_SIZE / 2,
                y: centerY + Math.cos(angle) * circleRadius - CHILD_SIZE / 2,
            };
        },
        [centerX, centerY, circleRadius],
    );

    const getChildPosition = useCallback(
        (index: number, circlePos: number, t: number) => {
            const grid = getGridPosition(index);
            const circle = getCirclePosition(circlePos);
            const easedT = easeInOutCubic(t);
            return {
                x: lerp(grid.x, circle.x, easedT),
                y: lerp(grid.y, circle.y, easedT),
            };
        },
        [getGridPosition, getCirclePosition],
    );

    const ANIM_DURATION_MS = 500;

    const tickCallback = useCallback(
        (_widget: Gtk.Widget, frameClock: Gdk.FrameClock): boolean => {
            const frameTime = frameClock.getFrameTime();

            if (animStartTimeRef.current === null) {
                animStartTimeRef.current = frameTime;
                animStartProgressRef.current = transitionProgress;
            }

            const elapsed = (frameTime - animStartTimeRef.current) / 1000;
            const duration = ANIM_DURATION_MS;
            const rawT = Math.min(elapsed / duration, 1);

            const startP = animStartProgressRef.current;
            const endP = targetProgress;
            const newProgress = lerp(startP, endP, rawT);

            setTransitionProgress(newProgress);

            if (rawT >= 1) {
                setIsAnimating(false);
                animStartTimeRef.current = null;
                return false;
            }

            return true;
        },
        [targetProgress, transitionProgress],
    );

    const startAnimation = useCallback(
        (newTarget: number) => {
            const fixed = fixedRef.current;
            if (!fixed) return;

            if (tickIdRef.current !== null) {
                fixed.removeTickCallback(tickIdRef.current);
            }

            setTargetProgress(newTarget);
            animStartTimeRef.current = null;
            animStartProgressRef.current = transitionProgress;
            tickIdRef.current = fixed.addTickCallback(tickCallback);
            setIsAnimating(true);
        },
        [tickCallback, transitionProgress],
    );

    const handleClick = useCallback(
        (_nPress: number, _x: number, _y: number) => {
            if (isAnimating) return;

            const newTarget = transitionProgress < 0.5 ? 1 : 0;

            if (newTarget === 0) {
                setChildren((prev) => {
                    const shuffled = [...prev];
                    for (let i = shuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        const itemI = shuffled[i];
                        const itemJ = shuffled[j];
                        if (itemI && itemJ) {
                            const temp = itemI.circlePosition;
                            itemI.circlePosition = itemJ.circlePosition;
                            itemJ.circlePosition = temp;
                        }
                    }
                    return shuffled;
                });
            }

            startAnimation(newTarget);
        },
        [isAnimating, transitionProgress, startAnimation],
    );

    useEffect(() => {
        return () => {
            if (fixedRef.current && tickIdRef.current !== null) {
                fixedRef.current.removeTickCallback(tickIdRef.current);
            }
        };
    }, []);

    const handleFixedRef = useCallback((fixed: Gtk.Fixed | null) => {
        if (fixedRef.current && tickIdRef.current !== null) {
            fixedRef.current.removeTickCallback(tickIdRef.current);
            tickIdRef.current = null;
        }
        fixedRef.current = fixed;
    }, []);

    const childPositions = useMemo(() => {
        return children.map((child, index) => ({
            ...child,
            position: getChildPosition(index, child.circlePosition, transitionProgress),
        }));
    }, [children, transitionProgress, getChildPosition]);

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={20}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkFrame label="Grid ↔ Circle Transition">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Click the layout to animate between grid and circular arrangements"
                        wrap
                        cssClasses={["dim-label"]}
                    />

                    <GtkFixed
                        ref={handleFixedRef}
                        widthRequest={CONTAINER_SIZE}
                        heightRequest={CONTAINER_SIZE}
                        cssClasses={[containerStyle]}
                        halign={Gtk.Align.CENTER}
                        onReleased={handleClick}
                    >
                        {childPositions.map((child) => (
                            <x.FixedChild key={child.id} x={child.position.x} y={child.position.y}>
                                <GtkFrame
                                    widthRequest={CHILD_SIZE}
                                    heightRequest={CHILD_SIZE}
                                    cssClasses={[childStyles[child.id] ?? ""]}
                                />
                            </x.FixedChild>
                        ))}
                    </GtkFixed>

                    <GtkLabel
                        label={`Layout: ${transitionProgress < 0.5 ? "Grid" : "Circle"} (${Math.round(transitionProgress * 100)}%)`}
                        cssClasses={["dim-label", "caption"]}
                    />
                </GtkBox>
            </GtkFrame>

            <GtkFrame label="Implementation">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={6}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkBox spacing={12}>
                        <GtkLabel label="Grid Position" widthChars={16} xalign={0} cssClasses={["monospace"]} />
                        <GtkLabel label="x = col * cellSize, y = row * cellSize" cssClasses={["dim-label"]} />
                    </GtkBox>
                    <GtkBox spacing={12}>
                        <GtkLabel label="Circle Position" widthChars={16} xalign={0} cssClasses={["monospace"]} />
                        <GtkLabel label="x = sin(θ) * r, y = cos(θ) * r" cssClasses={["dim-label"]} />
                    </GtkBox>
                    <GtkBox spacing={12}>
                        <GtkLabel label="Interpolation" widthChars={16} xalign={0} cssClasses={["monospace"]} />
                        <GtkLabel label="pos = lerp(grid, circle, t)" cssClasses={["dim-label"]} />
                    </GtkBox>
                    <GtkBox spacing={12}>
                        <GtkLabel label="Easing" widthChars={16} xalign={0} cssClasses={["monospace"]} />
                        <GtkLabel label="Cubic ease-in-out for smooth motion" cssClasses={["dim-label"]} />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

export const layoutManagerDemo: Demo = {
    id: "layoutmanager",
    title: "Layout Manager/Transition",
    description: "Custom layout manager patterns and positioning",
    keywords: ["layout", "manager", "custom", "circular", "grid", "positioning", "transition", "animation"],
    component: LayoutManagerDemo,
    sourceCode,
};
