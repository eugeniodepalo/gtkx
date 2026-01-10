import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkHeaderBar, GtkLabel, x } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - PackChild", () => {
    describe("PackChild (Pack.Start/Pack.End)", () => {
        it("packs child at start via Pack.Start", async () => {
            const headerBarRef = createRef<Gtk.HeaderBar>();
            const startRef = createRef<Gtk.Label>();

            await render(
                <GtkHeaderBar ref={headerBarRef}>
                    <x.PackStart>
                        <GtkLabel ref={startRef} label="Start" />
                    </x.PackStart>
                </GtkHeaderBar>,
            );

            expect(startRef.current).not.toBeNull();
            expect(startRef.current?.getLabel()).toBe("Start");
        });

        it("packs child at end via Pack.End", async () => {
            const headerBarRef = createRef<Gtk.HeaderBar>();
            const endRef = createRef<Gtk.Label>();

            await render(
                <GtkHeaderBar ref={headerBarRef}>
                    <x.PackEnd>
                        <GtkLabel ref={endRef} label="End" />
                    </x.PackEnd>
                </GtkHeaderBar>,
            );

            expect(endRef.current).not.toBeNull();
            expect(endRef.current?.getLabel()).toBe("End");
        });

        it("combines Pack.Start and Pack.End", async () => {
            const headerBarRef = createRef<Gtk.HeaderBar>();
            const startRef = createRef<Gtk.Label>();
            const endRef = createRef<Gtk.Label>();

            await render(
                <GtkHeaderBar ref={headerBarRef}>
                    <x.PackStart>
                        <GtkLabel ref={startRef} label="Start" />
                    </x.PackStart>
                    <x.PackEnd>
                        <GtkLabel ref={endRef} label="End" />
                    </x.PackEnd>
                </GtkHeaderBar>,
            );

            expect(startRef.current).not.toBeNull();
            expect(endRef.current).not.toBeNull();
        });

        it("removes packed child", async () => {
            const headerBarRef = createRef<Gtk.HeaderBar>();
            const startRef = createRef<Gtk.Label>();
            const alwaysRef = createRef<Gtk.Label>();

            function App({ showStart }: { showStart: boolean }) {
                return (
                    <GtkHeaderBar ref={headerBarRef}>
                        {showStart && (
                            <x.PackStart>
                                <GtkLabel ref={startRef} label="Start" />
                            </x.PackStart>
                        )}
                        <x.Slot for={GtkHeaderBar} id="titleWidget">
                            <GtkLabel ref={alwaysRef} label="Always" />
                        </x.Slot>
                    </GtkHeaderBar>
                );
            }

            await render(<App showStart={true} />);

            expect(startRef.current).not.toBeNull();
            expect(alwaysRef.current).not.toBeNull();

            await render(<App showStart={false} />);

            expect(startRef.current).toBeNull();
            expect(alwaysRef.current).not.toBeNull();
        });

        it("packs multiple children at start via Pack.Start", async () => {
            const headerBarRef = createRef<Gtk.HeaderBar>();
            const firstRef = createRef<Gtk.Label>();
            const secondRef = createRef<Gtk.Label>();

            await render(
                <GtkHeaderBar ref={headerBarRef}>
                    <x.PackStart>
                        <GtkLabel ref={firstRef} label="First" />
                        <GtkLabel ref={secondRef} label="Second" />
                    </x.PackStart>
                </GtkHeaderBar>,
            );

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).not.toBeNull();
        });

        it("packs multiple children at end via Pack.End", async () => {
            const headerBarRef = createRef<Gtk.HeaderBar>();
            const firstRef = createRef<Gtk.Label>();
            const secondRef = createRef<Gtk.Label>();

            await render(
                <GtkHeaderBar ref={headerBarRef}>
                    <x.PackEnd>
                        <GtkLabel ref={firstRef} label="First" />
                        <GtkLabel ref={secondRef} label="Second" />
                    </x.PackEnd>
                </GtkHeaderBar>,
            );

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).not.toBeNull();
        });

        it("removes individual children from Pack.Start", async () => {
            const headerBarRef = createRef<Gtk.HeaderBar>();
            const firstRef = createRef<Gtk.Label>();
            const secondRef = createRef<Gtk.Label>();

            function App({ showSecond }: { showSecond: boolean }) {
                return (
                    <GtkHeaderBar ref={headerBarRef}>
                        <x.PackStart>
                            <GtkLabel ref={firstRef} label="First" />
                            {showSecond && <GtkLabel ref={secondRef} label="Second" />}
                        </x.PackStart>
                    </GtkHeaderBar>
                );
            }

            await render(<App showSecond={true} />);

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).not.toBeNull();

            await render(<App showSecond={false} />);

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).toBeNull();
        });
    });
});
