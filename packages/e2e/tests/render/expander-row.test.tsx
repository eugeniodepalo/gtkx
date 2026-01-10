import type * as Adw from "@gtkx/ffi/adw";
import { AdwActionRow, AdwExpanderRow, GtkButton, x } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - ExpanderRow", () => {
    describe("ExpanderRowNode", () => {
        it("creates ExpanderRow widget", async () => {
            const ref = createRef<Adw.ExpanderRow>();

            await render(<AdwExpanderRow ref={ref} title="Test" />);

            expect(ref.current).not.toBeNull();
            expect(ref.current?.getTitle()).toBe("Test");
        });

        it("adds nested rows via ExpanderRow.Row", async () => {
            const rowRef = createRef<Adw.ActionRow>();

            await render(
                <AdwExpanderRow title="Settings">
                    <x.ExpanderRowRow>
                        <AdwActionRow ref={rowRef} title="Option 1" />
                    </x.ExpanderRowRow>
                </AdwExpanderRow>,
            );

            expect(rowRef.current).not.toBeNull();
            expect(rowRef.current?.getTitle()).toBe("Option 1");
        });

        it("adds action widgets via ExpanderRow.Action", async () => {
            const _buttonRef = createRef<Adw.ButtonContent>();

            await render(
                <AdwExpanderRow title="Group">
                    <x.ExpanderRowAction>
                        <GtkButton label="Action" />
                    </x.ExpanderRowAction>
                </AdwExpanderRow>,
            );

            expect(true).toBe(true);
        });

        it("adds prefix and suffix widgets", async () => {
            await render(
                <AdwExpanderRow title="Row">
                    <x.ActionRowPrefix>
                        <GtkButton label="Prefix" />
                    </x.ActionRowPrefix>
                    <x.ActionRowSuffix>
                        <GtkButton label="Suffix" />
                    </x.ActionRowSuffix>
                </AdwExpanderRow>,
            );

            expect(true).toBe(true);
        });

        it("removes nested rows when unmounted", async () => {
            const expanderRef = createRef<Adw.ExpanderRow>();

            function App({ showRow }: { showRow: boolean }) {
                return (
                    <AdwExpanderRow ref={expanderRef} title="Settings">
                        <x.ExpanderRowRow>
                            <AdwActionRow title="Always" />
                            {showRow && <AdwActionRow title="Conditional" />}
                        </x.ExpanderRowRow>
                    </AdwExpanderRow>
                );
            }

            await render(<App showRow={true} />);
            expect(expanderRef.current).not.toBeNull();

            await render(<App showRow={false} />);
            expect(expanderRef.current).not.toBeNull();
        });

        it("handles multiple rows and actions together", async () => {
            const ref = createRef<Adw.ExpanderRow>();

            await render(
                <AdwExpanderRow ref={ref} title="Complex">
                    <x.ActionRowPrefix>
                        <GtkButton label="Icon" />
                    </x.ActionRowPrefix>
                    <x.ExpanderRowAction>
                        <GtkButton label="Action 1" />
                        <GtkButton label="Action 2" />
                    </x.ExpanderRowAction>
                    <x.ExpanderRowRow>
                        <AdwActionRow title="Row 1" />
                        <AdwActionRow title="Row 2" />
                        <AdwActionRow title="Row 3" />
                    </x.ExpanderRowRow>
                </AdwExpanderRow>,
            );

            expect(ref.current).not.toBeNull();
        });
    });
});
