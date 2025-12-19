import { getObject } from "@gtkx/ffi";
import * as Gio from "@gtkx/ffi/gio";
import * as Gtk from "@gtkx/ffi/gtk";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { GridView, Label, ListView } from "../../src/index.js";
import { render } from "../utils.js";

const getModelItemCount = (listView: Gtk.ListView): number => {
    const model = listView.getModel();
    if (!model) return 0;
    const listModel = getObject(model.id, Gio.ListModel);
    return listModel?.getNItems() ?? 0;
};

describe("render - ListView", () => {
    describe("ListView.Root", () => {
        it("creates ListView widget", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <ListView.Root ref={ref} renderItem={() => <Label label="Item" />}>
                    <ListView.Item id="1" item={{ name: "First" }} />
                </ListView.Root>,
            );

            expect(ref.current).not.toBeNull();
        });

        it("sets up SignalListItemFactory", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <ListView.Root ref={ref} renderItem={() => <Label label="Item" />}>
                    <ListView.Item id="1" item={{ name: "First" }} />
                </ListView.Root>,
            );

            expect(ref.current?.getFactory()).not.toBeNull();
        });
    });

    describe("ListView.Item", () => {
        it("adds item to list model", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <ListView.Root ref={ref} renderItem={() => <Label label="Item" />}>
                    <ListView.Item id="1" item={{ name: "First" }} />
                    <ListView.Item id="2" item={{ name: "Second" }} />
                </ListView.Root>,
            );

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(2);
        });

        it("inserts item before existing item", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: { id: string; name: string }[] }) {
                return (
                    <ListView.Root ref={ref} renderItem={() => <Label label="Item" />}>
                        {items.map((item) => (
                            <ListView.Item key={item.id} id={item.id} item={item} />
                        ))}
                    </ListView.Root>
                );
            }

            await render(
                <App
                    items={[
                        { id: "1", name: "First" },
                        { id: "3", name: "Third" },
                    ]}
                />,
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
            );

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(3);
        });

        it("removes item from list model", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: { id: string; name: string }[] }) {
                return (
                    <ListView.Root ref={ref} renderItem={() => <Label label="Item" />}>
                        {items.map((item) => (
                            <ListView.Item key={item.id} id={item.id} item={item} />
                        ))}
                    </ListView.Root>
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
            );

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(3);

            await render(
                <App
                    items={[
                        { id: "1", name: "A" },
                        { id: "3", name: "C" },
                    ]}
                />,
            );

            expect(getModelItemCount(ref.current as Gtk.ListView)).toBe(2);
        });

        it("updates item data", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ itemName }: { itemName: string }) {
                return (
                    <ListView.Root ref={ref} renderItem={() => <Label label="Item" />}>
                        <ListView.Item id="1" item={{ name: itemName }} />
                    </ListView.Root>
                );
            }

            await render(<App itemName="Initial" />);

            await render(<App itemName="Updated" />);
        });
    });

    describe("renderItem", () => {
        it("receives item data in renderItem", async () => {
            const ref = createRef<Gtk.ListView>();
            const renderItem = vi.fn((item: { name: string } | null) => <Label label={item?.name ?? "Empty"} />);

            await render(
                <ListView.Root ref={ref} renderItem={renderItem}>
                    <ListView.Item id="1" item={{ name: "Test Item" }} />
                </ListView.Root>,
            );
        });

        it("updates when renderItem function changes", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ prefix }: { prefix: string }) {
                return (
                    <ListView.Root
                        ref={ref}
                        renderItem={(item: { name: string } | null) => (
                            <Label label={`${prefix}: ${item?.name ?? ""}`} />
                        )}
                    >
                        <ListView.Item id="1" item={{ name: "Test" }} />
                    </ListView.Root>
                );
            }

            await render(<App prefix="First" />);

            await render(<App prefix="Second" />);
        });
    });

    describe("selection - single", () => {
        it("sets selected item via selected prop", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <ListView.Root ref={ref} renderItem={() => <Label label="Item" />} selected={["2"]}>
                    <ListView.Item id="1" item={{ name: "First" }} />
                    <ListView.Item id="2" item={{ name: "Second" }} />
                </ListView.Root>,
            );
        });

        it("calls onSelectionChanged when selection changes", async () => {
            const ref = createRef<Gtk.ListView>();
            const onSelectionChanged = vi.fn();

            await render(
                <ListView.Root
                    ref={ref}
                    renderItem={() => <Label label="Item" />}
                    onSelectionChanged={onSelectionChanged}
                >
                    <ListView.Item id="1" item={{ name: "First" }} />
                    <ListView.Item id="2" item={{ name: "Second" }} />
                </ListView.Root>,
            );

            expect(onSelectionChanged).toHaveBeenCalled();
        });

        it("handles unselect (empty selection)", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ selected }: { selected: string[] }) {
                return (
                    <ListView.Root ref={ref} renderItem={() => <Label label="Item" />} selected={selected}>
                        <ListView.Item id="1" item={{ name: "First" }} />
                    </ListView.Root>
                );
            }

            await render(<App selected={["1"]} />);

            await render(<App selected={[]} />);
        });
    });

    describe("selection - multiple", () => {
        it("enables multi-select with selectionMode", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <ListView.Root
                    ref={ref}
                    renderItem={() => <Label label="Item" />}
                    selectionMode={Gtk.SelectionMode.MULTIPLE}
                >
                    <ListView.Item id="1" item={{ name: "First" }} />
                    <ListView.Item id="2" item={{ name: "Second" }} />
                </ListView.Root>,
            );
        });

        it("sets multiple selected items", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <ListView.Root
                    ref={ref}
                    renderItem={() => <Label label="Item" />}
                    selectionMode={Gtk.SelectionMode.MULTIPLE}
                    selected={["1", "3"]}
                >
                    <ListView.Item id="1" item={{ name: "First" }} />
                    <ListView.Item id="2" item={{ name: "Second" }} />
                    <ListView.Item id="3" item={{ name: "Third" }} />
                </ListView.Root>,
            );
        });

        it("calls onSelectionChanged with array of ids", async () => {
            const ref = createRef<Gtk.ListView>();
            const onSelectionChanged = vi.fn();

            await render(
                <ListView.Root
                    ref={ref}
                    renderItem={() => <Label label="Item" />}
                    selectionMode={Gtk.SelectionMode.MULTIPLE}
                    onSelectionChanged={onSelectionChanged}
                >
                    <ListView.Item id="1" item={{ name: "First" }} />
                    <ListView.Item id="2" item={{ name: "Second" }} />
                </ListView.Root>,
            );

            expect(onSelectionChanged).toHaveBeenCalledWith(expect.any(Array));
        });
    });

    describe("GridView.Root", () => {
        it("creates GridView widget", async () => {
            const ref = createRef<Gtk.GridView>();

            await render(
                <GridView.Root ref={ref} renderItem={() => <Label label="Item" />}>
                    <GridView.Item id="1" item={{ name: "First" }} />
                </GridView.Root>,
            );

            expect(ref.current).not.toBeNull();
        });
    });
});
