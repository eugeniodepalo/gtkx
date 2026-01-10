import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { AdwActionRow, GtkLabel, GtkListBox, x } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - ActionRowChild", () => {
    describe("ActionRowChild (ActionRow.Prefix/ActionRow.Suffix)", () => {
        it("adds child as prefix via ActionRow.Prefix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const prefixRef = createRef<Gtk.Label>();

            await render(
                <GtkListBox>
                    <AdwActionRow ref={rowRef} title="Test Row">
                        <x.ActionRowPrefix>
                            <GtkLabel ref={prefixRef} label="Prefix" />
                        </x.ActionRowPrefix>
                    </AdwActionRow>
                </GtkListBox>,
            );

            expect(prefixRef.current).not.toBeNull();
        });

        it("adds child as suffix via ActionRow.Suffix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const suffixRef = createRef<Gtk.Label>();

            await render(
                <GtkListBox>
                    <AdwActionRow ref={rowRef} title="Test Row">
                        <x.ActionRowSuffix>
                            <GtkLabel ref={suffixRef} label="Suffix" />
                        </x.ActionRowSuffix>
                    </AdwActionRow>
                </GtkListBox>,
            );

            expect(suffixRef.current).not.toBeNull();
        });

        it("combines ActionRow.Prefix and ActionRow.Suffix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const prefixRef = createRef<Gtk.Label>();
            const suffixRef = createRef<Gtk.Label>();

            await render(
                <GtkListBox>
                    <AdwActionRow ref={rowRef} title="Test Row">
                        <x.ActionRowPrefix>
                            <GtkLabel ref={prefixRef} label="Prefix" />
                        </x.ActionRowPrefix>
                        <x.ActionRowSuffix>
                            <GtkLabel ref={suffixRef} label="Suffix" />
                        </x.ActionRowSuffix>
                    </AdwActionRow>
                </GtkListBox>,
            );

            expect(prefixRef.current).not.toBeNull();
            expect(suffixRef.current).not.toBeNull();
        });

        it("removes prefix child", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const prefixRef = createRef<Gtk.Label>();
            const alwaysRef = createRef<Gtk.Label>();

            function App({ showPrefix }: { showPrefix: boolean }) {
                return (
                    <GtkListBox>
                        <AdwActionRow ref={rowRef} title="Test Row">
                            {showPrefix && (
                                <x.ActionRowPrefix>
                                    <GtkLabel ref={prefixRef} label="Prefix" />
                                </x.ActionRowPrefix>
                            )}
                            <x.ActionRowSuffix>
                                <GtkLabel ref={alwaysRef} label="Always" />
                            </x.ActionRowSuffix>
                        </AdwActionRow>
                    </GtkListBox>
                );
            }

            const { rerender } = await render(<App showPrefix={true} />);

            expect(prefixRef.current).not.toBeNull();
            expect(alwaysRef.current).not.toBeNull();

            await rerender(<App showPrefix={false} />);

            expect(prefixRef.current).toBeNull();
            expect(alwaysRef.current).not.toBeNull();
        });

        it("adds multiple children as prefix via ActionRow.Prefix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const firstRef = createRef<Gtk.Label>();
            const secondRef = createRef<Gtk.Label>();

            await render(
                <GtkListBox>
                    <AdwActionRow ref={rowRef} title="Test Row">
                        <x.ActionRowPrefix>
                            <GtkLabel ref={firstRef} label="First" />
                            <GtkLabel ref={secondRef} label="Second" />
                        </x.ActionRowPrefix>
                    </AdwActionRow>
                </GtkListBox>,
            );

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).not.toBeNull();
        });

        it("adds multiple children as suffix via ActionRow.Suffix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const firstRef = createRef<Gtk.Label>();
            const secondRef = createRef<Gtk.Label>();

            await render(
                <GtkListBox>
                    <AdwActionRow ref={rowRef} title="Test Row">
                        <x.ActionRowSuffix>
                            <GtkLabel ref={firstRef} label="First" />
                            <GtkLabel ref={secondRef} label="Second" />
                        </x.ActionRowSuffix>
                    </AdwActionRow>
                </GtkListBox>,
            );

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).not.toBeNull();
        });

        it("removes individual children from ActionRow.Prefix", async () => {
            const rowRef = createRef<Adw.ActionRow>();
            const firstRef = createRef<Gtk.Label>();
            const secondRef = createRef<Gtk.Label>();

            function App({ showSecond }: { showSecond: boolean }) {
                return (
                    <GtkListBox>
                        <AdwActionRow ref={rowRef} title="Test Row">
                            <x.ActionRowPrefix>
                                <GtkLabel ref={firstRef} label="First" />
                                {showSecond && <GtkLabel ref={secondRef} label="Second" />}
                            </x.ActionRowPrefix>
                        </AdwActionRow>
                    </GtkListBox>
                );
            }

            const { rerender } = await render(<App showSecond={true} />);

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).not.toBeNull();

            await rerender(<App showSecond={false} />);

            expect(firstRef.current).not.toBeNull();
            expect(secondRef.current).toBeNull();
        });
    });
});
