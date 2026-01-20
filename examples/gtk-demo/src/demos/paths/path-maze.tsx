import { createRef } from "@gtkx/ffi";
import { type Context, Pattern } from "@gtkx/ffi/cairo";
import * as Graphene from "@gtkx/ffi/graphene";
import * as Gsk from "@gtkx/ffi/gsk";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkDrawingArea, GtkLabel, GtkWindow } from "@gtkx/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./path-maze.tsx?raw";

const MAZE_GRID_SIZE = 20;
const MAZE_WIDTH = 31;
const MAZE_HEIGHT = 21;
const STROKE_SIZE_ACTIVE = MAZE_GRID_SIZE - 4;
const STROKE_SIZE_INACTIVE = MAZE_GRID_SIZE - 12;

function shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = result[i];
        const swapVal = result[j];
        if (temp !== undefined && swapVal !== undefined) {
            result[i] = swapVal;
            result[j] = temp;
        }
    }
    return result;
}

function createMazePath(): Gsk.Path {
    const builder = new Gsk.PathBuilder();
    const visited = new Set<string>();
    const walls: boolean[][] = Array(MAZE_HEIGHT)
        .fill(null)
        .map(() => Array(MAZE_WIDTH).fill(true));

    const directions: [number, number][] = [
        [0, -2],
        [2, 0],
        [0, 2],
        [-2, 0],
    ];

    function carve(x: number, y: number) {
        visited.add(`${x},${y}`);
        const row = walls[y];
        if (row) row[x] = false;

        for (const [dx, dy] of shuffle(directions)) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 1 && nx < MAZE_WIDTH - 1 && ny >= 1 && ny < MAZE_HEIGHT - 1 && !visited.has(`${nx},${ny}`)) {
                const midRow = walls[y + dy / 2];
                if (midRow) midRow[x + dx / 2] = false;
                carve(nx, ny);
            }
        }
    }

    carve(1, 1);

    for (let y = 0; y < MAZE_HEIGHT; y++) {
        for (let x = 0; x < MAZE_WIDTH; x++) {
            if (!walls[y]?.[x]) {
                const px = (x + 0.5) * MAZE_GRID_SIZE;
                const py = (y + 0.5) * MAZE_GRID_SIZE;

                if (!walls[y]?.[x + 1]) {
                    builder.moveTo(px, py);
                    builder.lineTo(px + MAZE_GRID_SIZE, py);
                }
                if (!walls[y + 1]?.[x]) {
                    builder.moveTo(px, py);
                    builder.lineTo(px, py + MAZE_GRID_SIZE);
                }
            }
        }
    }

    builder.moveTo(1.5 * MAZE_GRID_SIZE, 0.5 * MAZE_GRID_SIZE);
    builder.lineTo(1.5 * MAZE_GRID_SIZE, -0.5 * MAZE_GRID_SIZE);

    builder.moveTo((MAZE_WIDTH - 1.5) * MAZE_GRID_SIZE, (MAZE_HEIGHT - 1.5) * MAZE_GRID_SIZE);
    builder.lineTo((MAZE_WIDTH - 1.5) * MAZE_GRID_SIZE, (MAZE_HEIGHT - 0.5) * MAZE_GRID_SIZE);

    return builder.toPath();
}

