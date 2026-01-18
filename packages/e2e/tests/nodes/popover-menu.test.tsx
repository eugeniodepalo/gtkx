import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkMenuButton, GtkPopoverMenu, x } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

describe("render - PopoverMenu", () => {
    describe("PopoverMenuNode", () => {
        it("creates PopoverMenu widget", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(<GtkPopoverMenu ref={ref} />);

            expect(ref.current).not.toBeNull();
        });

        it("sets menu model", async () => {
            const popoverRef = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={popoverRef}>
                    <x.MenuItem id="item1" label="Item 1" onActivate={() => {}} />
                    <x.MenuItem id="item2" label="Item 2" onActivate={() => {}} />
                </GtkPopoverMenu>,
            );

            expect(popoverRef.current?.getMenuModel()?.getNItems()).toBeGreaterThan(0);
        });

        it("handles MenuButton parent", async () => {
            const buttonRef = createRef<Gtk.MenuButton>();

            await render(
                <GtkMenuButton ref={buttonRef}>
                    <x.MenuItem id="opt1" label="Option 1" onActivate={() => {}} />
                    <x.MenuItem id="opt2" label="Option 2" onActivate={() => {}} />
                </GtkMenuButton>,
            );

            expect(buttonRef.current?.getMenuModel()?.getNItems()).toBeGreaterThan(0);
        });

        it("adds menu items", async () => {
            const popoverRef = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={popoverRef}>
                    <x.MenuItem id="first" label="First" onActivate={() => {}} />
                    <x.MenuItem id="second" label="Second" onActivate={() => {}} />
                    <x.MenuItem id="third" label="Third" onActivate={() => {}} />
                </GtkPopoverMenu>,
            );

            expect(popoverRef.current?.getMenuModel()?.getNItems()).toBe(3);
        });

        it("handles menu item with action", async () => {
            const popoverRef = createRef<Gtk.PopoverMenu>();
            const onActivate = vi.fn();

            await render(
                <GtkPopoverMenu ref={popoverRef}>
                    <x.MenuItem id="click" label="Click Me" onActivate={onActivate} />
                </GtkPopoverMenu>,
            );

            expect(popoverRef.current?.getMenuModel()?.getNItems()).toBe(1);
        });

        it("removes menu items", async () => {
            const popoverRef = createRef<Gtk.PopoverMenu>();

            function App({ items }: { items: string[] }) {
                return (
                    <GtkPopoverMenu ref={popoverRef}>
                        {items.map((label) => (
                            <x.MenuItem key={label} id={label} label={label} onActivate={() => {}} />
                        ))}
                    </GtkPopoverMenu>
                );
            }

            await render(<App items={["A", "B", "C"]} />);
            expect(popoverRef.current?.getMenuModel()?.getNItems()).toBe(3);

            await render(<App items={["A"]} />);
            expect(popoverRef.current?.getMenuModel()?.getNItems()).toBe(1);
        });

        it("handles menu sections", async () => {
            const popoverRef = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={popoverRef}>
                    <x.MenuSection>
                        <x.MenuItem id="s1item" label="Section 1 Item" onActivate={() => {}} />
                    </x.MenuSection>
                    <x.MenuSection>
                        <x.MenuItem id="s2item" label="Section 2 Item" onActivate={() => {}} />
                    </x.MenuSection>
                </GtkPopoverMenu>,
            );

            expect(popoverRef.current?.getMenuModel()).not.toBeNull();
        });
    });
});
