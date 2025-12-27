import type * as Adw from "@gtkx/ffi/adw";
import { ActionRow, AdwActionRow, GtkLabel } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - ActionRowChild", () => {
    describe("ActionRowChild (ActionRow.Prefix/ActionRow.Suffix)", () => {
        it("adds child as prefix via ActionRow.Prefix", async () => {
            const rowRef = createRef<Adw.ActionRow>();

            const { findByText } = await render(
                <AdwActionRow ref={rowRef} title="Test Row">
                    <ActionRow.Prefix>
                        <GtkLabel label="Prefix" />
                    </ActionRow.Prefix>
                </AdwActionRow>,
            );

            expect(await findByText("Prefix")).toBeDefined();
        });

        it("adds child as suffix via ActionRow.Suffix", async () => {
            const rowRef = createRef<Adw.ActionRow>();

            const { findByText } = await render(
                <AdwActionRow ref={rowRef} title="Test Row">
                    <ActionRow.Suffix>
                        <GtkLabel label="Suffix" />
                    </ActionRow.Suffix>
                </AdwActionRow>,
            );

            expect(await findByText("Suffix")).toBeDefined();
        });

        it("combines ActionRow.Prefix and ActionRow.Suffix", async () => {
            const rowRef = createRef<Adw.ActionRow>();

            const { findByText } = await render(
                <AdwActionRow ref={rowRef} title="Test Row">
                    <ActionRow.Prefix>
                        <GtkLabel label="Prefix" />
                    </ActionRow.Prefix>
                    <ActionRow.Suffix>
                        <GtkLabel label="Suffix" />
                    </ActionRow.Suffix>
                </AdwActionRow>,
            );

            expect(await findByText("Prefix")).toBeDefined();
            expect(await findByText("Suffix")).toBeDefined();
        });

        it("removes prefix child", async () => {
            const rowRef = createRef<Adw.ActionRow>();

            function App({ showPrefix }: { showPrefix: boolean }) {
                return (
                    <AdwActionRow ref={rowRef} title="Test Row">
                        {showPrefix && (
                            <ActionRow.Prefix>
                                <GtkLabel label="Prefix" />
                            </ActionRow.Prefix>
                        )}
                        <ActionRow.Suffix>
                            <GtkLabel label="Always" />
                        </ActionRow.Suffix>
                    </AdwActionRow>
                );
            }

            const { findByText, rerender } = await render(<App showPrefix={true} />);

            expect(await findByText("Prefix")).toBeDefined();
            expect(await findByText("Always")).toBeDefined();

            await rerender(<App showPrefix={false} />);

            await expect(findByText("Prefix")).rejects.toThrow();
            expect(await findByText("Always")).toBeDefined();
        });

        it("adds multiple children as prefix via ActionRow.Prefix", async () => {
            const rowRef = createRef<Adw.ActionRow>();

            const { findByText } = await render(
                <AdwActionRow ref={rowRef} title="Test Row">
                    <ActionRow.Prefix>
                        <GtkLabel label="First" />
                        <GtkLabel label="Second" />
                    </ActionRow.Prefix>
                </AdwActionRow>,
            );

            expect(await findByText("First")).toBeDefined();
            expect(await findByText("Second")).toBeDefined();
        });

        it("adds multiple children as suffix via ActionRow.Suffix", async () => {
            const rowRef = createRef<Adw.ActionRow>();

            const { findByText } = await render(
                <AdwActionRow ref={rowRef} title="Test Row">
                    <ActionRow.Suffix>
                        <GtkLabel label="First" />
                        <GtkLabel label="Second" />
                    </ActionRow.Suffix>
                </AdwActionRow>,
            );

            expect(await findByText("First")).toBeDefined();
            expect(await findByText("Second")).toBeDefined();
        });

        it("removes individual children from ActionRow.Prefix", async () => {
            const rowRef = createRef<Adw.ActionRow>();

            function App({ showSecond }: { showSecond: boolean }) {
                return (
                    <AdwActionRow ref={rowRef} title="Test Row">
                        <ActionRow.Prefix>
                            <GtkLabel label="First" />
                            {showSecond && <GtkLabel label="Second" />}
                        </ActionRow.Prefix>
                    </AdwActionRow>
                );
            }

            const { findByText, rerender } = await render(<App showSecond={true} />);

            expect(await findByText("First")).toBeDefined();
            expect(await findByText("Second")).toBeDefined();

            await rerender(<App showSecond={false} />);

            expect(await findByText("First")).toBeDefined();
            await expect(findByText("Second")).rejects.toThrow();
        });
    });
});
