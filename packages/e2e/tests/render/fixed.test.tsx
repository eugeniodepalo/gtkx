import { createRef as createNativeRef } from "@gtkx/ffi";
import type * as Gtk from "@gtkx/ffi/gtk";
import { FixedChild, GtkFixed, GtkLabel } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - Fixed", () => {
    describe("GtkFixed", () => {
        it("creates Fixed widget", async () => {
            const ref = createRef<Gtk.Fixed>();

            await render(<GtkFixed ref={ref} />, { wrapper: false });

            expect(ref.current).not.toBeNull();
        });
    });

    describe("FixedChild", () => {
        it("attaches child at x, y position", async () => {
            const fixedRef = createRef<Gtk.Fixed>();
            const labelRef = createRef<Gtk.Label>();

            await render(
                <GtkFixed ref={fixedRef}>
                    <FixedChild x={50} y={75}>
                        <GtkLabel ref={labelRef} label="Positioned" />
                    </FixedChild>
                </GtkFixed>,
                { wrapper: false },
            );

            expect(labelRef.current?.getParent()?.id).toEqual(fixedRef.current?.id);
        });

        it("uses default values for missing props", async () => {
            const fixedRef = createRef<Gtk.Fixed>();
            const labelRef = createRef<Gtk.Label>();

            await render(
                <GtkFixed ref={fixedRef}>
                    <FixedChild>
                        <GtkLabel ref={labelRef} label="Default Position" />
                    </FixedChild>
                </GtkFixed>,
                { wrapper: false },
            );

            expect(labelRef.current?.getParent()?.id).toEqual(fixedRef.current?.id);

            const xRef = createNativeRef(0);
            const yRef = createNativeRef(0);
            const label = labelRef.current;
            if (label) {
                fixedRef.current?.getChildPosition(label, xRef, yRef);
            }
            expect(xRef.value).toBe(0);
            expect(yRef.value).toBe(0);
        });
    });

    describe("position updates", () => {
        it("repositions child when x/y changes", async () => {
            const fixedRef = createRef<Gtk.Fixed>();
            const labelRef = createRef<Gtk.Label>();

            function App({ x, y }: { x: number; y: number }) {
                return (
                    <GtkFixed ref={fixedRef}>
                        <FixedChild x={x} y={y}>
                            <GtkLabel ref={labelRef} label="Moving" />
                        </FixedChild>
                    </GtkFixed>
                );
            }

            await render(<App x={0} y={0} />, { wrapper: false });

            await render(<App x={150} y={200} />, { wrapper: false });

            expect(labelRef.current?.getParent()?.id).toEqual(fixedRef.current?.id);

            const xRef = createNativeRef(0);
            const yRef = createNativeRef(0);
            const label = labelRef.current;
            if (label) {
                fixedRef.current?.getChildPosition(label, xRef, yRef);
            }
            expect(xRef.value).toBe(150);
            expect(yRef.value).toBe(200);
        });
    });

    describe("removal", () => {
        it("removes child from fixed", async () => {
            const fixedRef = createRef<Gtk.Fixed>();

            function App({ showChild }: { showChild: boolean }) {
                return (
                    <GtkFixed ref={fixedRef}>
                        {showChild && (
                            <FixedChild x={0} y={0}>
                                Removable
                            </FixedChild>
                        )}
                    </GtkFixed>
                );
            }

            await render(<App showChild={true} />, { wrapper: false });

            expect(fixedRef.current?.getFirstChild()).not.toBeNull();

            await render(<App showChild={false} />, { wrapper: false });

            expect(fixedRef.current?.getFirstChild()).toBeNull();
        });
    });
});
