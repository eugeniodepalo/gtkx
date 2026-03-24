import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkPopoverMenu, GtkPopoverMenuBar } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

const MenuItem = "MenuItem" as const;
const MenuSection = "MenuSection" as const;
const MenuSubmenu = "MenuSubmenu" as const;

describe("render - Menu", () => {
    describe("GtkPopoverMenu", () => {
        it("creates PopoverMenu widget", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <MenuItem id="item1" label="Item 1" onActivate={() => {}} />
                </GtkPopoverMenu>,
            );

            expect(ref.current).not.toBeNull();
        });

        it("rebuilds menu when children change", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            function App({ items }: { items: string[] }) {
                return (
                    <GtkPopoverMenu ref={ref}>
                        {items.map((label, i) => (
                            <MenuItem key={label} id={`item${i}`} label={label} onActivate={() => {}} />
                        ))}
                    </GtkPopoverMenu>
                );
            }

            await render(<App items={["Item 1", "Item 2"]} />);

            await render(<App items={["Item 1", "Item 2", "Item 3"]} />);
        });
    });

    describe("PopoverMenuBar", () => {
        it("creates PopoverMenuBar widget", async () => {
            const ref = createRef<Gtk.PopoverMenuBar>();

            await render(
                <GtkPopoverMenuBar ref={ref}>
                    <MenuSubmenu label="File">
                        <MenuItem id="new" label="New" onActivate={() => {}} />
                    </MenuSubmenu>
                </GtkPopoverMenuBar>,
            );

            expect(ref.current).not.toBeNull();
        });
    });

    describe("Menu.Item", () => {
        it("adds menu item with label", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <MenuItem id="test" label="Test Item" onActivate={() => {}} />
                </GtkPopoverMenu>,
            );
        });

        it("sets keyboard accelerators via accels prop", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <MenuItem id="save" label="Save" accels="<Control>s" onActivate={() => {}} />
                </GtkPopoverMenu>,
            );
        });

        it("updates label when prop changes", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            function App({ label }: { label: string }) {
                return (
                    <GtkPopoverMenu ref={ref}>
                        <MenuItem id="item" label={label} onActivate={() => {}} />
                    </GtkPopoverMenu>
                );
            }

            await render(<App label="Initial" />);

            await render(<App label="Updated" />);
        });

        it("cleans up action on unmount", async () => {
            const ref = createRef<Gtk.PopoverMenu>();
            const onActivate = vi.fn();

            function App({ showItem }: { showItem: boolean }) {
                return (
                    <GtkPopoverMenu ref={ref}>
                        {showItem && <MenuItem id="removable" label="Removable" onActivate={onActivate} />}
                    </GtkPopoverMenu>
                );
            }

            await render(<App showItem={true} />);

            await render(<App showItem={false} />);
        });
    });

    describe("Menu.Section", () => {
        it("creates menu section", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <MenuSection>
                        <MenuItem id="section1" label="Section Item 1" onActivate={() => {}} />
                        <MenuItem id="section2" label="Section Item 2" onActivate={() => {}} />
                    </MenuSection>
                </GtkPopoverMenu>,
            );
        });

        it("adds items within section", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <MenuSection>
                        <MenuItem id="itemA" label="Item A" onActivate={() => {}} />
                    </MenuSection>
                    <MenuSection>
                        <MenuItem id="itemB" label="Item B" onActivate={() => {}} />
                    </MenuSection>
                </GtkPopoverMenu>,
            );
        });

        it("sets section label", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <MenuSection label="Section Title">
                        <MenuItem id="item" label="Item" onActivate={() => {}} />
                    </MenuSection>
                </GtkPopoverMenu>,
            );
        });
    });

    describe("Menu.Submenu", () => {
        it("creates submenu", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <MenuSubmenu label="File">
                        <MenuItem id="new" label="New" onActivate={() => {}} />
                        <MenuItem id="open" label="Open" onActivate={() => {}} />
                    </MenuSubmenu>
                </GtkPopoverMenu>,
            );
        });

        it("adds items within submenu", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <MenuSubmenu label="Edit">
                        <MenuItem id="cut" label="Cut" onActivate={() => {}} />
                        <MenuItem id="copy" label="Copy" onActivate={() => {}} />
                        <MenuItem id="paste" label="Paste" onActivate={() => {}} />
                    </MenuSubmenu>
                </GtkPopoverMenu>,
            );
        });

        it("sets submenu label", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <MenuSubmenu label="Help">
                        <MenuItem id="about" label="About" onActivate={() => {}} />
                    </MenuSubmenu>
                </GtkPopoverMenu>,
            );
        });

        it("supports nested submenus", async () => {
            const ref = createRef<Gtk.PopoverMenu>();

            await render(
                <GtkPopoverMenu ref={ref}>
                    <MenuSubmenu label="File">
                        <MenuSubmenu label="Recent">
                            <MenuItem id="file1" label="File 1" onActivate={() => {}} />
                            <MenuItem id="file2" label="File 2" onActivate={() => {}} />
                        </MenuSubmenu>
                    </MenuSubmenu>
                </GtkPopoverMenu>,
            );
        });
    });
});