const MazeWindow = ({ onClose }: { onClose: () => void }) => {
    const areaRef = useRef<Gtk.DrawingArea | null>(null);
    const [path, setPath] = useState<Gsk.Path | null>(null);
    const [active, setActive] = useState(false);
    const [seed, setSeed] = useState(0);

    useEffect(() => {
        void seed;
        setPath(createMazePath());
    }, [seed]);

    const activeStroke = useMemo(() => {
        const stroke = new Gsk.Stroke(STROKE_SIZE_ACTIVE);
        stroke.setLineJoin(Gsk.LineJoin.ROUND);
        stroke.setLineCap(Gsk.LineCap.ROUND);
        return stroke;
    }, []);

    const inactiveStroke = useMemo(() => {
        const stroke = new Gsk.Stroke(STROKE_SIZE_INACTIVE);
        stroke.setLineJoin(Gsk.LineJoin.ROUND);
        stroke.setLineCap(Gsk.LineCap.ROUND);
        return stroke;
    }, []);

    const queryPoint = useMemo(() => {
        const point = new Graphene.Point();
        point.init(0, 0);
        return point;
    }, []);

    const pathPointRef = useRef<Gsk.PathPoint | null>(null);

    const handleMotion = useCallback(
        (mouseX: number, mouseY: number) => {
            if (!path || !active) return;

            queryPoint.init(mouseX, mouseY);
            const distanceRef = createRef(0.0);

            if (!pathPointRef.current) {
                pathPointRef.current = new Gsk.PathPoint();
            }

            const found = path.getClosestPoint(queryPoint, Infinity, pathPointRef.current, distanceRef);

            if (found && distanceRef.value > STROKE_SIZE_ACTIVE / 2) {
                setActive(false);
                areaRef.current?.queueDraw();
            }
        },
        [path, active, queryPoint],
    );

    const handleEnter = useCallback(
        (_x: number, _y: number) => {
            if (!active) {
                setActive(true);
                areaRef.current?.queueDraw();
            }
        },
        [active],
    );

    const handleLeave = useCallback(() => {
        if (active) {
            setActive(false);
            areaRef.current?.queueDraw();
        }
    }, [active]);

    const drawMaze = useCallback(
        (_self: Gtk.DrawingArea, cr: Context, width: number, height: number) => {
            if (!path) return;

            const currentStroke = active ? activeStroke : inactiveStroke;
            currentStroke.toCairo(cr);
            path.toCairo(cr);

            const gradient = Pattern.createLinear(0, 0, width, height)
                .addColorStopRgb(0.0, 1.0, 0.0, 0.0)
                .addColorStopRgb(0.17, 1.0, 1.0, 0.0)
                .addColorStopRgb(0.33, 0.0, 1.0, 0.0)
                .addColorStopRgb(0.5, 0.0, 1.0, 1.0)
                .addColorStopRgb(0.67, 0.0, 0.0, 1.0)
                .addColorStopRgb(0.83, 1.0, 0.0, 1.0)
                .addColorStopRgb(1.0, 1.0, 0.0, 0.0);

            cr.setSource(gradient);
            cr.stroke();
        },
        [path, active, activeStroke, inactiveStroke],
    );

    const handleRegenerate = useCallback(() => {
        setSeed((s) => s + 1);
        setActive(false);
    }, []);

    return (
        <GtkWindow title="Follow the maze with the mouse" resizable={false} onClose={onClose}>
            <GtkBox
                orientation={Gtk.Orientation.VERTICAL}
                spacing={8}
                marginTop={8}
                marginBottom={8}
                marginStart={8}
                marginEnd={8}
            >
                <GtkDrawingArea
                    ref={areaRef}
                    contentWidth={MAZE_WIDTH * MAZE_GRID_SIZE}
                    contentHeight={MAZE_HEIGHT * MAZE_GRID_SIZE}
                    onDraw={drawMaze}
                    onMotion={handleMotion}
                    onEnter={handleEnter}
                    onLeave={handleLeave}
                />
                <GtkBox spacing={8} halign={Gtk.Align.CENTER}>
                    <GtkButton label="New Maze" onClicked={handleRegenerate} />
                </GtkBox>
                <GtkLabel
                    label={
                        active
                            ? "Stay on the path! Move from the top entrance to the bottom exit."
                            : "Move your mouse into the maze to start. Try to reach the exit!"
                    }
                    cssClasses={active ? [] : ["dim-label"]}
                    halign={Gtk.Align.CENTER}
                    wrap
                />
            </GtkBox>
        </GtkWindow>
    );
};

const PathMazeDemo = () => {
    const [showWindow, setShowWindow] = useState(false);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12} valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>
            <GtkLabel label="Path Maze Game" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="This demo demonstrates GSK Path API usage for collision detection. The maze is built using GskPathBuilder and rendered with gsk_path_to_cairo(). Mouse tracking uses gsk_path_get_closest_point() to detect when the cursor leaves the path."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
                maxWidthChars={60}
            />

            <GtkButton
                label="Open Maze Window"
                onClicked={() => setShowWindow(true)}
                cssClasses={["suggested-action"]}
            />

            {showWindow && <MazeWindow onClose={() => setShowWindow(false)} />}
        </GtkBox>
    );
};

export const pathMazeDemo: Demo = {
    id: "path-maze",
    title: "Path/Maze",
    description:
        "Follow the maze with your mouse. Uses GskPathBuilder to construct the maze and gsk_path_get_closest_point() for collision detection.",
    keywords: ["maze", "path", "gsk", "PathBuilder", "getClosestPoint", "collision", "detection", "game", "mouse"],
    component: PathMazeDemo,
    sourceCode,
};
