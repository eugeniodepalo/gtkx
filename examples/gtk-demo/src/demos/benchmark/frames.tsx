import type { Context } from "@gtkx/ffi/cairo";
import type * as Gdk from "@gtkx/ffi/gdk";
import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkDrawingArea, GtkHeaderBar, GtkLabel, x } from "@gtkx/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Demo } from "../types.js";
import sourceCode from "./frames.tsx?raw";

interface Color {
    r: number;
    g: number;
    b: number;
}

const randomColor = (): Color => ({
    r: Math.random(),
    g: Math.random(),
    b: Math.random(),
});

const lerpColor = (c1: Color, c2: Color, t: number): Color => ({
    r: c1.r * (1 - t) + c2.r * t,
    g: c1.g * (1 - t) + c2.g * t,
    b: c1.b * (1 - t) + c2.b * t,
});

const TIME_SPAN_US = 3_000_000;

const FramesDemo = () => {
    const drawingRef = useRef<Gtk.DrawingArea>(null);
    const [fps, setFps] = useState(0);
    const tickIdRef = useRef<number | null>(null);
    const fpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const color1Ref = useRef<Color>(randomColor());
    const color2Ref = useRef<Color>(randomColor());
    const time2Ref = useRef<number>(0);

    const draw = useCallback((cr: Context, width: number, height: number) => {
        const t = 1 - time2Ref.current / TIME_SPAN_US;
        const color = lerpColor(color1Ref.current, color2Ref.current, Math.max(0, Math.min(1, t)));
        cr.setSourceRgb(color.r, color.g, color.b).rectangle(0, 0, width, height).fill();
    }, []);

    const tickCallback = useCallback((_widget: Gtk.Widget, frameClock: Gdk.FrameClock): boolean => {
        const now = frameClock.getFrameTime();

        if (time2Ref.current === 0) {
            time2Ref.current = now + TIME_SPAN_US;
        }

        if (now >= time2Ref.current) {
            time2Ref.current = now + TIME_SPAN_US;
            color1Ref.current = color2Ref.current;
            color2Ref.current = randomColor();
        }

        drawingRef.current?.queueDraw();
        return true;
    }, []);

    useEffect(() => {
        const area = drawingRef.current;
        if (!area) return;

        tickIdRef.current = area.addTickCallback(tickCallback);

        fpsIntervalRef.current = setInterval(() => {
            const frameClock = area.getFrameClock();
            if (frameClock) {
                setFps(frameClock.getFps());
            }
        }, 500);

        return () => {
            if (tickIdRef.current !== null) {
                area.removeTickCallback(tickIdRef.current);
                tickIdRef.current = null;
            }
            if (fpsIntervalRef.current !== null) {
                clearInterval(fpsIntervalRef.current);
                fpsIntervalRef.current = null;
            }
        };
    }, [tickCallback]);

    return (
        <>
            <x.Slot for="GtkWindow" id="titlebar">
                <GtkHeaderBar>
                    <x.ContainerSlot for={GtkHeaderBar} id="packEnd">
                        <GtkLabel label={`${fps.toFixed(2)} fps`} />
                    </x.ContainerSlot>
                </GtkHeaderBar>
            </x.Slot>
            <GtkBox>
                <GtkDrawingArea ref={drawingRef} onDraw={draw} hexpand vexpand />
            </GtkBox>
        </>
    );
};

export const framesDemo: Demo = {
    id: "frames",
    title: "Benchmark/Frames",
    description:
        "This demo is intentionally as simple as possible, to see what framerate the windowing system can deliver on its own. It does nothing but change the drawn color, for every frame.",
    keywords: ["benchmark", "frames", "fps", "performance", "GdkFrameClock"],
    component: FramesDemo,
    sourceCode,
};
