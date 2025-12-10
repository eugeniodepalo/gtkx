import { getCurrentApp } from "@gtkx/ffi";
import type * as Gio from "@gtkx/ffi/gio";
import * as Gtk from "@gtkx/ffi/gtk";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { createNode } from "../src/factory.js";
import { ApplicationMenu, Menu, PopoverMenu } from "../src/index.js";
import { flushMicrotasks, flushSync, render, setupTests } from "./test-setup.js";

setupTests();

describe("Menu Nodes", () => {
    describe("node factory", () => {
        it("creates PopoverMenu.Root with internal Gio.Menu", () => {
            const node = createNode("PopoverMenu.Root", {});
            const widget = node.getWidget() as Gtk.PopoverMenu;

            expect(widget).toBeInstanceOf(Gtk.PopoverMenu);
            expect(widget.getMenuModel()).not.toBeNull();
        });

        it("creates ApplicationMenu as virtual node", () => {
            const node = createNode("ApplicationMenu", {});
            expect(node.getWidget()).toBeUndefined();
        });

        it("creates Menu.Item as virtual node", () => {
            const node = createNode("Menu.Item", { label: "Test", onActivate: () => {} });
            expect(node.getWidget()).toBeUndefined();
        });

        it("creates Menu.Section as virtual node", () => {
            const node = createNode("Menu.Section", { label: "Section" });
            expect(node.getWidget()).toBeUndefined();
        });

        it("creates Menu.Submenu as virtual node", () => {
            const node = createNode("Menu.Submenu", { label: "Submenu" });
            expect(node.getWidget()).toBeUndefined();
        });
    });

    describe("PopoverMenu.Root child management", () => {
        it("adds Menu.Item to PopoverMenu", async () => {
            const popover = createNode("PopoverMenu.Root", {});
            const item1 = createNode("Menu.Item", { label: "Open", onActivate: () => {} });
            const item2 = createNode("Menu.Item", { label: "Save", onActivate: () => {} });

            popover.appendChild(item1);
            popover.appendChild(item2);
            await flushMicrotasks();

            const widget = popover.getWidget() as Gtk.PopoverMenu;
            const menu = widget.getMenuModel() as Gio.Menu;

            expect(menu.getNItems()).toBe(2);
        });

        it("removes Menu.Item from PopoverMenu", async () => {
            const popover = createNode("PopoverMenu.Root", {});
            const item1 = createNode("Menu.Item", { label: "Open", onActivate: () => {} });
            const item2 = createNode("Menu.Item", { label: "Save", onActivate: () => {} });

            popover.appendChild(item1);
            popover.appendChild(item2);
            await flushMicrotasks();
            popover.removeChild(item1);
            await flushMicrotasks();

            const widget = popover.getWidget() as Gtk.PopoverMenu;
            const menu = widget.getMenuModel() as Gio.Menu;

            expect(menu.getNItems()).toBe(1);
        });

        it("adds Menu.Section with items", async () => {
            const popover = createNode("PopoverMenu.Root", {});
            const section = createNode("Menu.Section", { label: "File" });
            const item = createNode("Menu.Item", { label: "Open", onActivate: () => {} });

            section.appendChild(item);
            popover.appendChild(section);
            await flushMicrotasks();

            const widget = popover.getWidget() as Gtk.PopoverMenu;
            const menu = widget.getMenuModel() as Gio.Menu;

            expect(menu.getNItems()).toBe(1);
        });

        it("adds Menu.Submenu with items", async () => {
            const popover = createNode("PopoverMenu.Root", {});
            const submenu = createNode("Menu.Submenu", { label: "Edit" });
            const item = createNode("Menu.Item", { label: "Cut", onActivate: () => {} });

            submenu.appendChild(item);
            popover.appendChild(submenu);
            await flushMicrotasks();

            const widget = popover.getWidget() as Gtk.PopoverMenu;
            const menu = widget.getMenuModel() as Gio.Menu;

            expect(menu.getNItems()).toBe(1);
        });

        it("handles nested sections and submenus", async () => {
            const popover = createNode("PopoverMenu.Root", {});

            const section1 = createNode("Menu.Section", { label: "File Actions" });
            const item1 = createNode("Menu.Item", { label: "New", onActivate: () => {} });
            const item2 = createNode("Menu.Item", { label: "Open", onActivate: () => {} });
            section1.appendChild(item1);
            section1.appendChild(item2);

            const submenu = createNode("Menu.Submenu", { label: "Recent" });
            const recentItem = createNode("Menu.Item", { label: "File.txt", onActivate: () => {} });
            submenu.appendChild(recentItem);

            popover.appendChild(section1);
            popover.appendChild(submenu);
            await flushMicrotasks();

            const widget = popover.getWidget() as Gtk.PopoverMenu;
            const menu = widget.getMenuModel() as Gio.Menu;

            expect(menu.getNItems()).toBe(2);
        });

        it("registers action with application when onActivate provided", () => {
            const popover = createNode("PopoverMenu.Root", {});
            const callback = vi.fn();
            const item = createNode("Menu.Item", { label: "Test", onActivate: callback });

            popover.appendChild(item);

            const app = getCurrentApp();
            const actions = app.listActions();

            expect(actions.some((a) => a.startsWith("gtkx_menu_action_"))).toBe(true);
        });

        it("cleans up action when Menu.Item is removed", () => {
            const popover = createNode("PopoverMenu.Root", {});
            const callback = vi.fn();
            const item = createNode("Menu.Item", { label: "Test", onActivate: callback });

            popover.appendChild(item);

            const app = getCurrentApp();
            const actionsBefore = app.listActions().filter((a) => a.startsWith("gtkx_menu_action_"));
            expect(actionsBefore.length).toBeGreaterThan(0);

            popover.removeChild(item);

            const actionsAfter = app.listActions().filter((a) => a.startsWith("gtkx_menu_action_"));
            expect(actionsAfter.length).toBe(actionsBefore.length - 1);
        });

        it("sets accelerators when accels prop provided", () => {
            const popover = createNode("PopoverMenu.Root", {});
            const item = createNode("Menu.Item", {
                label: "Quit",
                onActivate: () => {},
                accels: "<Control>q",
            });

            popover.appendChild(item);

            const app = getCurrentApp();
            const actions = app.listActions().filter((a) => a.startsWith("gtkx_menu_action_"));
            const actionName = actions[actions.length - 1];
            const accels = app.getAccelsForAction(`app.${actionName}`);

            expect(accels).toContain("<Control>q");
        });

        it("handles array of accelerators", () => {
            const popover = createNode("PopoverMenu.Root", {});
            const item = createNode("Menu.Item", {
                label: "Save",
                onActivate: () => {},
                accels: ["<Control>s", "<Control><Shift>s"],
            });

            popover.appendChild(item);

            const app = getCurrentApp();
            const actions = app.listActions().filter((a) => a.startsWith("gtkx_menu_action_"));
            const actionName = actions[actions.length - 1];
            const accels = app.getAccelsForAction(`app.${actionName}`);

            expect(accels).toContain("<Control>s");
            // GTK normalizes modifier order to <Shift><Control>
            expect(accels).toContain("<Shift><Control>s");
        });
    });

    describe("ApplicationMenu", () => {
        it("sets menu on application when mounted", () => {
            const node = createNode("ApplicationMenu", {});
            const item = createNode("Menu.Item", { label: "Quit", onActivate: () => {} });

            node.appendChild(item);
            node.mount();

            const app = getCurrentApp();
            const menubar = app.getMenubar();

            expect(menubar).not.toBeNull();
        });

        it("clears menu on application when detached", () => {
            const node = createNode("ApplicationMenu", {});
            const item = createNode("Menu.Item", { label: "Quit", onActivate: () => {} });

            node.appendChild(item);
            node.mount();

            const dummyParent = createNode("Box", { spacing: 0, orientation: Gtk.Orientation.VERTICAL });
            node.detachFromParent(dummyParent);

            const app = getCurrentApp();
            const menubar = app.getMenubar();

            expect(menubar).toBeNull();
        });
    });

    describe("React integration", () => {
        it("renders PopoverMenu with Menu.Item children", () => {
            const onOpen = vi.fn();
            const onSave = vi.fn();
            const onQuit = vi.fn();

            render(
                <PopoverMenu.Root>
                    <Menu.Item label="Open" onActivate={onOpen} />
                    <Menu.Item label="Save" onActivate={onSave} />
                    <Menu.Item label="Quit" onActivate={onQuit} />
                </PopoverMenu.Root>,
            );
        });

        it("renders PopoverMenu with Menu.Section", () => {
            render(
                <PopoverMenu.Root>
                    <Menu.Section label="File">
                        <Menu.Item label="Open" onActivate={() => {}} />
                        <Menu.Item label="Save" onActivate={() => {}} />
                    </Menu.Section>
                    <Menu.Section label="Edit">
                        <Menu.Item label="Cut" onActivate={() => {}} />
                        <Menu.Item label="Copy" onActivate={() => {}} />
                    </Menu.Section>
                </PopoverMenu.Root>,
            );
        });

        it("renders PopoverMenu with Menu.Submenu", () => {
            render(
                <PopoverMenu.Root>
                    <Menu.Submenu label="File">
                        <Menu.Item label="New" onActivate={() => {}} />
                        <Menu.Item label="Open" onActivate={() => {}} />
                        <Menu.Submenu label="Recent">
                            <Menu.Item label="File1.txt" onActivate={() => {}} />
                            <Menu.Item label="File2.txt" onActivate={() => {}} />
                        </Menu.Submenu>
                    </Menu.Submenu>
                </PopoverMenu.Root>,
            );
        });

        it("renders ApplicationMenu with items", () => {
            render(
                <ApplicationMenu>
                    <Menu.Item label="About" onActivate={() => {}} />
                    <Menu.Item label="Preferences" onActivate={() => {}} />
                    <Menu.Item label="Quit" onActivate={() => {}} />
                </ApplicationMenu>,
            );

            const app = getCurrentApp();
            expect(app.getMenubar()).not.toBeNull();
        });

        it("handles dynamic menu items", () => {
            let setItems: (items: { label: string; id: string }[]) => void = () => {};

            const DynamicMenu = () => {
                const [items, _setItems] = useState([
                    { label: "Item A", id: "a" },
                    { label: "Item B", id: "b" },
                ]);
                setItems = _setItems;

                return (
                    <PopoverMenu.Root>
                        {items.map((item) => (
                            <Menu.Item key={item.id} label={item.label} onActivate={() => {}} />
                        ))}
                    </PopoverMenu.Root>
                );
            };

            render(<DynamicMenu />);

            flushSync(() =>
                setItems([
                    { label: "Item A", id: "a" },
                    { label: "Item B", id: "b" },
                    { label: "Item C", id: "c" },
                ]),
            );

            flushSync(() =>
                setItems([
                    { label: "Item C", id: "c" },
                    { label: "Item A", id: "a" },
                ]),
            );
        });

        it("handles conditional menu sections", () => {
            let setShowAdvanced: (show: boolean) => void = () => {};

            const ConditionalMenu = () => {
                const [showAdvanced, _setShowAdvanced] = useState(false);
                setShowAdvanced = _setShowAdvanced;

                return (
                    <PopoverMenu.Root>
                        <Menu.Section label="Basic">
                            <Menu.Item label="Open" onActivate={() => {}} />
                        </Menu.Section>
                        {showAdvanced && (
                            <Menu.Section label="Advanced">
                                <Menu.Item label="Debug" onActivate={() => {}} />
                            </Menu.Section>
                        )}
                    </PopoverMenu.Root>
                );
            };

            render(<ConditionalMenu />);

            flushSync(() => setShowAdvanced(true));
            flushSync(() => setShowAdvanced(false));
        });

        it("renders Menu.Item with accels prop", () => {
            render(
                <PopoverMenu.Root>
                    <Menu.Item label="Quit" onActivate={() => {}} accels="<Control>q" />
                    <Menu.Item label="Save" onActivate={() => {}} accels={["<Control>s", "<Control><Shift>s"]} />
                </PopoverMenu.Root>,
            );
        });
    });
});
