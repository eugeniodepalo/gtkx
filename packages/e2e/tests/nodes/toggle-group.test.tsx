import type * as Adw from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";
import { AdwToggleGroup } from "@gtkx/react";
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
                <AdwToggleGroup
                    toggles={[
                        { id: "list", label: "List View", iconName: "view-list-symbolic" },
                        { id: "grid", label: "Grid View", iconName: "view-grid-symbolic" },
                    ]}
                />,
            );

            const toggles = await screen.findAllByRole(Gtk.AccessibleRole.RADIO);
            expect(toggles).toHaveLength(2);
        });

        it("sets toggle label", async () => {
            await render(<AdwToggleGroup toggles={[{ id: "test", label: "Test Label" }]} />);

            const toggle = await screen.findByRole(Gtk.AccessibleRole.RADIO, { name: "Test Label" });
            expect(toggle).toBeDefined();
        });

        it("sets toggle enabled state", async () => {
            const ref = createRef<Adw.ToggleGroup>();

            await render(
                <AdwToggleGroup
                    ref={ref}
                    toggles={[
                        { id: "enabled", label: "Enabled" },
                        { id: "disabled", label: "Disabled", enabled: false },
                    ]}
                />,
            );

            expect(ref.current?.getToggleByName("enabled")?.getEnabled()).toBe(true);
            expect(ref.current?.getToggleByName("disabled")?.getEnabled()).toBe(false);
        });

        it("updates toggle props", async () => {
            const ref = createRef<Adw.ToggleGroup>();

            function App({ label }: { label: string }) {
                return <AdwToggleGroup ref={ref} toggles={[{ id: "test", label }]} />;
            }

            await render(<App label="Initial" />);
            expect(ref.current?.getToggleByName("test")?.getLabel()).toBe("Initial");

            await render(<App label="Updated" />);
            expect(ref.current?.getToggleByName("test")?.getLabel()).toBe("Updated");
        });

        it("removes toggles when list shrinks", async () => {
            const ref = createRef<Adw.ToggleGroup>();

            function App({ showExtra }: { showExtra: boolean }) {
                const toggles = [{ id: "always", label: "Always" }];
                if (showExtra) toggles.push({ id: "extra", label: "Extra" });
                return <AdwToggleGroup ref={ref} toggles={toggles} />;
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
                const toggles = [{ id: "first", label: "First" }];
                if (showMid) toggles.push({ id: "middle", label: "Middle" });
                toggles.push({ id: "last", label: "Last" });
                return <AdwToggleGroup ref={ref} toggles={toggles} />;
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
                <AdwToggleGroup
                    ref={ref}
                    toggles={[
                        { id: "list", label: "List" },
                        { id: "grid", label: "Grid" },
                    ]}
                />,
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
                <AdwToggleGroup
                    ref={ref}
                    toggles={[
                        { id: "list", label: "List" },
                        { id: "grid", label: "Grid" },
                    ]}
                />,
            );

            const gridToggle = await screen.findByRole(Gtk.AccessibleRole.RADIO, { name: "Grid" });

            await userEvent.click(gridToggle);

            await waitFor(() => {
                expect(ref.current?.getActive()).toBe(1);
            });
        });

        it("finds all toggles by role in a toggle group", async () => {
            await render(
                <AdwToggleGroup
                    toggles={[
                        { id: "list", label: "List View" },
                        { id: "grid", label: "Grid View" },
                        { id: "tiles", label: "Tiles View" },
                    ]}
                />,
            );

            const toggles = await screen.findAllByRole(Gtk.AccessibleRole.RADIO);
            expect(toggles).toHaveLength(3);

            const listToggle = await screen.findByRole(Gtk.AccessibleRole.RADIO, { name: "List View" });
            expect(listToggle).toBeDefined();
        });
    });
});
