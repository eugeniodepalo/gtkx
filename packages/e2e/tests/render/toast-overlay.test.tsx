import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { AdwToastOverlay, GtkLabel, Toast } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - ToastOverlay", () => {
    describe("AdwToastOverlay", () => {
        it("creates ToastOverlay widget", async () => {
            const ref = createRef<Adw.ToastOverlay>();

            await render(<AdwToastOverlay ref={ref} />, { wrapper: false });

            expect(ref.current).not.toBeNull();
        });

        it("sets child widget", async () => {
            const overlayRef = createRef<Adw.ToastOverlay>();
            const labelRef = createRef<Gtk.Label>();

            await render(
                <AdwToastOverlay ref={overlayRef}>
                    <GtkLabel ref={labelRef} label="Content" />
                </AdwToastOverlay>,
                { wrapper: false },
            );

            expect(overlayRef.current?.getChild()?.id).toEqual(labelRef.current?.id);
        });

        it("accepts Toast children alongside widget child", async () => {
            const overlayRef = createRef<Adw.ToastOverlay>();
            const labelRef = createRef<Gtk.Label>();

            await render(
                <AdwToastOverlay ref={overlayRef}>
                    <GtkLabel ref={labelRef} label="Content" />
                    <Toast title="Notification" timeout={0} />
                </AdwToastOverlay>,
                { wrapper: false },
            );

            expect(overlayRef.current?.getChild()?.id).toEqual(labelRef.current?.id);
        });

        it("removes widget child", async () => {
            const overlayRef = createRef<Adw.ToastOverlay>();

            function App({ showChild }: { showChild: boolean }) {
                return <AdwToastOverlay ref={overlayRef}>{showChild && <GtkLabel label="Content" />}</AdwToastOverlay>;
            }

            await render(<App showChild={true} />, { wrapper: false });
            expect(overlayRef.current?.getChild()).not.toBeNull();

            await render(<App showChild={false} />, { wrapper: false });
            expect(overlayRef.current?.getChild()).toBeNull();
        });

        it("removes Toast children", async () => {
            const overlayRef = createRef<Adw.ToastOverlay>();

            function App({ showToast }: { showToast: boolean }) {
                return (
                    <AdwToastOverlay ref={overlayRef}>
                        <GtkLabel label="Content" />
                        {showToast && <Toast title="Notification" timeout={0} />}
                    </AdwToastOverlay>
                );
            }

            await render(<App showToast={true} />, { wrapper: false });
            await render(<App showToast={false} />, { wrapper: false });

            expect(overlayRef.current).not.toBeNull();
        });
    });
});
