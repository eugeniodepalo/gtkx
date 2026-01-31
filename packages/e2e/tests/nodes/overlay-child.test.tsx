import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkButton, GtkLabel, GtkOverlay, x } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - OverlayChild", () => {
    describe("OverlayChildNode", () => {
        it("adds child as overlay", async () => {
            const overlayRef = createRef<Gtk.Overlay>();
            const mainRef = createRef<Gtk.Label>();
            const overlayChildRef = createRef<Gtk.Button>();

            await render(
                <GtkOverlay ref={overlayRef}>
                    <GtkLabel ref={mainRef} label="Main Content" />
                    <x.OverlayChild>
                        <GtkButton ref={overlayChildRef} label="Overlay Button" />
                    </x.OverlayChild>
                </GtkOverlay>,
            );

            const child = overlayRef.current?.getChild();
            const parent = overlayChildRef.current?.getParent();
            expect(child && mainRef.current && child === mainRef.current).toBe(true);
            expect(parent && overlayRef.current && parent === overlayRef.current).toBe(true);
        });

        it("sets measure property", async () => {
            const overlayRef = createRef<Gtk.Overlay>();
            const buttonRef = createRef<Gtk.Button>();

            await render(
                <GtkOverlay ref={overlayRef}>
                    Main
                    <x.OverlayChild measure={true}>
                        <GtkButton ref={buttonRef} label="Measured Overlay" />
                    </x.OverlayChild>
                </GtkOverlay>,
            );

            const isMeasured = overlayRef.current?.getMeasureOverlay(buttonRef.current as Gtk.Widget);
            expect(isMeasured).toBe(true);
        });

        it("sets clipOverlay property", async () => {
            const overlayRef = createRef<Gtk.Overlay>();
            const buttonRef = createRef<Gtk.Button>();

            await render(
                <GtkOverlay ref={overlayRef}>
                    Main
                    <x.OverlayChild clipOverlay={true}>
                        <GtkButton ref={buttonRef} label="Clipped Overlay" />
                    </x.OverlayChild>
                </GtkOverlay>,
            );

            const isClipped = overlayRef.current?.getClipOverlay(buttonRef.current as Gtk.Widget);
            expect(isClipped).toBe(true);
        });

        it("removes overlay child", async () => {
            const overlayRef = createRef<Gtk.Overlay>();

            function App({ showOverlay }: { showOverlay: boolean }) {
                return (
                    <GtkOverlay ref={overlayRef}>
                        Main
                        {showOverlay && (
                            <x.OverlayChild>
                                <GtkButton label="Removable Overlay" />
                            </x.OverlayChild>
                        )}
                    </GtkOverlay>
                );
            }

            await render(<App showOverlay={true} />);

            let childCount = 0;
            let child = overlayRef.current?.getFirstChild();
            while (child) {
                childCount++;
                child = child.getNextSibling();
            }
            expect(childCount).toBe(2);

            await render(<App showOverlay={false} />);

            childCount = 0;
            child = overlayRef.current?.getFirstChild();
            while (child) {
                childCount++;
                child = child.getNextSibling();
            }
            expect(childCount).toBe(1);
        });

        it("adds multiple overlay children with separate wrappers", async () => {
            const overlayRef = createRef<Gtk.Overlay>();

            await render(
                <GtkOverlay ref={overlayRef}>
                    Main
                    <x.OverlayChild>
                        <GtkButton label="First Overlay" />
                    </x.OverlayChild>
                    <x.OverlayChild>
                        <GtkButton label="Second Overlay" />
                    </x.OverlayChild>
                </GtkOverlay>,
            );

            let childCount = 0;
            let child = overlayRef.current?.getFirstChild();
            while (child) {
                childCount++;
                child = child.getNextSibling();
            }
            expect(childCount).toBe(3);
        });

        it("adds multiple children in single wrapper", async () => {
            const overlayRef = createRef<Gtk.Overlay>();
            const firstRef = createRef<Gtk.Button>();
            const secondRef = createRef<Gtk.Button>();

            await render(
                <GtkOverlay ref={overlayRef}>
                    Main
                    <x.OverlayChild>
                        <GtkButton ref={firstRef} label="First Overlay" />
                        <GtkButton ref={secondRef} label="Second Overlay" />
                    </x.OverlayChild>
                </GtkOverlay>,
            );

            let childCount = 0;
            let child = overlayRef.current?.getFirstChild();
            while (child) {
                childCount++;
                child = child.getNextSibling();
            }
            expect(childCount).toBe(3);

            const firstParent = firstRef.current?.getParent();
            const secondParent = secondRef.current?.getParent();
            expect(firstParent && overlayRef.current && firstParent === overlayRef.current).toBe(true);
            expect(secondParent && overlayRef.current && secondParent === overlayRef.current).toBe(true);
        });

        it("applies props to all children in wrapper", async () => {
            const overlayRef = createRef<Gtk.Overlay>();
            const firstRef = createRef<Gtk.Button>();
            const secondRef = createRef<Gtk.Button>();

            await render(
                <GtkOverlay ref={overlayRef}>
                    Main
                    <x.OverlayChild measure={true}>
                        <GtkButton ref={firstRef} label="First" />
                        <GtkButton ref={secondRef} label="Second" />
                    </x.OverlayChild>
                </GtkOverlay>,
            );

            const firstMeasured = overlayRef.current?.getMeasureOverlay(firstRef.current as Gtk.Widget);
            const secondMeasured = overlayRef.current?.getMeasureOverlay(secondRef.current as Gtk.Widget);
            expect(firstMeasured).toBe(true);
            expect(secondMeasured).toBe(true);
        });
    });
});
