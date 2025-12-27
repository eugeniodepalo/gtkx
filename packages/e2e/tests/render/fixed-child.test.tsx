import { createRef as createNativeRef } from "@gtkx/ffi";
import type * as Gtk from "@gtkx/ffi/gtk";
import { FixedChild, GtkFixed, GtkLabel } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - FixedChild", () => {
    describe("FixedChildNode", () => {
        it("positions child at specified x/y coordinates", async () => {
            const fixedRef = createRef<Gtk.Fixed>();
            const labelRef = createRef<Gtk.Label>();

            await render(
                <GtkFixed ref={fixedRef}>
                    <FixedChild x={100} y={50}>
                        <GtkLabel ref={labelRef} label="Positioned" />
                    </FixedChild>
                </GtkFixed>,
                { wrapper: false },
            );

            const xRef = createNativeRef(0);
            const yRef = createNativeRef(0);
            const label = labelRef.current;
            if (label) {
                fixedRef.current?.getChildPosition(label, xRef, yRef);
            }

            expect(xRef.value).toBe(100);
            expect(yRef.value).toBe(50);
        });

        it("positions child at default (0,0) when no position specified", async () => {
            const fixedRef = createRef<Gtk.Fixed>();
            const labelRef = createRef<Gtk.Label>();

            await render(
                <GtkFixed ref={fixedRef}>
                    <FixedChild>
                        <GtkLabel ref={labelRef} label="Default" />
                    </FixedChild>
                </GtkFixed>,
                { wrapper: false },
            );

            const xRef = createNativeRef(0);
            const yRef = createNativeRef(0);
            const label = labelRef.current;
            if (label) {
                fixedRef.current?.getChildPosition(label, xRef, yRef);
            }

            expect(xRef.value).toBe(0);
            expect(yRef.value).toBe(0);
        });

        it("updates position on prop change", async () => {
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

            await render(<App x={0} y={0} />);

            const xRef1 = createNativeRef(0);
            const yRef1 = createNativeRef(0);
            const label1 = labelRef.current;
            if (label1) {
                fixedRef.current?.getChildPosition(label1, xRef1, yRef1);
            }
            expect(xRef1.value).toBe(0);
            expect(yRef1.value).toBe(0);

            await render(<App x={200} y={150} />);

            const xRef2 = createNativeRef(0);
            const yRef2 = createNativeRef(0);
            const label2 = labelRef.current;
            if (label2) {
                fixedRef.current?.getChildPosition(label2, xRef2, yRef2);
            }
            expect(xRef2.value).toBe(200);
            expect(yRef2.value).toBe(150);
        });

        it("places multiple children in fixed", async () => {
            const fixedRef = createRef<Gtk.Fixed>();
            const label1Ref = createRef<Gtk.Label>();
            const label2Ref = createRef<Gtk.Label>();

            await render(
                <GtkFixed ref={fixedRef}>
                    <FixedChild x={10} y={20}>
                        <GtkLabel ref={label1Ref} label="First" />
                    </FixedChild>
                    <FixedChild x={100} y={80}>
                        <GtkLabel ref={label2Ref} label="Second" />
                    </FixedChild>
                </GtkFixed>,
                { wrapper: false },
            );

            const x1Ref = createNativeRef(0);
            const y1Ref = createNativeRef(0);
            const firstLabel = label1Ref.current;
            if (firstLabel) {
                fixedRef.current?.getChildPosition(firstLabel, x1Ref, y1Ref);
            }
            expect(x1Ref.value).toBe(10);
            expect(y1Ref.value).toBe(20);

            const x2Ref = createNativeRef(0);
            const y2Ref = createNativeRef(0);
            const secondLabel = label2Ref.current;
            if (secondLabel) {
                fixedRef.current?.getChildPosition(secondLabel, x2Ref, y2Ref);
            }
            expect(x2Ref.value).toBe(100);
            expect(y2Ref.value).toBe(80);
        });

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

            await render(<App showChild={true} />);
            expect(fixedRef.current?.getFirstChild()).not.toBeNull();

            await render(<App showChild={false} />);
            expect(fixedRef.current?.getFirstChild()).toBeNull();
        });
    });
});
