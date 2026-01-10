import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkCalendar, x } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - Calendar", () => {
    describe("CalendarNode", () => {
        it("creates Calendar widget without marks", async () => {
            const ref = createRef<Gtk.Calendar>();

            await render(<GtkCalendar ref={ref} />);

            expect(ref.current).not.toBeNull();
        });

        it("creates Calendar widget with marks", async () => {
            const ref = createRef<Gtk.Calendar>();

            await render(
                <GtkCalendar ref={ref}>
                    <x.CalendarMark day={15} />
                    <x.CalendarMark day={20} />
                    <x.CalendarMark day={25} />
                </GtkCalendar>,
            );

            expect(ref.current).not.toBeNull();
            expect(ref.current?.getDayIsMarked(15)).toBe(true);
            expect(ref.current?.getDayIsMarked(20)).toBe(true);
            expect(ref.current?.getDayIsMarked(25)).toBe(true);
            expect(ref.current?.getDayIsMarked(10)).toBe(false);
        });

        it("updates mark when day prop changes", async () => {
            const ref = createRef<Gtk.Calendar>();

            function App({ day }: { day: number }) {
                return (
                    <GtkCalendar ref={ref}>
                        <x.CalendarMark day={day} />
                    </GtkCalendar>
                );
            }

            await render(<App day={15} />);
            expect(ref.current?.getDayIsMarked(15)).toBe(true);
            expect(ref.current?.getDayIsMarked(20)).toBe(false);

            await render(<App day={20} />);
            expect(ref.current?.getDayIsMarked(15)).toBe(false);
            expect(ref.current?.getDayIsMarked(20)).toBe(true);
        });

        it("removes marks when unmounted", async () => {
            const ref = createRef<Gtk.Calendar>();

            function App({ showExtra }: { showExtra: boolean }) {
                return (
                    <GtkCalendar ref={ref}>
                        <x.CalendarMark day={15} />
                        {showExtra && <x.CalendarMark day={20} />}
                    </GtkCalendar>
                );
            }

            await render(<App showExtra={true} />);
            expect(ref.current?.getDayIsMarked(15)).toBe(true);
            expect(ref.current?.getDayIsMarked(20)).toBe(true);

            await render(<App showExtra={false} />);
            expect(ref.current?.getDayIsMarked(15)).toBe(true);
            expect(ref.current?.getDayIsMarked(20)).toBe(false);
        });

        it("handles inserting marks dynamically", async () => {
            const ref = createRef<Gtk.Calendar>();

            function App({ showMid }: { showMid: boolean }) {
                return (
                    <GtkCalendar ref={ref}>
                        <x.CalendarMark day={10} />
                        {showMid && <x.CalendarMark day={15} />}
                        <x.CalendarMark day={20} />
                    </GtkCalendar>
                );
            }

            await render(<App showMid={false} />);
            expect(ref.current?.getDayIsMarked(10)).toBe(true);
            expect(ref.current?.getDayIsMarked(15)).toBe(false);
            expect(ref.current?.getDayIsMarked(20)).toBe(true);

            await render(<App showMid={true} />);
            expect(ref.current?.getDayIsMarked(10)).toBe(true);
            expect(ref.current?.getDayIsMarked(15)).toBe(true);
            expect(ref.current?.getDayIsMarked(20)).toBe(true);
        });
    });
});
