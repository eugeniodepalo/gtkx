import { createRef as createNativeRef } from "@gtkx/ffi";
import type * as Gtk from "@gtkx/ffi/gtk";
import { FixedChild, GtkFixed, GtkLabel } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

/**
 * Helper to get child position from transform.
 * Note: getChildPosition only works after widget realization,
 * but getChildTransform().toTranslate() works immediately.
 */
function getChildPosition(fixed: Gtk.Fixed, child: Gtk.Widget): { x: number; y: number } {
    const transform = fixed.getChildTransform(child);
    if (!transform) {
        return { x: 0, y: 0 };
    }
    const xRef = createNativeRef(0);
    const yRef = createNativeRef(0);
    transform.toTranslate(xRef, yRef);
    return { x: xRef.value, y: yRef.value };
}

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
            );

            if (!fixedRef.current || !labelRef.current) {
                throw new Error("Refs should be set after render");
            }
            const pos = getChildPosition(fixedRef.current, labelRef.current);

            expect(pos.x).toBe(100);
            expect(pos.y).toBe(50);
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
            );

            if (!fixedRef.current || !labelRef.current) {
                throw new Error("Refs should be set after render");
            }
            const pos = getChildPosition(fixedRef.current, labelRef.current);

            expect(pos.x).toBe(0);
            expect(pos.y).toBe(0);
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

            if (!fixedRef.current || !labelRef.current) {
                throw new Error("Refs should be set after render");
            }

            const pos1 = getChildPosition(fixedRef.current, labelRef.current);
            expect(pos1.x).toBe(0);
            expect(pos1.y).toBe(0);

            await render(<App x={200} y={150} />);

            const pos2 = getChildPosition(fixedRef.current, labelRef.current);
            expect(pos2.x).toBe(200);
            expect(pos2.y).toBe(150);
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
            );

            if (!fixedRef.current || !label1Ref.current || !label2Ref.current) {
                throw new Error("Refs should be set after render");
            }

            const pos1 = getChildPosition(fixedRef.current, label1Ref.current);
            expect(pos1.x).toBe(10);
            expect(pos1.y).toBe(20);

            const pos2 = getChildPosition(fixedRef.current, label2Ref.current);
            expect(pos2.x).toBe(100);
            expect(pos2.y).toBe(80);
        });

        it("removes child from fixed", async () => {
            const fixedRef = createRef<Gtk.Fixed>();
            const labelRef = createRef<Gtk.Label>();

            function App({ showChild }: { showChild: boolean }) {
                return (
                    <GtkFixed ref={fixedRef}>
                        {showChild && (
                            <FixedChild x={0} y={0}>
                                <GtkLabel ref={labelRef} label="Removable" />
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
