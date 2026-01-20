import type { Context } from "@gtkx/ffi/cairo";
import * as Graphene from "@gtkx/ffi/graphene";
import * as Gsk from "@gtkx/ffi/gsk";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkDrawingArea, GtkLabel, GtkScrolledWindow, GtkWindow } from "@gtkx/react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Demo } from "../types.js";
import worldMapData from "./path_world.txt?raw";
import sourceCode from "./path-sweep.tsx?raw";

const INTERSECTION_CIRCLE_RADIUS = 4;

const PathSweepWindow = ({ onClose }: { onClose: () => void }) => {
    const areaRef = useRef<Gtk.DrawingArea | null>(null);
    const [mouseY, setMouseY] = useState<number | null>(null);

    const worldPath = useMemo(() => Gsk.Path.parse(worldMapData), []);

    const pathBounds = useMemo(() => {
        if (!worldPath) return null;
        const stroke = new Gsk.Stroke(2.0);
        const bounds = new Graphene.Rect();
        worldPath.getStrokeBounds(stroke, bounds);
        return {
            x: bounds.getX(),
            y: bounds.getY(),
            width: bounds.getWidth(),
            height: bounds.getHeight(),
        };
    }, [worldPath]);

    const stroke = useMemo(() => new Gsk.Stroke(2.0), []);

    const handleMotion = useCallback((_x: number, y: number) => {
        setMouseY(y);
        areaRef.current?.queueDraw();
    }, []);

    const handleEnter = useCallback((_x: number, y: number) => {
        setMouseY(y);
        areaRef.current?.queueDraw();
    }, []);

    const handleLeave = useCallback(() => {
        setMouseY(null);
        areaRef.current?.queueDraw();
    }, []);

    const drawScene = useCallback(
        (_self: Gtk.DrawingArea, cr: Context, _width: number, _height: number) => {
            if (!worldPath || !pathBounds) return;

            stroke.toCairo(cr);
            worldPath.toCairo(cr);
            cr.setSourceRgb(0, 0, 0);
            cr.stroke();

            if (mouseY !== null) {
                cr.setSourceRgba(0, 0, 0, 0.8);
                cr.moveTo(pathBounds.x, mouseY);
                cr.lineTo(pathBounds.x + pathBounds.width, mouseY);
                cr.stroke();

                const lineBuilder = new Gsk.PathBuilder();
                lineBuilder.moveTo(pathBounds.x - 10, mouseY);
                lineBuilder.lineTo(pathBounds.x + pathBounds.width + 10, mouseY);
                const linePath = lineBuilder.toPath();

                worldPath.foreachIntersection((path1: Gsk.Path, point1: Gsk.PathPoint) => {
                    const pos = new Graphene.Point();
                    point1.getPosition(path1, pos);
                    cr.arc(pos.getX(), pos.getY(), INTERSECTION_CIRCLE_RADIUS, 0, 2 * Math.PI);
                    return true;
                }, linePath);
                cr.setSourceRgb(1, 0, 0);
                cr.fill();
            }
        },
        [worldPath, pathBounds, mouseY, stroke],
    );

    const contentWidth = pathBounds ? Math.ceil(pathBounds.width) + 20 : 800;
    const contentHeight = pathBounds ? Math.ceil(pathBounds.height) + 20 : 400;

    return (
        <GtkWindow title="World Map" defaultWidth={1581} defaultHeight={726} onClose={onClose}>
            <GtkScrolledWindow>
                <GtkDrawingArea
                    ref={areaRef}
                    onDraw={drawScene}
                    onMotion={handleMotion}
                    onEnter={handleEnter}
                    onLeave={handleLeave}
                    contentWidth={contentWidth}
                    contentHeight={contentHeight}
                />
            </GtkScrolledWindow>
        </GtkWindow>
    );
};

const PathSweepDemo = () => {
    const [showWindow, setShowWindow] = useState(false);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12} valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>
            <GtkLabel label="Path Sweep" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="This demo shows how path intersections can be used. The world map is a path with 211 lines and 1569 cubic Bézier segments in 121 contours."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
                maxWidthChars={60}
            />

            <GtkButton label="Open World Map" onClicked={() => setShowWindow(true)} cssClasses={["suggested-action"]} />

            {showWindow && <PathSweepWindow onClose={() => setShowWindow(false)} />}
        </GtkBox>
    );
};

export const pathSweepDemo: Demo = {
    id: "path-sweep",
    title: "Path/Sweep",
    description:
        "This demo shows how path intersections can be used. The world map is a path with 211 lines and 1569 cubic Bézier segments in 121 contours.",
    keywords: ["path", "sweep", "intersection", "world", "map", "foreachIntersection", "PathPoint"],
    component: PathSweepDemo,
    sourceCode,
};
