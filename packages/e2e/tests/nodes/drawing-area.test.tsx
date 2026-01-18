import type * as cairo from "@gtkx/ffi/cairo";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkDrawingArea } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

type DrawFunc = (self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => void;

const noopDraw: DrawFunc = () => {};

describe("render - DrawingArea", () => {
    describe("DrawingAreaNode", () => {
        it("creates DrawingArea widget", async () => {
            const ref = createRef<Gtk.DrawingArea>();

            await render(<GtkDrawingArea ref={ref} />);

            expect(ref.current).not.toBeNull();
            expect(ref.current).toBeInstanceOf(Gtk.DrawingArea);
        });

        it("creates DrawingArea without onDraw callback", async () => {
            const ref = createRef<Gtk.DrawingArea>();

            await render(<GtkDrawingArea ref={ref} />);

            expect(ref.current).not.toBeNull();
        });

        it("creates DrawingArea with onDraw callback", async () => {
            const ref = createRef<Gtk.DrawingArea>();

            await render(<GtkDrawingArea ref={ref} onDraw={noopDraw} />);

            expect(ref.current).not.toBeNull();
        });

        it("sets content size", async () => {
            const ref = createRef<Gtk.DrawingArea>();

            await render(<GtkDrawingArea ref={ref} contentWidth={200} contentHeight={100} />);

            expect(ref.current?.getContentWidth()).toBe(200);
            expect(ref.current?.getContentHeight()).toBe(100);
        });

        it("updates content size when props change", async () => {
            const ref = createRef<Gtk.DrawingArea>();

            function App({ width, height }: { width: number; height: number }) {
                return <GtkDrawingArea ref={ref} contentWidth={width} contentHeight={height} />;
            }

            await render(<App width={100} height={50} />);
            expect(ref.current?.getContentWidth()).toBe(100);
            expect(ref.current?.getContentHeight()).toBe(50);

            await render(<App width={200} height={100} />);
            expect(ref.current?.getContentWidth()).toBe(200);
            expect(ref.current?.getContentHeight()).toBe(100);
        });

        it("updates onDraw callback when prop changes", async () => {
            const ref = createRef<Gtk.DrawingArea>();
            const onDraw1: DrawFunc = () => {};
            const onDraw2: DrawFunc = () => {};

            function App({ onDraw }: { onDraw: DrawFunc }) {
                return <GtkDrawingArea ref={ref} onDraw={onDraw} />;
            }

            await render(<App onDraw={onDraw1} />);
            expect(ref.current).not.toBeNull();

            await render(<App onDraw={onDraw2} />);
            expect(ref.current).not.toBeNull();
        });

        it("sets widget properties alongside onDraw", async () => {
            const ref = createRef<Gtk.DrawingArea>();

            await render(
                <GtkDrawingArea
                    ref={ref}
                    onDraw={noopDraw}
                    contentWidth={300}
                    contentHeight={200}
                    visible={true}
                    sensitive={true}
                />,
            );

            expect(ref.current).not.toBeNull();
            expect(ref.current?.getContentWidth()).toBe(300);
            expect(ref.current?.getContentHeight()).toBe(200);
            expect(ref.current?.getVisible()).toBe(true);
            expect(ref.current?.getSensitive()).toBe(true);
        });
    });
});
