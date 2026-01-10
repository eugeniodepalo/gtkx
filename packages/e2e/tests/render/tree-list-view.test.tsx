import * as Gtk from "@gtkx/ffi/gtk";
import { GtkLabel, x } from "@gtkx/react";
import { cleanup, render, screen, tick, userEvent } from "@gtkx/testing";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getModelItemCount = (listView: Gtk.ListView): number => {
    const model = listView.getModel();
    if (!model) return 0;
    return model.getNItems() ?? 0;
};

const getModelItemOrder = (listView: Gtk.ListView): string[] => {
    const selectionModel = listView.getModel();
    if (!selectionModel) return [];

    const ids: string[] = [];
    const nItems = selectionModel.getNItems();
    for (let i = 0; i < nItems; i++) {
        const row = (selectionModel as Gtk.SingleSelection).getObject(i) as Gtk.TreeListRow | null;
        if (row) {
            const item = row.getItem() as Gtk.StringObject | null;
            if (item) {
                ids.push(item.getString());
            }
        }
    }
    return ids;
};

describe("render - TreeListView", () => {
    afterEach(async () => {
        await cleanup();
    });

    describe("TreeListView", () => {
        it("creates TreeListView widget", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <x.TreeListView ref={ref} renderItem={() => "Item"}>
                    <x.TreeListItem id="1" value={{ name: "First" }} />
                </x.TreeListView>,
                { wrapper: false },
            );

            expect(ref.current).not.toBeNull();
        });
    });

    describe("TreeListItem", () => {
        it("adds item to tree model", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <x.TreeListView ref={ref} renderItem={() => "Item"}>
                    <x.TreeListItem id="1" value={{ name: "First" }} />
                    <x.TreeListItem id="2" value={{ name: "Second" }} />
                </x.TreeListView>,
                { wrapper: false },
            );

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(2);
        });

        it("supports nested tree items", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <x.TreeListView ref={ref} renderItem={() => "Item"} autoexpand>
                    <x.TreeListItem id="parent" value={{ name: "Parent" }}>
                        <x.TreeListItem id="child1" value={{ name: "Child 1" }} />
                        <x.TreeListItem id="child2" value={{ name: "Child 2" }} />
                    </x.TreeListItem>
                </x.TreeListView>,
                { wrapper: false },
            );

            expect(ref.current).not.toBeNull();
        });

        it("inserts item before existing item", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: { id: string; name: string }[] }) {
                return (
                    <x.TreeListView ref={ref} renderItem={() => "Item"}>
                        {items.map((item) => (
                            <x.TreeListItem key={item.id} id={item.id} value={item} />
                        ))}
                    </x.TreeListView>
                );
            }

            await render(
                <App
                    items={[
                        { id: "1", name: "First" },
                        { id: "3", name: "Third" },
                    ]}
                />,
                { wrapper: false },
            );

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(2);

            await render(
                <App
                    items={[
                        { id: "1", name: "First" },
                        { id: "2", name: "Second" },
                        { id: "3", name: "Third" },
                    ]}
                />,
                { wrapper: false },
            );

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(3);
        });

        it("removes item from tree model", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: { id: string; name: string }[] }) {
                return (
                    <x.TreeListView ref={ref} renderItem={() => "Item"}>
                        {items.map((item) => (
                            <x.TreeListItem key={item.id} id={item.id} value={item} />
                        ))}
                    </x.TreeListView>
                );
            }

            await render(
                <App
                    items={[
                        { id: "1", name: "A" },
                        { id: "2", name: "B" },
                        { id: "3", name: "C" },
                    ]}
                />,
                { wrapper: false },
            );

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(3);

            await render(
                <App
                    items={[
                        { id: "1", name: "A" },
                        { id: "3", name: "C" },
                    ]}
                />,
                { wrapper: false },
            );

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(2);
        });

        it("updates item value", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ itemName }: { itemName: string }) {
                return (
                    <x.TreeListView ref={ref} renderItem={() => "Item"}>
                        <x.TreeListItem id="1" value={{ name: itemName }} />
                    </x.TreeListView>
                );
            }

            await render(<App itemName="Initial" />, { wrapper: false });

            await render(<App itemName="Updated" />, { wrapper: false });
        });
    });

    describe("renderItem", () => {
        it("receives item data in renderItem", async () => {
            const ref = createRef<Gtk.ListView>();
            const renderItem = vi.fn((item: { name: string } | null) => <GtkLabel label={item?.name ?? "Empty"} />);

            await render(
                <x.TreeListView ref={ref} renderItem={renderItem}>
                    <x.TreeListItem id="1" value={{ name: "Test Item" }} />
                </x.TreeListView>,
                { wrapper: false },
            );
        });

        it("receives TreeListRow in renderItem", async () => {
            const ref = createRef<Gtk.ListView>();
            const renderItem = vi.fn((item: { name: string } | null, row: Gtk.TreeListRow | null) => (
                <GtkLabel label={`${item?.name ?? ""} - depth: ${row?.getDepth() ?? 0}`} />
            ));

            await render(
                <x.TreeListView ref={ref} renderItem={renderItem} autoexpand>
                    <x.TreeListItem id="parent" value={{ name: "Parent" }}>
                        <x.TreeListItem id="child" value={{ name: "Child" }} />
                    </x.TreeListItem>
                </x.TreeListView>,
                { wrapper: false },
            );
        });

        it("updates when renderItem function changes", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ prefix }: { prefix: string }) {
                return (
                    <x.TreeListView
                        ref={ref}
                        renderItem={(item: { name: string } | null) => (
                            <GtkLabel label={`${prefix}: ${item?.name ?? ""}`} />
                        )}
                    >
                        <x.TreeListItem id="1" value={{ name: "Test" }} />
                    </x.TreeListView>
                );
            }

            await render(<App prefix="First" />, { wrapper: false });

            await render(<App prefix="Second" />, { wrapper: false });
        });
    });

    describe("autoexpand", () => {
        it("sets autoexpand property", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <x.TreeListView ref={ref} renderItem={() => "Item"} autoexpand>
                    <x.TreeListItem id="parent" value={{ name: "Parent" }}>
                        <x.TreeListItem id="child" value={{ name: "Child" }} />
                    </x.TreeListItem>
                </x.TreeListView>,
                { wrapper: false },
            );

            expect(ref.current).not.toBeNull();
        });

        it("shows children in model when autoexpand is true", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <x.TreeListView ref={ref} renderItem={() => "Item"} autoexpand>
                    <x.TreeListItem id="parent" value={{ name: "Parent" }}>
                        <x.TreeListItem id="child1" value={{ name: "Child 1" }} />
                        <x.TreeListItem id="child2" value={{ name: "Child 2" }} />
                    </x.TreeListItem>
                </x.TreeListView>,
                { wrapper: false },
            );

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(3);
            expect(getModelItemOrder(ref.current as Gtk.ListView)).toEqual(["parent", "child1", "child2"]);
        });

        it("parent row is expandable when it has children", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <x.TreeListView ref={ref} renderItem={() => "Item"}>
                    <x.TreeListItem id="parent" value={{ name: "Parent" }}>
                        <x.TreeListItem id="child1" value={{ name: "Child 1" }} />
                    </x.TreeListItem>
                </x.TreeListView>,
                { wrapper: false },
            );

            const selectionModel = ref.current?.getModel() as Gtk.SingleSelection;
            expect(selectionModel.getNItems()).toBeGreaterThan(0);
            const row = selectionModel.getObject(0) as Gtk.TreeListRow;
            expect(row).not.toBeNull();

            expect(row.isExpandable()).toBe(true);
        });

        it("expands parent row to show children when expanded", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <x.TreeListView ref={ref} renderItem={() => "Item"}>
                    <x.TreeListItem id="parent" value={{ name: "Parent" }}>
                        <x.TreeListItem id="child1" value={{ name: "Child 1" }} />
                        <x.TreeListItem id="child2" value={{ name: "Child 2" }} />
                    </x.TreeListItem>
                </x.TreeListView>,
                { wrapper: false },
            );

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(1);

            const selectionModel = ref.current?.getModel() as Gtk.SingleSelection;
            const row = selectionModel.getObject(0) as Gtk.TreeListRow;
            row.setExpanded(true);

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(3);
            expect(getModelItemOrder(ref.current as Gtk.ListView)).toEqual(["parent", "child1", "child2"]);
        });

        it("updates autoexpand property", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ autoexpand }: { autoexpand: boolean }) {
                return (
                    <x.TreeListView ref={ref} renderItem={() => "Item"} autoexpand={autoexpand}>
                        <x.TreeListItem id="parent" value={{ name: "Parent" }}>
                            <x.TreeListItem id="child" value={{ name: "Child" }} />
                        </x.TreeListItem>
                    </x.TreeListView>
                );
            }

            await render(<App autoexpand={false} />, { wrapper: false });

            await render(<App autoexpand={true} />, { wrapper: false });
        });
    });

    describe("selection - single", () => {
        it("sets selected item via selected prop", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <x.TreeListView ref={ref} renderItem={() => "Item"} selected={["2"]}>
                    <x.TreeListItem id="1" value={{ name: "First" }} />
                    <x.TreeListItem id="2" value={{ name: "Second" }} />
                </x.TreeListView>,
                { wrapper: false },
            );
        });

        it("calls onSelectionChanged when selection changes", async () => {
            const ref = createRef<Gtk.ListView>();
            const onSelectionChanged = vi.fn();

            await render(
                <x.TreeListView ref={ref} renderItem={() => "Item"} onSelectionChanged={onSelectionChanged}>
                    <x.TreeListItem id="1" value={{ name: "First" }} />
                    <x.TreeListItem id="2" value={{ name: "Second" }} />
                </x.TreeListView>,
                { wrapper: false },
            );

            await userEvent.selectOptions(ref.current as Gtk.ListView, 0);

            expect(onSelectionChanged).toHaveBeenCalledWith(["1"]);
        });

        it("handles unselect (empty selection)", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ selected }: { selected: string[] }) {
                return (
                    <x.TreeListView ref={ref} renderItem={() => "Item"} selected={selected}>
                        <x.TreeListItem id="1" value={{ name: "First" }} />
                    </x.TreeListView>
                );
            }

            await render(<App selected={["1"]} />, { wrapper: false });

            await render(<App selected={[]} />, { wrapper: false });
        });
    });

    describe("selection - multiple", () => {
        it("enables multi-select with selectionMode", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <x.TreeListView ref={ref} renderItem={() => "Item"} selectionMode={Gtk.SelectionMode.MULTIPLE}>
                    <x.TreeListItem id="1" value={{ name: "First" }} />
                    <x.TreeListItem id="2" value={{ name: "Second" }} />
                </x.TreeListView>,
                { wrapper: false },
            );
        });

        it("sets multiple selected items", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <x.TreeListView
                    ref={ref}
                    renderItem={() => "Item"}
                    selectionMode={Gtk.SelectionMode.MULTIPLE}
                    selected={["1", "3"]}
                >
                    <x.TreeListItem id="1" value={{ name: "First" }} />
                    <x.TreeListItem id="2" value={{ name: "Second" }} />
                    <x.TreeListItem id="3" value={{ name: "Third" }} />
                </x.TreeListView>,
                { wrapper: false },
            );
        });

        it("calls onSelectionChanged with array of ids", async () => {
            const ref = createRef<Gtk.ListView>();
            const onSelectionChanged = vi.fn();

            await render(
                <x.TreeListView
                    ref={ref}
                    renderItem={() => "Item"}
                    selectionMode={Gtk.SelectionMode.MULTIPLE}
                    onSelectionChanged={onSelectionChanged}
                >
                    <x.TreeListItem id="1" value={{ name: "First" }} />
                    <x.TreeListItem id="2" value={{ name: "Second" }} />
                </x.TreeListView>,
                { wrapper: false },
            );

            await userEvent.selectOptions(ref.current as Gtk.ListView, [0, 1]);

            expect(onSelectionChanged).toHaveBeenCalledWith(["1", "2"]);
        });
    });

    describe("item reordering", () => {
        it("respects React declaration order on initial render", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <x.TreeListView ref={ref} renderItem={() => "Item"}>
                    <x.TreeListItem id="c" value={{ name: "C" }} />
                    <x.TreeListItem id="a" value={{ name: "A" }} />
                    <x.TreeListItem id="b" value={{ name: "B" }} />
                </x.TreeListView>,
                { wrapper: false },
            );

            expect(getModelItemOrder(ref.current as Gtk.ListView)).toEqual(["c", "a", "b"]);
        });

        it("handles complete reversal of items", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: string[] }) {
                return (
                    <x.TreeListView ref={ref} renderItem={() => "Item"}>
                        {items.map((id) => (
                            <x.TreeListItem key={id} id={id} value={{ name: id }} />
                        ))}
                    </x.TreeListView>
                );
            }

            await render(<App items={["A", "B", "C", "D", "E"]} />, { wrapper: false });
            expect(getModelItemOrder(ref.current as Gtk.ListView)).toEqual(["A", "B", "C", "D", "E"]);

            await render(<App items={["E", "D", "C", "B", "A"]} />, { wrapper: false });
            expect(getModelItemOrder(ref.current as Gtk.ListView)).toEqual(["E", "D", "C", "B", "A"]);
        });

        it("handles interleaved reordering", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: string[] }) {
                return (
                    <x.TreeListView ref={ref} renderItem={() => "Item"}>
                        {items.map((id) => (
                            <x.TreeListItem key={id} id={id} value={{ name: id }} />
                        ))}
                    </x.TreeListView>
                );
            }

            await render(<App items={["A", "B", "C", "D"]} />, { wrapper: false });
            expect(getModelItemOrder(ref.current as Gtk.ListView)).toEqual(["A", "B", "C", "D"]);

            await render(<App items={["B", "D", "A", "C"]} />, { wrapper: false });
            expect(getModelItemOrder(ref.current as Gtk.ListView)).toEqual(["B", "D", "A", "C"]);
        });

        it("handles removing and adding while reordering", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: string[] }) {
                return (
                    <x.TreeListView ref={ref} renderItem={() => "Item"}>
                        {items.map((id) => (
                            <x.TreeListItem key={id} id={id} value={{ name: id }} />
                        ))}
                    </x.TreeListView>
                );
            }

            await render(<App items={["A", "B", "C"]} />, { wrapper: false });
            expect(getModelItemOrder(ref.current as Gtk.ListView)).toEqual(["A", "B", "C"]);

            await render(<App items={["D", "B", "E"]} />, { wrapper: false });
            expect(getModelItemOrder(ref.current as Gtk.ListView)).toEqual(["D", "B", "E"]);
        });

        it("handles rapid reordering", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: string[] }) {
                return (
                    <x.TreeListView ref={ref} renderItem={() => "Item"}>
                        {items.map((id) => (
                            <x.TreeListItem key={id} id={id} value={{ name: id }} />
                        ))}
                    </x.TreeListView>
                );
            }

            await render(<App items={["A", "B", "C"]} />, { wrapper: false });
            await render(<App items={["C", "A", "B"]} />, { wrapper: false });
            await render(<App items={["B", "C", "A"]} />, { wrapper: false });
            await render(<App items={["A", "B", "C"]} />, { wrapper: false });

            expect(getModelItemOrder(ref.current as Gtk.ListView)).toEqual(["A", "B", "C"]);
        });
    });

    describe("nested children rendering", () => {
        it("renders all nested children with correct data after expansion", async () => {
            const ref = createRef<Gtk.ListView>();
            const renderedItems: Array<{ id: string; name: string } | null> = [];

            interface Category {
                type: "category";
                id: string;
                name: string;
            }

            interface Setting {
                type: "setting";
                id: string;
                name: string;
            }

            type TreeItem = Category | Setting;

            const categories: Array<Category & { children: Setting[] }> = [
                {
                    type: "category",
                    id: "appearance",
                    name: "Appearance",
                    children: [
                        { type: "setting", id: "dark-mode", name: "Dark Mode" },
                        { type: "setting", id: "large-text", name: "Large Text" },
                        { type: "setting", id: "animations", name: "Animations" },
                        { type: "setting", id: "transparency", name: "Transparency" },
                    ],
                },
                {
                    type: "category",
                    id: "notifications",
                    name: "Notifications",
                    children: [
                        { type: "setting", id: "notifications-enabled", name: "Notifications" },
                        { type: "setting", id: "sounds", name: "Notification Sounds" },
                        { type: "setting", id: "do-not-disturb", name: "Do Not Disturb" },
                        { type: "setting", id: "badge-count", name: "Show Badge Count" },
                    ],
                },
                {
                    type: "category",
                    id: "privacy",
                    name: "Privacy",
                    children: [
                        { type: "setting", id: "location", name: "Location Services" },
                        { type: "setting", id: "camera", name: "Camera Access" },
                        { type: "setting", id: "microphone", name: "Microphone Access" },
                        { type: "setting", id: "analytics", name: "Usage Analytics" },
                    ],
                },
            ];

            await render(
                <x.TreeListView<TreeItem>
                    ref={ref}
                    renderItem={(item) => {
                        renderedItems.push(item ? { id: item.id, name: item.name } : null);
                        if (!item) {
                            return <GtkLabel label="Loading..." />;
                        }
                        return <GtkLabel label={item.name} />;
                    }}
                >
                    {categories.map((category) => (
                        <x.TreeListItem key={category.id} id={category.id} value={category as TreeItem}>
                            {category.children.map((setting) => (
                                <x.TreeListItem
                                    key={setting.id}
                                    id={setting.id}
                                    value={setting as TreeItem}
                                    hideExpander
                                />
                            ))}
                        </x.TreeListItem>
                    ))}
                </x.TreeListView>,
                { wrapper: false },
            );

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(3);

            const selectionModel = ref.current?.getModel() as Gtk.SingleSelection;
            const notificationsRow = selectionModel.getObject(1) as Gtk.TreeListRow;
            expect(notificationsRow.isExpandable()).toBe(true);

            renderedItems.length = 0;
            notificationsRow.setExpanded(true);

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(7);
            expect(getModelItemOrder(ref.current as Gtk.ListView)).toEqual([
                "appearance",
                "notifications",
                "notifications-enabled",
                "sounds",
                "do-not-disturb",
                "badge-count",
                "privacy",
            ]);

            const nullItems = renderedItems.filter((item) => item === null);
            expect(nullItems.length).toBe(0);
        });

        it("renders all children with correct data when using autoexpand", async () => {
            const ref = createRef<Gtk.ListView>();
            const renderedItems: Array<{ id: string; name: string } | null> = [];

            interface Category {
                type: "category";
                id: string;
                name: string;
            }

            interface Setting {
                type: "setting";
                id: string;
                name: string;
            }

            type TreeItem = Category | Setting;

            const categories: Array<Category & { children: Setting[] }> = [
                {
                    type: "category",
                    id: "notifications",
                    name: "Notifications",
                    children: [
                        { type: "setting", id: "notifications-enabled", name: "Notifications" },
                        { type: "setting", id: "sounds", name: "Notification Sounds" },
                        { type: "setting", id: "do-not-disturb", name: "Do Not Disturb" },
                        { type: "setting", id: "badge-count", name: "Show Badge Count" },
                    ],
                },
            ];

            await render(
                <x.TreeListView<TreeItem>
                    ref={ref}
                    autoexpand
                    renderItem={(item) => {
                        renderedItems.push(item ? { id: item.id, name: item.name } : null);
                        if (!item) {
                            return <GtkLabel label="Loading..." />;
                        }
                        return <GtkLabel label={item.name} />;
                    }}
                >
                    {categories.map((category) => (
                        <x.TreeListItem key={category.id} id={category.id} value={category as TreeItem}>
                            {category.children.map((setting) => (
                                <x.TreeListItem
                                    key={setting.id}
                                    id={setting.id}
                                    value={setting as TreeItem}
                                    hideExpander
                                />
                            ))}
                        </x.TreeListItem>
                    ))}
                </x.TreeListView>,
                { wrapper: false },
            );

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(5);
            expect(getModelItemOrder(ref.current as Gtk.ListView)).toEqual([
                "notifications",
                "notifications-enabled",
                "sounds",
                "do-not-disturb",
                "badge-count",
            ]);

            const nullItems = renderedItems.filter((item) => item === null);
            expect(nullItems.length).toBe(0);
        });
    });

    describe("tree item properties", () => {
        it("supports indentForDepth property", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <x.TreeListView ref={ref} renderItem={() => "Item"} autoexpand>
                    <x.TreeListItem id="parent" value={{ name: "Parent" }} indentForDepth={false}>
                        <x.TreeListItem id="child" value={{ name: "Child" }} indentForDepth={true} />
                    </x.TreeListItem>
                </x.TreeListView>,
                { wrapper: false },
            );

            expect(ref.current).not.toBeNull();
        });

        it("supports indentForIcon property", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <x.TreeListView ref={ref} renderItem={() => "Item"} autoexpand>
                    <x.TreeListItem id="parent" value={{ name: "Parent" }} indentForIcon={true}>
                        <x.TreeListItem id="child" value={{ name: "Child" }} indentForIcon={false} />
                    </x.TreeListItem>
                </x.TreeListView>,
                { wrapper: false },
            );

            expect(ref.current).not.toBeNull();
        });

        it("supports hideExpander property", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <x.TreeListView ref={ref} renderItem={() => "Item"} autoexpand>
                    <x.TreeListItem id="parent" value={{ name: "Parent" }} hideExpander={false}>
                        <x.TreeListItem id="child" value={{ name: "Child" }} hideExpander={true} />
                    </x.TreeListItem>
                </x.TreeListView>,
                { wrapper: false },
            );

            expect(ref.current).not.toBeNull();
        });
    });

    describe("settings tree regression", () => {
        it("renders all children with non-null values on first expansion", async () => {
            const ref = createRef<Gtk.ListView>();
            const renderedItems: Array<{ id: string; name: string } | null> = [];

            interface Category {
                type: "category";
                id: string;
                name: string;
            }

            interface Setting {
                type: "setting";
                id: string;
                name: string;
            }

            type TreeItem = Category | Setting;

            const categories: Array<Category & { children: Setting[] }> = [
                {
                    type: "category",
                    id: "appearance",
                    name: "Appearance",
                    children: [
                        { type: "setting", id: "dark-mode", name: "Dark Mode" },
                        { type: "setting", id: "large-text", name: "Large Text" },
                        { type: "setting", id: "animations", name: "Enable Animations" },
                        { type: "setting", id: "transparency", name: "Transparency Effects" },
                    ],
                },
            ];

            await render(
                <x.TreeListView<TreeItem>
                    ref={ref}
                    renderItem={(item) => {
                        renderedItems.push(item ? { id: item.id, name: item.name } : null);
                        if (!item) {
                            return <GtkLabel label="Loading..." />;
                        }
                        return <GtkLabel label={item.name} />;
                    }}
                >
                    {categories.map((category) => (
                        <x.TreeListItem key={category.id} id={category.id} value={category as TreeItem}>
                            {category.children.map((setting) => (
                                <x.TreeListItem
                                    key={setting.id}
                                    id={setting.id}
                                    value={setting as TreeItem}
                                    hideExpander
                                />
                            ))}
                        </x.TreeListItem>
                    ))}
                </x.TreeListView>,
                { wrapper: false },
            );

            const selectionModel = ref.current?.getModel() as Gtk.SingleSelection;
            const row = selectionModel.getObject(0) as Gtk.TreeListRow;

            renderedItems.length = 0;
            row.setExpanded(true);

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(5);
            expect(getModelItemOrder(ref.current as Gtk.ListView)).toEqual([
                "appearance",
                "dark-mode",
                "large-text",
                "animations",
                "transparency",
            ]);

            const nullItems = renderedItems.filter((item) => item === null);
            expect(nullItems.length).toBe(0);
        });

        it("renders all children with non-null values when clicking TreeExpander", async () => {
            const ref = createRef<Gtk.ListView>();
            const renderedItems: Array<{ id: string; name: string } | null> = [];

            interface Category {
                type: "category";
                id: string;
                name: string;
            }

            interface Setting {
                type: "setting";
                id: string;
                name: string;
            }

            type TreeItem = Category | Setting;

            const categories: Array<Category & { children: Setting[] }> = [
                {
                    type: "category",
                    id: "appearance",
                    name: "Appearance",
                    children: [
                        { type: "setting", id: "dark-mode", name: "Dark Mode" },
                        { type: "setting", id: "large-text", name: "Large Text" },
                        { type: "setting", id: "animations", name: "Enable Animations" },
                        { type: "setting", id: "transparency", name: "Transparency Effects" },
                    ],
                },
            ];

            await render(
                <x.TreeListView<TreeItem>
                    ref={ref}
                    renderItem={(item) => {
                        renderedItems.push(item ? { id: item.id, name: item.name } : null);
                        if (!item) {
                            return <GtkLabel label="Loading..." />;
                        }
                        return <GtkLabel label={item.name} />;
                    }}
                >
                    {categories.map((category) => (
                        <x.TreeListItem key={category.id} id={category.id} value={category as TreeItem}>
                            {category.children.map((setting) => (
                                <x.TreeListItem
                                    key={setting.id}
                                    id={setting.id}
                                    value={setting as TreeItem}
                                    hideExpander
                                />
                            ))}
                        </x.TreeListItem>
                    ))}
                </x.TreeListView>,
            );

            const buttons = screen.queryAllByRole(Gtk.AccessibleRole.BUTTON);
            const treeExpanders = buttons.filter((btn) => btn instanceof Gtk.TreeExpander);
            expect(treeExpanders.length).toBeGreaterThan(0);

            const expander = treeExpanders[0] as Gtk.TreeExpander;
            const row = expander.getListRow();
            if (!row) throw new Error("Expected row to exist");

            row.setExpanded(true);

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(5);
            expect(getModelItemOrder(ref.current as Gtk.ListView)).toEqual([
                "appearance",
                "dark-mode",
                "large-text",
                "animations",
                "transparency",
            ]);
        });

        it("renders all children correctly after multiple expand/collapse cycles", async () => {
            const ref = createRef<Gtk.ListView>();
            const renderedItems: Array<{ id: string; name: string } | null> = [];

            interface Category {
                type: "category";
                id: string;
                name: string;
            }

            interface Setting {
                type: "setting";
                id: string;
                name: string;
            }

            type TreeItem = Category | Setting;

            const categories: Array<Category & { children: Setting[] }> = [
                {
                    type: "category",
                    id: "appearance",
                    name: "Appearance",
                    children: [
                        { type: "setting", id: "dark-mode", name: "Dark Mode" },
                        { type: "setting", id: "large-text", name: "Large Text" },
                        { type: "setting", id: "animations", name: "Enable Animations" },
                        { type: "setting", id: "transparency", name: "Transparency Effects" },
                    ],
                },
                {
                    type: "category",
                    id: "notifications",
                    name: "Notifications",
                    children: [
                        { type: "setting", id: "notifications-enabled", name: "Notifications" },
                        { type: "setting", id: "sounds", name: "Notification Sounds" },
                        { type: "setting", id: "do-not-disturb", name: "Do Not Disturb" },
                        { type: "setting", id: "badge-count", name: "Show Badge Count" },
                    ],
                },
                {
                    type: "category",
                    id: "privacy",
                    name: "Privacy",
                    children: [
                        { type: "setting", id: "location", name: "Location Services" },
                        { type: "setting", id: "camera", name: "Camera Access" },
                        { type: "setting", id: "microphone", name: "Microphone Access" },
                        { type: "setting", id: "analytics", name: "Usage Analytics" },
                    ],
                },
                {
                    type: "category",
                    id: "power",
                    name: "Power",
                    children: [
                        { type: "setting", id: "auto-brightness", name: "Auto Brightness" },
                        { type: "setting", id: "power-saver", name: "Power Saver Mode" },
                        { type: "setting", id: "screen-timeout", name: "Screen Timeout" },
                        { type: "setting", id: "auto-suspend", name: "Automatic Suspend" },
                    ],
                },
                {
                    type: "category",
                    id: "network",
                    name: "Network",
                    children: [
                        { type: "setting", id: "wifi", name: "Wi-Fi" },
                        { type: "setting", id: "bluetooth", name: "Bluetooth" },
                        { type: "setting", id: "airplane", name: "Airplane Mode" },
                        { type: "setting", id: "vpn", name: "VPN" },
                    ],
                },
            ];

            await render(
                <x.TreeListView<TreeItem>
                    ref={ref}
                    renderItem={(item) => {
                        renderedItems.push(item ? { id: item.id, name: item.name } : null);
                        if (!item) {
                            return <GtkLabel label="Loading..." />;
                        }
                        return <GtkLabel label={item.name} />;
                    }}
                >
                    {categories.map((category) => (
                        <x.TreeListItem key={category.id} id={category.id} value={category as TreeItem}>
                            {category.children.map((setting) => (
                                <x.TreeListItem
                                    key={setting.id}
                                    id={setting.id}
                                    value={setting as TreeItem}
                                    hideExpander
                                />
                            ))}
                        </x.TreeListItem>
                    ))}
                </x.TreeListView>,
                { wrapper: false },
            );

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(5);

            const selectionModel = ref.current?.getModel() as Gtk.SingleSelection;

            const expandAndVerify = (categoryIndex: number, expectedChildren: string[]) => {
                renderedItems.length = 0;
                const row = selectionModel.getObject(categoryIndex) as Gtk.TreeListRow;
                row.setExpanded(true);

                const nullItems = renderedItems.filter((item) => item === null);
                expect(nullItems.length).toBe(0);

                const expandedOrder = getModelItemOrder(ref.current as Gtk.ListView);
                for (const childId of expectedChildren) {
                    expect(expandedOrder).toContain(childId);
                }
            };

            const collapseRow = (categoryIndex: number) => {
                const row = selectionModel.getObject(categoryIndex) as Gtk.TreeListRow;
                row.setExpanded(false);
            };

            expandAndVerify(0, ["dark-mode", "large-text", "animations", "transparency"]);

            collapseRow(0);
            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(5);

            expandAndVerify(0, ["dark-mode", "large-text", "animations", "transparency"]);

            collapseRow(0);

            expandAndVerify(1, ["notifications-enabled", "sounds", "do-not-disturb", "badge-count"]);

            collapseRow(1);

            expandAndVerify(0, ["dark-mode", "large-text", "animations", "transparency"]);

            const finalNullItems = renderedItems.filter((item) => item === null);
            expect(finalNullItems.length).toBe(0);
        });

        it("third child does not remain stuck on Loading after expansion", async () => {
            const ref = createRef<Gtk.ListView>();

            interface Category {
                type: "category";
                id: string;
                name: string;
            }

            interface Setting {
                type: "setting";
                id: string;
                name: string;
            }

            type TreeItem = Category | Setting;

            const categories: Array<Category & { children: Setting[] }> = [
                {
                    type: "category",
                    id: "appearance",
                    name: "Appearance",
                    children: [
                        { type: "setting", id: "dark-mode", name: "Dark Mode" },
                        { type: "setting", id: "large-text", name: "Large Text" },
                        { type: "setting", id: "animations", name: "Enable Animations" },
                        { type: "setting", id: "transparency", name: "Transparency Effects" },
                    ],
                },
                {
                    type: "category",
                    id: "notifications",
                    name: "Notifications",
                    children: [
                        { type: "setting", id: "notifications-enabled", name: "Notifications" },
                        { type: "setting", id: "sounds", name: "Notification Sounds" },
                        { type: "setting", id: "do-not-disturb", name: "Do Not Disturb" },
                        { type: "setting", id: "badge-count", name: "Show Badge Count" },
                    ],
                },
            ];

            await render(
                <x.TreeListView<TreeItem>
                    ref={ref}
                    estimatedItemHeight={48}
                    renderItem={(item) => {
                        if (!item) {
                            return <GtkLabel label="Loading..." />;
                        }
                        return <GtkLabel label={item.name} />;
                    }}
                >
                    {categories.map((category) => (
                        <x.TreeListItem key={category.id} id={category.id} value={category as TreeItem}>
                            {category.children.map((setting) => (
                                <x.TreeListItem
                                    key={setting.id}
                                    id={setting.id}
                                    value={setting as TreeItem}
                                    hideExpander
                                />
                            ))}
                        </x.TreeListItem>
                    ))}
                </x.TreeListView>,
            );

            const selectionModel = ref.current?.getModel() as Gtk.SingleSelection;
            const row = selectionModel.getObject(0) as Gtk.TreeListRow;

            const queryLabels = (text: string) =>
                screen.queryAllByText(text).filter((w) => w.getAccessibleRole() === Gtk.AccessibleRole.LABEL);

            const assertChildrenVisible = () => {
                expect(queryLabels("Loading...")).toHaveLength(0);
                expect(queryLabels("Dark Mode")).toHaveLength(1);
                expect(queryLabels("Large Text")).toHaveLength(1);
                expect(queryLabels("Enable Animations")).toHaveLength(1);
                expect(queryLabels("Transparency Effects")).toHaveLength(1);
            };

            const assertChildrenHidden = () => {
                expect(queryLabels("Dark Mode")).toHaveLength(0);
                expect(queryLabels("Large Text")).toHaveLength(0);
                expect(queryLabels("Enable Animations")).toHaveLength(0);
                expect(queryLabels("Transparency Effects")).toHaveLength(0);
            };

            for (let i = 0; i < 3; i++) {
                row.setExpanded(true);
                await tick();
                await tick();
                await tick();
                assertChildrenVisible();

                row.setExpanded(false);
                await tick();
                await tick();
                await tick();
                assertChildrenHidden();
            }

            row.setExpanded(true);
            await tick();
            await tick();
            await tick();
            assertChildrenVisible();
        });
    });
});
