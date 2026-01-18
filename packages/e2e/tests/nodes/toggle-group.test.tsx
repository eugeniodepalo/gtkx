import type * as Adw from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";
import { AdwToggleGroup, x } from "@gtkx/react";
import { render, screen, userEvent, waitFor } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - ToggleGroup", () => {
    describe("ToggleGroupNode", () => {
        it("creates ToggleGroup widget without toggles", async () => {
            const ref = createRef<Adw.ToggleGroup>();

            await render(<AdwToggleGroup ref={ref} />);

            expect(ref.current).not.toBeNull();
            expect(ref.current?.getNToggles()).toBe(0);
        });

        it("creates ToggleGroup widget with toggles", async () => {
            await render(
                <AdwToggleGroup>
                    <x.Toggle id="list" label="List View" iconName="view-list-symbolic" />
                    <x.Toggle id="grid" label="Grid View" iconName="view-grid-symbolic" />
                </AdwToggleGroup>,
            );

            const toggles = await screen.findAllByRole(Gtk.AccessibleRole.RADIO);
            expect(toggles).toHaveLength(2);
        });

        it("sets toggle label", async () => {
            await render(
                <AdwToggleGroup>
                    <x.Toggle id="test" label="Test Label" />
                </AdwToggleGroup>,
            );

            const toggle = await screen.findByRole(Gtk.AccessibleRole.RADIO, { name: "Test Label" });
            expect(toggle).toBeDefined();
        });

        it("sets toggle enabled state", async () => {
            const ref = createRef<Adw.ToggleGroup>();

            await render(
                <AdwToggleGroup ref={ref}>
                    <x.Toggle id="enabled" label="Enabled" />
                    <x.Toggle id="disabled" label="Disabled" enabled={false} />
                </AdwToggleGroup>,
            );

            expect(ref.current?.getToggleByName("enabled")?.getEnabled()).toBe(true);
            expect(ref.current?.getToggleByName("disabled")?.getEnabled()).toBe(false);
        });

        it("updates toggle props", async () => {
            const ref = createRef<Adw.ToggleGroup>();

            function App({ label }: { label: string }) {
                return (
                    <AdwToggleGroup ref={ref}>
                        <x.Toggle id="test" label={label} />
                    </AdwToggleGroup>
                );
            }

            await render(<App label="Initial" />);
            expect(ref.current?.getToggleByName("test")?.getLabel()).toBe("Initial");

            await render(<App label="Updated" />);
            expect(ref.current?.getToggleByName("test")?.getLabel()).toBe("Updated");
        });

        it("removes toggles when unmounted", async () => {
            const ref = createRef<Adw.ToggleGroup>();

            function App({ showExtra }: { showExtra: boolean }) {
                return (
                    <AdwToggleGroup ref={ref}>
                        <x.Toggle id="always" label="Always" />
                        {showExtra && <x.Toggle id="extra" label="Extra" />}
                    </AdwToggleGroup>
                );
            }

            await render(<App showExtra={true} />);
            expect(ref.current?.getNToggles()).toBe(2);
            expect(ref.current?.getToggleByName("always")).not.toBeNull();
            expect(ref.current?.getToggleByName("extra")).not.toBeNull();

            await render(<App showExtra={false} />);
            expect(ref.current?.getNToggles()).toBe(1);
            expect(ref.current?.getToggleByName("always")).not.toBeNull();
            expect(ref.current?.getToggleByName("extra")).toBeNull();
        });

        it("handles inserting toggles dynamically", async () => {
            const ref = createRef<Adw.ToggleGroup>();

            function App({ showMid }: { showMid: boolean }) {
                return (
                    <AdwToggleGroup ref={ref}>
                        <x.Toggle id="first" label="First" />
                        {showMid && <x.Toggle id="middle" label="Middle" />}
                        <x.Toggle id="last" label="Last" />
                    </AdwToggleGroup>
                );
            }

            await render(<App showMid={false} />);
            expect(ref.current?.getNToggles()).toBe(2);

            await render(<App showMid={true} />);
            expect(ref.current?.getNToggles()).toBe(3);
            expect(ref.current?.getToggleByName("middle")).not.toBeNull();
        });
    });

    describe("user interactions", () => {
        it("clicks toggle to activate it", async () => {
            const ref = createRef<Adw.ToggleGroup>();

            await render(
                <AdwToggleGroup ref={ref}>
                    <x.Toggle id="list" label="List" />
                    <x.Toggle id="grid" label="Grid" />
                </AdwToggleGroup>,
            );

            const listToggle = await screen.findByRole(Gtk.AccessibleRole.RADIO, { name: "List" });
            await userEvent.click(listToggle);

            await waitFor(() => {
                expect(ref.current?.getActive()).toBe(0);
            });
        });

        it("switches between toggles", async () => {
            const ref = createRef<Adw.ToggleGroup>();

            await render(
                <AdwToggleGroup ref={ref}>
                    <x.Toggle id="list" label="List" />
                    <x.Toggle id="grid" label="Grid" />
                </AdwToggleGroup>,
            );

            const gridToggle = await screen.findByRole(Gtk.AccessibleRole.RADIO, { name: "Grid" });

            await userEvent.click(gridToggle);

            await waitFor(() => {
                expect(ref.current?.getActive()).toBe(1);
            });
        });

        it("finds all toggles by role in a toggle group", async () => {
            await render(
                <AdwToggleGroup>
                    <x.Toggle id="list" label="List View" />
                    <x.Toggle id="grid" label="Grid View" />
                    <x.Toggle id="tiles" label="Tiles View" />
                </AdwToggleGroup>,
            );

            const toggles = await screen.findAllByRole(Gtk.AccessibleRole.RADIO);
            expect(toggles).toHaveLength(3);

            const listToggle = await screen.findByRole(Gtk.AccessibleRole.RADIO, { name: "List View" });
            expect(listToggle).toBeDefined();
        });
    });
});
