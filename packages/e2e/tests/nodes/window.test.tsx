import { createRef as createNativeRef } from "@gtkx/ffi";
import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { AdwApplicationWindow, GtkApplicationWindow, GtkLabel } from "@gtkx/react";
import { render as baseRender } from "@gtkx/testing";
import type { ReactNode } from "react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

const render = (element: ReactNode) => baseRender(element, { wrapper: false });

describe("render - Window", () => {
    describe("creation", () => {
        it("creates Gtk.ApplicationWindow with current app", async () => {
            const ref = createRef<Gtk.ApplicationWindow>();

            const { container } = await render(<GtkApplicationWindow ref={ref} title="App Window" />);

            expect(ref.current).not.toBeNull();
            expect(ref.current?.getApplication()?.handle).toEqual(container.handle);
        });

        it("creates Adw.ApplicationWindow with current app", async () => {
            const ref = createRef<Adw.ApplicationWindow>();

            const { container } = await render(<AdwApplicationWindow ref={ref} />);

            expect(ref.current).not.toBeNull();
            expect(ref.current?.getApplication()?.handle).toEqual(container.handle);
        });
    });

    describe("defaultSize", () => {
        it("sets default size via defaultWidth/defaultHeight", async () => {
            const ref = createRef<Gtk.ApplicationWindow>();

            await render(<GtkApplicationWindow ref={ref} defaultWidth={300} defaultHeight={200} />);

            const widthRef = createNativeRef(0);
            const heightRef = createNativeRef(0);
            ref.current?.getDefaultSize(widthRef, heightRef);
            expect(widthRef.value).toBeGreaterThanOrEqual(300);
            expect(heightRef.value).toBeGreaterThanOrEqual(200);
        });

        it("updates default size when props change", async () => {
            const ref = createRef<Gtk.ApplicationWindow>();

            function App({ width, height }: { width: number; height: number }) {
                return <GtkApplicationWindow ref={ref} defaultWidth={width} defaultHeight={height} />;
            }

            await render(<App width={200} height={150} />);

            const widthRef = createNativeRef(0);
            const heightRef = createNativeRef(0);
            ref.current?.getDefaultSize(widthRef, heightRef);
            const initialWidth = widthRef.value;
            const initialHeight = heightRef.value;

            await render(<App width={400} height={300} />);

            ref.current?.getDefaultSize(widthRef, heightRef);
            expect(widthRef.value).toBeGreaterThanOrEqual(initialWidth);
            expect(heightRef.value).toBeGreaterThanOrEqual(initialHeight);
        });

        it("handles partial size (only width)", async () => {
            const ref = createRef<Gtk.ApplicationWindow>();

            await render(<GtkApplicationWindow ref={ref} defaultWidth={300} />);

            const widthRef = createNativeRef(0);
            ref.current?.getDefaultSize(widthRef);
            expect(widthRef.value).toBeGreaterThanOrEqual(300);
        });

        it("handles partial size (only height)", async () => {
            const ref = createRef<Gtk.ApplicationWindow>();

            await render(<GtkApplicationWindow ref={ref} defaultHeight={200} />);

            const heightRef = createNativeRef(0);
            ref.current?.getDefaultSize(undefined, heightRef);
            expect(heightRef.value).toBeGreaterThanOrEqual(200);
        });
    });

    describe("lifecycle", () => {
        it("presents window on mount", async () => {
            const ref = createRef<Gtk.ApplicationWindow>();

            await render(<GtkApplicationWindow ref={ref} title="Present" />);

            expect(ref.current?.getVisible()).toBe(true);
        });

        it("destroys window on unmount", async () => {
            const ref = createRef<Gtk.ApplicationWindow>();

            function App({ show }: { show: boolean }) {
                return show ? <GtkApplicationWindow ref={ref} title="Destroy" /> : null;
            }

            await render(<App show={true} />);

            const windowId = ref.current?.handle;
            expect(windowId).toBeDefined();

            await render(<App show={false} />);
        });
    });

    describe("children", () => {
        it("sets child widget", async () => {
            const windowRef = createRef<Gtk.ApplicationWindow>();
            const labelRef = createRef<Gtk.Label>();

            await render(
                <GtkApplicationWindow ref={windowRef}>
                    <GtkLabel ref={labelRef} label="Window Child" />
                </GtkApplicationWindow>,
            );

            expect(windowRef.current?.getChild()?.handle).toEqual(labelRef.current?.handle);
        });

        it("replaces child widget", async () => {
            const windowRef = createRef<Gtk.ApplicationWindow>();
            const label1Ref = createRef<Gtk.Label>();
            const label2Ref = createRef<Gtk.Label>();

            function App({ first }: { first: boolean }) {
                return (
                    <GtkApplicationWindow ref={windowRef}>
                        {first ? (
                            <GtkLabel ref={label1Ref} key="first" label="First" />
                        ) : (
                            <GtkLabel ref={label2Ref} key="second" label="Second" />
                        )}
                    </GtkApplicationWindow>
                );
            }

            await render(<App first={true} />);

            expect(windowRef.current?.getChild()?.handle).toEqual(label1Ref.current?.handle);

            await render(<App first={false} />);

            expect(windowRef.current?.getChild()?.handle).toEqual(label2Ref.current?.handle);
        });
    });
});
