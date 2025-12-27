import type * as Adw from "@gtkx/ffi/adw";
import { ActionRow, AdwActionRow, GtkLabel } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - ActionRow", () => {
    describe("ActionRowNode (AdwActionRow)", () => {
        it("creates ActionRow widget", async () => {
            const ref = createRef<Adw.ActionRow>();

            await render(<AdwActionRow ref={ref} title="Test Row" />);

            expect(ref.current).not.toBeNull();
        });

        it("appends prefix and suffix children", async () => {
            const rowRef = createRef<Adw.ActionRow>();

            const { findByText } = await render(
                <AdwActionRow ref={rowRef} title="Test Row">
                    <ActionRow.Prefix>
                        <GtkLabel label="First" />
                    </ActionRow.Prefix>
                    <ActionRow.Suffix>
                        <GtkLabel label="Second" />
                    </ActionRow.Suffix>
                </AdwActionRow>,
            );

            expect(rowRef.current).not.toBeNull();
            expect(await findByText("First")).toBeDefined();
            expect(await findByText("Second")).toBeDefined();
        });

        it("removes prefix and suffix children", async () => {
            const rowRef = createRef<Adw.ActionRow>();

            function App({ count }: { count: number }) {
                return (
                    <AdwActionRow ref={rowRef} title="Test Row">
                        {Array.from({ length: count }, (_, i) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: Test fixture with stable items
                            <ActionRow.Suffix key={`suffix-label-${i}`}>
                                <GtkLabel label={`Label ${i}`} />
                            </ActionRow.Suffix>
                        ))}
                    </AdwActionRow>
                );
            }

            const { rerender, findByText } = await render(<App count={3} />);

            expect(await findByText("Label 0")).toBeDefined();
            expect(await findByText("Label 1")).toBeDefined();
            expect(await findByText("Label 2")).toBeDefined();

            await rerender(<App count={1} />);

            expect(await findByText("Label 0")).toBeDefined();
            await expect(findByText("Label 1")).rejects.toThrow();
            await expect(findByText("Label 2")).rejects.toThrow();
        });
    });
});
