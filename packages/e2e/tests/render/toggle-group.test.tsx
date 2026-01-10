import type * as Adw from "@gtkx/ffi/adw";
import { AdwToggleGroup, x } from "@gtkx/react";
import { render } from "@gtkx/testing";
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
            const ref = createRef<Adw.ToggleGroup>();

            await render(
                <AdwToggleGroup ref={ref}>
                    <x.Toggle id="list" iconName="view-list-symbolic" />
                    <x.Toggle id="grid" iconName="view-grid-symbolic" />
                </AdwToggleGroup>,
            );

            expect(ref.current).not.toBeNull();
            expect(ref.current?.getNToggles()).toBe(2);

            const toggle1 = ref.current?.getToggleByName("list");
            expect(toggle1).not.toBeNull();
            expect(toggle1?.getIconName()).toBe("view-list-symbolic");

            const toggle2 = ref.current?.getToggleByName("grid");
            expect(toggle2).not.toBeNull();
            expect(toggle2?.getIconName()).toBe("view-grid-symbolic");
        });

        it("sets toggle label", async () => {
            const ref = createRef<Adw.ToggleGroup>();

            await render(
                <AdwToggleGroup ref={ref}>
                    <x.Toggle id="test" label="Test Label" />
                </AdwToggleGroup>,
            );

            const toggle = ref.current?.getToggleByName("test");
            expect(toggle?.getLabel()).toBe("Test Label");
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
});
