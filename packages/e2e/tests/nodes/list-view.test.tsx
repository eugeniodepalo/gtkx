import * as Gtk from "@gtkx/ffi/gtk";
import { GtkGridView, GtkLabel, GtkListView, GtkScrolledWindow, x } from "@gtkx/react";
import { cleanup, render, screen, tick, userEvent } from "@gtkx/testing";
import type { ReactNode } from "react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getVisibleItemTexts } from "../helpers/get-visible-item-texts.js";

const ScrollWrapper = ({ children }: { children: ReactNode }) => (
    <GtkScrolledWindow minContentHeight={200} minContentWidth={200}>
        {children}
    </GtkScrolledWindow>
);

describe("render - ListView", () => {
    describe("GtkListView", () => {
        it("creates ListView widget", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <ScrollWrapper>
                    <GtkListView
                        ref={ref}
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                    >
                        <x.ListItem id="1" value={{ name: "First" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );

            expect(ref.current).not.toBeNull();
        });
    });

    describe("ListItem", () => {
        it("adds item to list model", async () => {
            await render(
                <ScrollWrapper>
                    <GtkListView renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}>
                        <x.ListItem id="1" value={{ name: "First" }} />
                        <x.ListItem id="2" value={{ name: "Second" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );

            expect(screen.queryAllByText("First")).toHaveLength(1);
            expect(screen.queryAllByText("Second")).toHaveLength(1);
        });

        it("inserts item before existing item", async () => {
            function App({ items }: { items: { id: string; name: string }[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((item) => (
                                <x.ListItem key={item.id} id={item.id} value={item} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
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

            expect(screen.queryAllByText("First")).toHaveLength(1);
            expect(screen.queryAllByText("Third")).toHaveLength(1);

            await render(
                <App
                    items={[
                        { id: "1", name: "First" },
                        { id: "2", name: "Second" },
                        { id: "3", name: "Third" },
                    ]}
                />,
            );

            expect(screen.queryAllByText("First")).toHaveLength(1);
            expect(screen.queryAllByText("Second")).toHaveLength(1);
            expect(screen.queryAllByText("Third")).toHaveLength(1);
        });

        it("removes item from list model", async () => {
            function App({ items }: { items: { id: string; name: string }[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((item) => (
                                <x.ListItem key={item.id} id={item.id} value={item} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
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

            expect(screen.queryAllByText("A")).toHaveLength(1);
            expect(screen.queryAllByText("B")).toHaveLength(1);
            expect(screen.queryAllByText("C")).toHaveLength(1);

            await render(
                <App
                    items={[
                        { id: "1", name: "A" },
                        { id: "3", name: "C" },
                    ]}
                />,
            );

            expect(screen.queryAllByText("A")).toHaveLength(1);
            expect(screen.queryAllByText("B")).toHaveLength(0);
            expect(screen.queryAllByText("C")).toHaveLength(1);
        });

        it("updates item value", async () => {
            function App({ itemName }: { itemName: string }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            <x.ListItem id="1" value={{ name: itemName }} />
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App itemName="Initial" />);

            await render(<App itemName="Updated" />);
        });

        it("re-renders bound items when value changes", async () => {
            function App({ itemName }: { itemName: string }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? "Empty"} />}
                        >
                            <x.ListItem id="1" value={{ name: itemName }} />
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App itemName="Initial" />);

            expect(screen.queryAllByText("Initial")).toHaveLength(1);

            await render(<App itemName="Updated" />);

            expect(screen.queryAllByText("Updated")).toHaveLength(1);
            expect(screen.queryAllByText("Initial")).toHaveLength(0);
        });
    });

    describe("renderItem", () => {
        it("receives item data in renderItem", async () => {
            const renderItem = vi.fn((item: { name: string } | null) => <GtkLabel label={item?.name ?? "Empty"} />);

            await render(
                <ScrollWrapper>
                    <GtkListView renderItem={renderItem}>
                        <x.ListItem id="1" value={{ name: "Test Item" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );
        });

        it("updates when renderItem function changes", async () => {
            function App({ prefix }: { prefix: string }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            renderItem={(item: { name: string } | null) => (
                                <GtkLabel label={`${prefix}: ${item?.name ?? ""}`} />
                            )}
                        >
                            <x.ListItem id="1" value={{ name: "Test" }} />
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App prefix="First" />);

            await render(<App prefix="Second" />);
        });
    });

    describe("selection - single", () => {
        it("sets selected item via selected prop", async () => {
            await render(
                <ScrollWrapper>
                    <GtkListView
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        selected={["2"]}
                    >
                        <x.ListItem id="1" value={{ name: "First" }} />
                        <x.ListItem id="2" value={{ name: "Second" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );
        });

        it("calls onSelectionChanged when selection changes", async () => {
            const ref = createRef<Gtk.ListView>();
            const onSelectionChanged = vi.fn();

            await render(
                <ScrollWrapper>
                    <GtkListView
                        ref={ref}
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        onSelectionChanged={onSelectionChanged}
                    >
                        <x.ListItem id="1" value={{ name: "First" }} />
                        <x.ListItem id="2" value={{ name: "Second" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );

            await userEvent.selectOptions(ref.current as Gtk.ListView, 0);

            expect(onSelectionChanged).toHaveBeenCalledWith(["1"]);
        });

        it("handles unselect (empty selection)", async () => {
            function App({ selected }: { selected: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                            selected={selected}
                        >
                            <x.ListItem id="1" value={{ name: "First" }} />
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App selected={["1"]} />);

            await render(<App selected={[]} />);
        });
    });

    describe("selection - multiple", () => {
        it("enables multi-select with selectionMode", async () => {
            await render(
                <ScrollWrapper>
                    <GtkListView
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        selectionMode={Gtk.SelectionMode.MULTIPLE}
                    >
                        <x.ListItem id="1" value={{ name: "First" }} />
                        <x.ListItem id="2" value={{ name: "Second" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );
        });

        it("sets multiple selected items", async () => {
            await render(
                <ScrollWrapper>
                    <GtkListView
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        selectionMode={Gtk.SelectionMode.MULTIPLE}
                        selected={["1", "3"]}
                    >
                        <x.ListItem id="1" value={{ name: "First" }} />
                        <x.ListItem id="2" value={{ name: "Second" }} />
                        <x.ListItem id="3" value={{ name: "Third" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );
        });

        it("calls onSelectionChanged with array of ids", async () => {
            const ref = createRef<Gtk.ListView>();
            const onSelectionChanged = vi.fn();

            await render(
                <ScrollWrapper>
                    <GtkListView
                        ref={ref}
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        selectionMode={Gtk.SelectionMode.MULTIPLE}
                        onSelectionChanged={onSelectionChanged}
                    >
                        <x.ListItem id="1" value={{ name: "First" }} />
                        <x.ListItem id="2" value={{ name: "Second" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );

            await userEvent.selectOptions(ref.current as Gtk.ListView, [0, 1]);

            expect(onSelectionChanged).toHaveBeenCalledWith(["1", "2"]);
        });
    });

    describe("GtkGridView", () => {
        it("creates GridView widget", async () => {
            const ref = createRef<Gtk.GridView>();

            await render(
                <ScrollWrapper>
                    <GtkGridView
                        ref={ref}
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                    >
                        <x.ListItem id="1" value={{ name: "First" }} />
                    </GtkGridView>
                </ScrollWrapper>,
            );

            expect(ref.current).not.toBeNull();
        });

        it("sets singleClickActivate property correctly", async () => {
            const ref = createRef<Gtk.GridView>();

            await render(
                <ScrollWrapper>
                    <GtkGridView ref={ref} renderItem={() => <GtkLabel label="Item" />} singleClickActivate>
                        <x.ListItem id="1" value={{ name: "First" }} />
                    </GtkGridView>
                </ScrollWrapper>,
            );

            expect(ref.current?.getSingleClickActivate()).toBe(true);
        });
    });

    describe("item reordering", () => {
        afterEach(async () => {
            await cleanup();
        });

        it("respects React declaration order on initial render", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <ScrollWrapper>
                    <GtkListView
                        ref={ref}
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                    >
                        <x.ListItem id="c" value={{ name: "C" }} />
                        <x.ListItem id="a" value={{ name: "A" }} />
                        <x.ListItem id="b" value={{ name: "B" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );

            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["C", "A", "B"]);
        });

        it("handles complete reversal of items", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((id) => (
                                <x.ListItem key={id} id={id} value={{ name: id }} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App items={["A", "B", "C", "D", "E"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["A", "B", "C", "D", "E"]);

            await render(<App items={["E", "D", "C", "B", "A"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["E", "D", "C", "B", "A"]);
        });

        it("handles interleaved reordering", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((id) => (
                                <x.ListItem key={id} id={id} value={{ name: id }} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App items={["A", "B", "C", "D"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["A", "B", "C", "D"]);

            await render(<App items={["B", "D", "A", "C"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["B", "D", "A", "C"]);
        });

        it("handles removing and adding while reordering", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((id) => (
                                <x.ListItem key={id} id={id} value={{ name: id }} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App items={["A", "B", "C"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["A", "B", "C"]);

            await render(<App items={["D", "B", "E"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["D", "B", "E"]);
        });

        it("handles insert at beginning", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((id) => (
                                <x.ListItem key={id} id={id} value={{ name: id }} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App items={["B", "C"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["B", "C"]);

            await render(<App items={["A", "B", "C"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["A", "B", "C"]);
        });

        it("handles single item to multiple items", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((id) => (
                                <x.ListItem key={id} id={id} value={{ name: id }} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App items={["A"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["A"]);

            await render(<App items={["X", "A", "Y"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["X", "A", "Y"]);
        });

        it("handles rapid reordering", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((id) => (
                                <x.ListItem key={id} id={id} value={{ name: id }} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App items={["A", "B", "C"]} />);
            await render(<App items={["C", "A", "B"]} />);
            await render(<App items={["B", "C", "A"]} />);
            await render(<App items={["A", "B", "C"]} />);

            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["A", "B", "C"]);
        });

        it("handles large dataset reordering (200 items)", { timeout: 15000 }, async () => {
            const ref = createRef<Gtk.ListView>();

            const initialItems = Array.from({ length: 200 }, (_, i) => String(i + 1));
            const reversedItems = [...initialItems].reverse();

            function App({ items }: { items: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((id) => (
                                <x.ListItem key={id} id={id} value={{ name: id }} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App items={initialItems} />);
            const visibleBefore = getVisibleItemTexts(ref.current as Gtk.ListView);
            expect(visibleBefore.length).toBeGreaterThan(0);
            expect(visibleBefore[0]).toBe("1");

            await render(<App items={reversedItems} />);
            const visibleAfter = getVisibleItemTexts(ref.current as Gtk.ListView);
            expect(visibleAfter.length).toBeGreaterThan(0);
            expect(visibleAfter[0]).toBe("200");
        });

        it("handles move first item to last position", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((id) => (
                                <x.ListItem key={id} id={id} value={{ name: id }} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App items={["A", "B", "C", "D"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["A", "B", "C", "D"]);

            await render(<App items={["B", "C", "D", "A"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["B", "C", "D", "A"]);
        });

        it("handles move last item to first position", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((id) => (
                                <x.ListItem key={id} id={id} value={{ name: id }} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App items={["A", "B", "C", "D"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["A", "B", "C", "D"]);

            await render(<App items={["D", "A", "B", "C"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["D", "A", "B", "C"]);
        });

        it("handles swap of two items", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((id) => (
                                <x.ListItem key={id} id={id} value={{ name: id }} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App items={["A", "B", "C", "D"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["A", "B", "C", "D"]);

            await render(<App items={["A", "C", "B", "D"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["A", "C", "B", "D"]);
        });

        it("handles filtered view reordering", async () => {
            const ref = createRef<Gtk.ListView>();

            type Item = { id: string; active: boolean };

            function App({ filter, items }: { filter: "all" | "active" | "inactive"; items: Item[] }) {
                const filteredItems = items.filter((item) => {
                    if (filter === "active") return item.active;
                    if (filter === "inactive") return !item.active;
                    return true;
                });

                return (
                    <ScrollWrapper>
                        <GtkListView ref={ref} renderItem={(item: Item | null) => <GtkLabel label={item?.id ?? ""} />}>
                            {filteredItems.map((item) => (
                                <x.ListItem key={item.id} id={item.id} value={item} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            const items: Item[] = [
                { id: "1", active: true },
                { id: "2", active: false },
                { id: "3", active: true },
                { id: "4", active: false },
                { id: "5", active: true },
            ];

            await render(<App filter="all" items={items} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["1", "2", "3", "4", "5"]);

            await render(<App filter="active" items={items} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["1", "3", "5"]);

            await render(<App filter="inactive" items={items} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["2", "4"]);

            await render(<App filter="all" items={items} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["1", "2", "3", "4", "5"]);
        });

        it("preserves order when only item values change", async () => {
            const ref = createRef<Gtk.ListView>();

            type Item = { id: string; name: string };

            function App({ items }: { items: Item[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: Item | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((item) => (
                                <x.ListItem key={item.id} id={item.id} value={item} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            const initialItems: Item[] = [
                { id: "1", name: "Alice" },
                { id: "2", name: "Bob" },
                { id: "3", name: "Charlie" },
            ];

            await render(<App items={initialItems} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["Alice", "Bob", "Charlie"]);

            const updatedItems: Item[] = [
                { id: "1", name: "Alice Updated" },
                { id: "2", name: "Bob Updated" },
                { id: "3", name: "Charlie Updated" },
            ];

            await render(<App items={updatedItems} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual([
                "Alice Updated",
                "Bob Updated",
                "Charlie Updated",
            ]);
        });

        it("preserves order when updating a single item value", async () => {
            const ref = createRef<Gtk.ListView>();

            type Item = { id: string; name: string; count: number };

            function App({ items }: { items: Item[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: Item | null) => (
                                <GtkLabel label={`${item?.name ?? ""}: ${item?.count ?? 0}`} />
                            )}
                        >
                            {items.map((item) => (
                                <x.ListItem key={item.id} id={item.id} value={item} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            const initialItems: Item[] = [
                { id: "1", name: "Counter A", count: 0 },
                { id: "2", name: "Counter B", count: 0 },
                { id: "3", name: "Counter C", count: 0 },
            ];

            await render(<App items={initialItems} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual([
                "Counter A: 0",
                "Counter B: 0",
                "Counter C: 0",
            ]);

            const updatedItems: Item[] = [
                { id: "1", name: "Counter A", count: 0 },
                { id: "2", name: "Counter B", count: 5 },
                { id: "3", name: "Counter C", count: 0 },
            ];

            await render(<App items={updatedItems} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual([
                "Counter A: 0",
                "Counter B: 5",
                "Counter C: 0",
            ]);
        });

        it("preserves order with frequent value updates", async () => {
            const ref = createRef<Gtk.ListView>();

            type Item = { id: string; value: number };

            function App({ items }: { items: Item[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: Item | null) => <GtkLabel label={String(item?.value ?? 0)} />}
                        >
                            {items.map((item) => (
                                <x.ListItem key={item.id} id={item.id} value={item} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            const baseItems: Item[] = [
                { id: "1", value: 0 },
                { id: "2", value: 0 },
                { id: "3", value: 0 },
            ];

            await render(<App items={baseItems} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["0", "0", "0"]);

            for (let i = 1; i <= 10; i++) {
                const updatedItems: Item[] = [
                    { id: "1", value: i },
                    { id: "2", value: i * 2 },
                    { id: "3", value: i * 3 },
                ];
                await render(<App items={updatedItems} />);
                expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual([
                    String(i),
                    String(i * 2),
                    String(i * 3),
                ]);
            }
        });
    });

    describe("GridView item reordering", () => {
        afterEach(async () => {
            await cleanup();
        });

        it("handles complete reversal of items", async () => {
            const ref = createRef<Gtk.GridView>();

            function App({ items }: { items: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkGridView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((id) => (
                                <x.ListItem key={id} id={id} value={{ name: id }} />
                            ))}
                        </GtkGridView>
                    </ScrollWrapper>
                );
            }

            await render(<App items={["A", "B", "C", "D", "E"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.GridView)).toEqual(["A", "B", "C", "D", "E"]);

            await render(<App items={["E", "D", "C", "B", "A"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.GridView)).toEqual(["E", "D", "C", "B", "A"]);
        });

        it("handles interleaved reordering", async () => {
            const ref = createRef<Gtk.GridView>();

            function App({ items }: { items: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkGridView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((id) => (
                                <x.ListItem key={id} id={id} value={{ name: id }} />
                            ))}
                        </GtkGridView>
                    </ScrollWrapper>
                );
            }

            await render(<App items={["A", "B", "C", "D"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.GridView)).toEqual(["A", "B", "C", "D"]);

            await render(<App items={["B", "D", "A", "C"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.GridView)).toEqual(["B", "D", "A", "C"]);
        });

        it("handles rapid reordering", async () => {
            const ref = createRef<Gtk.GridView>();

            function App({ items }: { items: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkGridView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((id) => (
                                <x.ListItem key={id} id={id} value={{ name: id }} />
                            ))}
                        </GtkGridView>
                    </ScrollWrapper>
                );
            }

            await render(<App items={["A", "B", "C"]} />);
            await render(<App items={["C", "A", "B"]} />);
            await render(<App items={["B", "C", "A"]} />);
            await render(<App items={["A", "B", "C"]} />);

            expect(getVisibleItemTexts(ref.current as Gtk.GridView)).toEqual(["A", "B", "C"]);
        });
    });
});

describe("render - ListView (tree)", () => {
    afterEach(async () => {
        await cleanup();
    });

    describe("GtkListView (tree)", () => {
        it("creates ListView widget with tree items", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <ScrollWrapper>
                    <GtkListView
                        ref={ref}
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                    >
                        <x.ListItem id="1" value={{ name: "First" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );

            expect(ref.current).not.toBeNull();
        });
    });

    describe("ListItem (tree)", () => {
        it("adds item to tree model", async () => {
            await render(
                <ScrollWrapper>
                    <GtkListView renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}>
                        <x.ListItem id="1" value={{ name: "First" }} />
                        <x.ListItem id="2" value={{ name: "Second" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );

            expect(screen.queryAllByText("First")).toHaveLength(1);
            expect(screen.queryAllByText("Second")).toHaveLength(1);
        });

        it("supports nested tree items", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <ScrollWrapper>
                    <GtkListView
                        ref={ref}
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        autoexpand
                    >
                        <x.ListItem id="parent" value={{ name: "Parent" }}>
                            <x.ListItem id="child1" value={{ name: "Child 1" }} />
                            <x.ListItem id="child2" value={{ name: "Child 2" }} />
                        </x.ListItem>
                    </GtkListView>
                </ScrollWrapper>,
            );

            expect(ref.current).not.toBeNull();
        });

        it("inserts item before existing item", async () => {
            function App({ items }: { items: { id: string; name: string }[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((item) => (
                                <x.ListItem key={item.id} id={item.id} value={item} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
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

            expect(screen.queryAllByText("First")).toHaveLength(1);
            expect(screen.queryAllByText("Third")).toHaveLength(1);

            await render(
                <App
                    items={[
                        { id: "1", name: "First" },
                        { id: "2", name: "Second" },
                        { id: "3", name: "Third" },
                    ]}
                />,
            );

            expect(screen.queryAllByText("First")).toHaveLength(1);
            expect(screen.queryAllByText("Second")).toHaveLength(1);
            expect(screen.queryAllByText("Third")).toHaveLength(1);
        });

        it("removes item from tree model", async () => {
            function App({ items }: { items: { id: string; name: string }[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((item) => (
                                <x.ListItem key={item.id} id={item.id} value={item} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
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

            expect(screen.queryAllByText("A")).toHaveLength(1);
            expect(screen.queryAllByText("B")).toHaveLength(1);
            expect(screen.queryAllByText("C")).toHaveLength(1);

            await render(
                <App
                    items={[
                        { id: "1", name: "A" },
                        { id: "3", name: "C" },
                    ]}
                />,
            );

            expect(screen.queryAllByText("A")).toHaveLength(1);
            expect(screen.queryAllByText("B")).toHaveLength(0);
            expect(screen.queryAllByText("C")).toHaveLength(1);
        });

        it("updates item value", async () => {
            function App({ itemName }: { itemName: string }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            <x.ListItem id="1" value={{ name: itemName }} />
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App itemName="Initial" />);

            await render(<App itemName="Updated" />);
        });
    });

    describe("renderItem (tree)", () => {
        it("receives item data in renderItem", async () => {
            const renderItem = vi.fn((item: { name: string } | null) => <GtkLabel label={item?.name ?? "Empty"} />);

            await render(
                <ScrollWrapper>
                    <GtkListView renderItem={renderItem}>
                        <x.ListItem id="1" value={{ name: "Test Item" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );
        });

        it("receives TreeListRow in renderItem", async () => {
            const renderItem = vi.fn((item: { name: string } | null, row?: Gtk.TreeListRow | null) => (
                <GtkLabel label={`${item?.name ?? ""} - depth: ${row?.getDepth() ?? 0}`} />
            ));

            await render(
                <ScrollWrapper>
                    <GtkListView renderItem={renderItem} autoexpand>
                        <x.ListItem id="parent" value={{ name: "Parent" }}>
                            <x.ListItem id="child" value={{ name: "Child" }} />
                        </x.ListItem>
                    </GtkListView>
                </ScrollWrapper>,
            );
        });

        it("updates when renderItem function changes", async () => {
            function App({ prefix }: { prefix: string }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            renderItem={(item: { name: string } | null) => (
                                <GtkLabel label={`${prefix}: ${item?.name ?? ""}`} />
                            )}
                        >
                            <x.ListItem id="1" value={{ name: "Test" }} />
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App prefix="First" />);

            await render(<App prefix="Second" />);
        });
    });

    describe("autoexpand", () => {
        it("sets autoexpand property", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <ScrollWrapper>
                    <GtkListView
                        ref={ref}
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        autoexpand
                    >
                        <x.ListItem id="parent" value={{ name: "Parent" }}>
                            <x.ListItem id="child" value={{ name: "Child" }} />
                        </x.ListItem>
                    </GtkListView>
                </ScrollWrapper>,
            );

            expect(ref.current).not.toBeNull();
        });

        it("shows children in model when autoexpand is true", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <ScrollWrapper>
                    <GtkListView
                        ref={ref}
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        autoexpand
                    >
                        <x.ListItem id="parent" value={{ name: "Parent" }}>
                            <x.ListItem id="child1" value={{ name: "Child 1" }} />
                            <x.ListItem id="child2" value={{ name: "Child 2" }} />
                        </x.ListItem>
                    </GtkListView>
                </ScrollWrapper>,
            );

            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["Parent", "Child 1", "Child 2"]);
        });

        it("parent row is expandable when it has children", async () => {
            await render(
                <ScrollWrapper>
                    <GtkListView renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}>
                        <x.ListItem id="parent" value={{ name: "Parent" }}>
                            <x.ListItem id="child1" value={{ name: "Child 1" }} />
                        </x.ListItem>
                    </GtkListView>
                </ScrollWrapper>,
            );

            const treeExpanders = screen
                .queryAllByRole(Gtk.AccessibleRole.BUTTON)
                .filter((w): w is Gtk.TreeExpander => w instanceof Gtk.TreeExpander);
            expect(treeExpanders.length).toBeGreaterThan(0);

            const expander = treeExpanders[0] as Gtk.TreeExpander;
            const row = expander.getListRow();
            expect(row).not.toBeNull();
            expect(row?.isExpandable()).toBe(true);
        });

        it("expands parent row to show children when expanded", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <ScrollWrapper>
                    <GtkListView
                        ref={ref}
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                    >
                        <x.ListItem id="parent" value={{ name: "Parent" }}>
                            <x.ListItem id="child1" value={{ name: "Child 1" }} />
                            <x.ListItem id="child2" value={{ name: "Child 2" }} />
                        </x.ListItem>
                    </GtkListView>
                </ScrollWrapper>,
            );

            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["Parent"]);

            const treeExpanders = screen
                .queryAllByRole(Gtk.AccessibleRole.BUTTON)
                .filter((w): w is Gtk.TreeExpander => w instanceof Gtk.TreeExpander);
            const expander = treeExpanders[0] as Gtk.TreeExpander;
            const row = expander.getListRow();
            if (!row) throw new Error("Expected row to exist");
            row.setExpanded(true);
            await tick();

            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["Parent", "Child 1", "Child 2"]);
        });

        it("updates autoexpand property", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ autoexpand }: { autoexpand: boolean }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                            autoexpand={autoexpand}
                        >
                            <x.ListItem id="parent" value={{ name: "Parent" }}>
                                <x.ListItem id="child" value={{ name: "Child" }} />
                            </x.ListItem>
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App autoexpand={false} />);

            await render(<App autoexpand={true} />);
        });
    });

    describe("selection - single (tree)", () => {
        it("sets selected item via selected prop", async () => {
            const onSelectionChanged = vi.fn();

            await render(
                <ScrollWrapper>
                    <GtkListView
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        selected={["2"]}
                        onSelectionChanged={onSelectionChanged}
                    >
                        <x.ListItem id="1" value={{ name: "First" }} />
                        <x.ListItem id="2" value={{ name: "Second" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );

            await tick();

            expect(onSelectionChanged).toHaveBeenCalledWith(["2"]);
        });

        it("sets initial selection on first render", async () => {
            const onSelectionChanged = vi.fn();

            await render(
                <ScrollWrapper>
                    <GtkListView
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        selected={["first"]}
                        onSelectionChanged={onSelectionChanged}
                    >
                        <x.ListItem id="first" value={{ name: "First" }} />
                        <x.ListItem id="second" value={{ name: "Second" }} />
                        <x.ListItem id="third" value={{ name: "Third" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );

            expect(onSelectionChanged).toHaveBeenCalledWith(["first"]);
        });

        it("calls onSelectionChanged when selection changes", async () => {
            const ref = createRef<Gtk.ListView>();
            const onSelectionChanged = vi.fn();

            await render(
                <ScrollWrapper>
                    <GtkListView
                        ref={ref}
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        onSelectionChanged={onSelectionChanged}
                    >
                        <x.ListItem id="1" value={{ name: "First" }} />
                        <x.ListItem id="2" value={{ name: "Second" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );

            await userEvent.selectOptions(ref.current as Gtk.ListView, 0);

            expect(onSelectionChanged).toHaveBeenCalledWith(["1"]);
        });

        it("handles unselect (empty selection)", async () => {
            function App({ selected }: { selected: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                            selected={selected}
                        >
                            <x.ListItem id="1" value={{ name: "First" }} />
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App selected={["1"]} />);

            await render(<App selected={[]} />);
        });
    });

    describe("selection - multiple (tree)", () => {
        it("enables multi-select with selectionMode", async () => {
            await render(
                <ScrollWrapper>
                    <GtkListView
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        selectionMode={Gtk.SelectionMode.MULTIPLE}
                    >
                        <x.ListItem id="1" value={{ name: "First" }} />
                        <x.ListItem id="2" value={{ name: "Second" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );
        });

        it("sets multiple selected items", async () => {
            await render(
                <ScrollWrapper>
                    <GtkListView
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        selectionMode={Gtk.SelectionMode.MULTIPLE}
                        selected={["1", "3"]}
                    >
                        <x.ListItem id="1" value={{ name: "First" }} />
                        <x.ListItem id="2" value={{ name: "Second" }} />
                        <x.ListItem id="3" value={{ name: "Third" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );
        });

        it("calls onSelectionChanged with array of ids", async () => {
            const ref = createRef<Gtk.ListView>();
            const onSelectionChanged = vi.fn();

            await render(
                <ScrollWrapper>
                    <GtkListView
                        ref={ref}
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        selectionMode={Gtk.SelectionMode.MULTIPLE}
                        onSelectionChanged={onSelectionChanged}
                    >
                        <x.ListItem id="1" value={{ name: "First" }} />
                        <x.ListItem id="2" value={{ name: "Second" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );

            await userEvent.selectOptions(ref.current as Gtk.ListView, [0, 1]);

            expect(onSelectionChanged).toHaveBeenCalledWith(["1", "2"]);
        });
    });

    describe("item reordering (tree)", () => {
        it("respects React declaration order on initial render", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <ScrollWrapper>
                    <GtkListView
                        ref={ref}
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                    >
                        <x.ListItem id="c" value={{ name: "C" }} />
                        <x.ListItem id="a" value={{ name: "A" }} />
                        <x.ListItem id="b" value={{ name: "B" }} />
                    </GtkListView>
                </ScrollWrapper>,
            );

            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["C", "A", "B"]);
        });

        it("handles complete reversal of items", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((id) => (
                                <x.ListItem key={id} id={id} value={{ name: id }} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App items={["A", "B", "C", "D", "E"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["A", "B", "C", "D", "E"]);

            await render(<App items={["E", "D", "C", "B", "A"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["E", "D", "C", "B", "A"]);
        });

        it("handles interleaved reordering", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((id) => (
                                <x.ListItem key={id} id={id} value={{ name: id }} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App items={["A", "B", "C", "D"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["A", "B", "C", "D"]);

            await render(<App items={["B", "D", "A", "C"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["B", "D", "A", "C"]);
        });

        it("handles removing and adding while reordering", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((id) => (
                                <x.ListItem key={id} id={id} value={{ name: id }} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App items={["A", "B", "C"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["A", "B", "C"]);

            await render(<App items={["D", "B", "E"]} />);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["D", "B", "E"]);
        });

        it("handles rapid reordering", async () => {
            const ref = createRef<Gtk.ListView>();

            function App({ items }: { items: string[] }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            ref={ref}
                            renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        >
                            {items.map((id) => (
                                <x.ListItem key={id} id={id} value={{ name: id }} />
                            ))}
                        </GtkListView>
                    </ScrollWrapper>
                );
            }

            await render(<App items={["A", "B", "C"]} />);
            await render(<App items={["C", "A", "B"]} />);
            await render(<App items={["B", "C", "A"]} />);
            await render(<App items={["A", "B", "C"]} />);

            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual(["A", "B", "C"]);
        });
    });

    describe("nested children rendering", () => {
        it("renders all nested children with correct data after expansion", async () => {
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
                        { type: "setting", id: "animations", name: "Animations" },
                        { type: "setting", id: "transparency", name: "Transparency" },
                    ],
                },
                {
                    type: "category",
                    id: "notifications",
                    name: "Notifications",
                    children: [
                        { type: "setting", id: "notifications-enabled", name: "Alerts" },
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
                <ScrollWrapper>
                    <GtkListView<TreeItem>
                        ref={ref}
                        renderItem={(item) => {
                            if (!item) {
                                return <GtkLabel label="Loading..." />;
                            }
                            return <GtkLabel label={item.name} />;
                        }}
                    >
                        {categories.map((category) => (
                            <x.ListItem key={category.id} id={category.id} value={category as TreeItem}>
                                {category.children.map((setting) => (
                                    <x.ListItem
                                        key={setting.id}
                                        id={setting.id}
                                        value={setting as TreeItem}
                                        hideExpander
                                    />
                                ))}
                            </x.ListItem>
                        ))}
                    </GtkListView>
                </ScrollWrapper>,
            );

            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual([
                "Appearance",
                "Notifications",
                "Privacy",
            ]);

            const treeExpanders = screen
                .queryAllByRole(Gtk.AccessibleRole.BUTTON)
                .filter((w): w is Gtk.TreeExpander => w instanceof Gtk.TreeExpander)
                .filter((w) => w.getListRow()?.isExpandable());

            const notificationsExpander = treeExpanders[1] as Gtk.TreeExpander;
            const row = notificationsExpander.getListRow();
            if (!row) throw new Error("Expected row to exist");

            row.setExpanded(true);
            await tick();
            await tick();
            await tick();

            expect(screen.queryAllByText("Loading...")).toHaveLength(0);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual([
                "Appearance",
                "Notifications",
                "Alerts",
                "Notification Sounds",
                "Do Not Disturb",
                "Show Badge Count",
                "Privacy",
            ]);
        });

        it("renders all children with correct data when using autoexpand", async () => {
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
                    id: "notifications",
                    name: "Notifications",
                    children: [
                        { type: "setting", id: "notifications-enabled", name: "Alerts" },
                        { type: "setting", id: "sounds", name: "Notification Sounds" },
                        { type: "setting", id: "do-not-disturb", name: "Do Not Disturb" },
                        { type: "setting", id: "badge-count", name: "Show Badge Count" },
                    ],
                },
            ];

            await render(
                <ScrollWrapper>
                    <GtkListView<TreeItem>
                        ref={ref}
                        autoexpand
                        renderItem={(item) => {
                            if (!item) {
                                return <GtkLabel label="Loading..." />;
                            }
                            return <GtkLabel label={item.name} />;
                        }}
                    >
                        {categories.map((category) => (
                            <x.ListItem key={category.id} id={category.id} value={category as TreeItem}>
                                {category.children.map((setting) => (
                                    <x.ListItem
                                        key={setting.id}
                                        id={setting.id}
                                        value={setting as TreeItem}
                                        hideExpander
                                    />
                                ))}
                            </x.ListItem>
                        ))}
                    </GtkListView>
                </ScrollWrapper>,
            );

            await tick();
            await tick();
            await tick();

            expect(screen.queryAllByText("Loading...")).toHaveLength(0);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual([
                "Notifications",
                "Alerts",
                "Notification Sounds",
                "Do Not Disturb",
                "Show Badge Count",
            ]);
        });
    });

    describe("tree item properties", () => {
        it("supports indentForDepth property", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <ScrollWrapper>
                    <GtkListView
                        ref={ref}
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        autoexpand
                    >
                        <x.ListItem id="parent" value={{ name: "Parent" }} indentForDepth={false}>
                            <x.ListItem id="child" value={{ name: "Child" }} indentForDepth={true} />
                        </x.ListItem>
                    </GtkListView>
                </ScrollWrapper>,
            );

            expect(ref.current).not.toBeNull();
        });

        it("supports indentForIcon property", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <ScrollWrapper>
                    <GtkListView
                        ref={ref}
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        autoexpand
                    >
                        <x.ListItem id="parent" value={{ name: "Parent" }} indentForIcon={true}>
                            <x.ListItem id="child" value={{ name: "Child" }} indentForIcon={false} />
                        </x.ListItem>
                    </GtkListView>
                </ScrollWrapper>,
            );

            expect(ref.current).not.toBeNull();
        });

        it("supports hideExpander property", async () => {
            const ref = createRef<Gtk.ListView>();

            await render(
                <ScrollWrapper>
                    <GtkListView
                        ref={ref}
                        renderItem={(item: { name: string } | null) => <GtkLabel label={item?.name ?? ""} />}
                        autoexpand
                    >
                        <x.ListItem id="parent" value={{ name: "Parent" }} hideExpander={false}>
                            <x.ListItem id="child" value={{ name: "Child" }} hideExpander={true} />
                        </x.ListItem>
                    </GtkListView>
                </ScrollWrapper>,
            );

            expect(ref.current).not.toBeNull();
        });
    });

    describe("settings tree regression", () => {
        it("renders all children with non-null values on first expansion", async () => {
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
            ];

            await render(
                <ScrollWrapper>
                    <GtkListView<TreeItem>
                        ref={ref}
                        renderItem={(item) => {
                            if (!item) {
                                return <GtkLabel label="Loading..." />;
                            }
                            return <GtkLabel label={item.name} />;
                        }}
                    >
                        {categories.map((category) => (
                            <x.ListItem key={category.id} id={category.id} value={category as TreeItem}>
                                {category.children.map((setting) => (
                                    <x.ListItem
                                        key={setting.id}
                                        id={setting.id}
                                        value={setting as TreeItem}
                                        hideExpander
                                    />
                                ))}
                            </x.ListItem>
                        ))}
                    </GtkListView>
                </ScrollWrapper>,
            );

            const treeExpanders = screen
                .queryAllByRole(Gtk.AccessibleRole.BUTTON)
                .filter((w): w is Gtk.TreeExpander => w instanceof Gtk.TreeExpander);
            const expander = treeExpanders[0] as Gtk.TreeExpander;
            const row = expander.getListRow();
            if (!row) throw new Error("Expected row to exist");

            row.setExpanded(true);
            await tick();
            await tick();
            await tick();

            expect(screen.queryAllByText("Loading...")).toHaveLength(0);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual([
                "Appearance",
                "Dark Mode",
                "Large Text",
                "Enable Animations",
                "Transparency Effects",
            ]);
        });

        it("renders all children with non-null values when clicking TreeExpander", async () => {
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
            ];

            await render(
                <ScrollWrapper>
                    <GtkListView<TreeItem>
                        ref={ref}
                        renderItem={(item) => {
                            if (!item) {
                                return <GtkLabel label="Loading..." />;
                            }
                            return <GtkLabel label={item.name} />;
                        }}
                    >
                        {categories.map((category) => (
                            <x.ListItem key={category.id} id={category.id} value={category as TreeItem}>
                                {category.children.map((setting) => (
                                    <x.ListItem
                                        key={setting.id}
                                        id={setting.id}
                                        value={setting as TreeItem}
                                        hideExpander
                                    />
                                ))}
                            </x.ListItem>
                        ))}
                    </GtkListView>
                </ScrollWrapper>,
            );

            const buttons = screen.queryAllByRole(Gtk.AccessibleRole.BUTTON);
            const treeExpanders = buttons.filter((btn) => btn instanceof Gtk.TreeExpander);
            expect(treeExpanders.length).toBeGreaterThan(0);

            const expander = treeExpanders[0] as Gtk.TreeExpander;
            const row = expander.getListRow();
            if (!row) throw new Error("Expected row to exist");

            row.setExpanded(true);
            await tick();

            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual([
                "Appearance",
                "Dark Mode",
                "Large Text",
                "Enable Animations",
                "Transparency Effects",
            ]);
        });

        it("renders all children correctly after multiple expand/collapse cycles", async () => {
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
                        { type: "setting", id: "notifications-enabled", name: "Alerts" },
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
                <ScrollWrapper>
                    <GtkListView<TreeItem>
                        ref={ref}
                        renderItem={(item) => {
                            if (!item) {
                                return <GtkLabel label="Loading..." />;
                            }
                            return <GtkLabel label={item.name} />;
                        }}
                    >
                        {categories.map((category) => (
                            <x.ListItem key={category.id} id={category.id} value={category as TreeItem}>
                                {category.children.map((setting) => (
                                    <x.ListItem
                                        key={setting.id}
                                        id={setting.id}
                                        value={setting as TreeItem}
                                        hideExpander
                                    />
                                ))}
                            </x.ListItem>
                        ))}
                    </GtkListView>
                </ScrollWrapper>,
            );

            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual([
                "Appearance",
                "Notifications",
                "Privacy",
                "Power",
                "Network",
            ]);

            const getExpandableExpanders = () =>
                screen
                    .queryAllByRole(Gtk.AccessibleRole.BUTTON)
                    .filter((w): w is Gtk.TreeExpander => w instanceof Gtk.TreeExpander)
                    .filter((w) => w.getListRow()?.isExpandable());

            const expandAndVerify = async (categoryIndex: number, expectedChildren: string[]) => {
                const expanders = getExpandableExpanders();
                const expander = expanders[categoryIndex] as Gtk.TreeExpander;
                const row = expander.getListRow();
                if (!row) throw new Error("Expected row to exist");
                row.setExpanded(true);
                await tick();
                await tick();
                await tick();

                expect(screen.queryAllByText("Loading...")).toHaveLength(0);

                for (const childName of expectedChildren) {
                    expect(screen.queryAllByText(childName)).toHaveLength(1);
                }
            };

            const collapseRow = async (categoryIndex: number) => {
                const expanders = getExpandableExpanders();
                const expander = expanders[categoryIndex] as Gtk.TreeExpander;
                const row = expander.getListRow();
                if (!row) throw new Error("Expected row to exist");
                row.setExpanded(false);
                await tick();
            };

            await expandAndVerify(0, ["Dark Mode", "Large Text", "Enable Animations", "Transparency Effects"]);

            await collapseRow(0);
            expect(getVisibleItemTexts(ref.current as Gtk.ListView)).toEqual([
                "Appearance",
                "Notifications",
                "Privacy",
                "Power",
                "Network",
            ]);

            await expandAndVerify(0, ["Dark Mode", "Large Text", "Enable Animations", "Transparency Effects"]);

            await collapseRow(0);

            await expandAndVerify(1, ["Alerts", "Notification Sounds", "Do Not Disturb", "Show Badge Count"]);

            await collapseRow(1);

            await expandAndVerify(0, ["Dark Mode", "Large Text", "Enable Animations", "Transparency Effects"]);

            expect(screen.queryAllByText("Loading...")).toHaveLength(0);
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
                        { type: "setting", id: "notifications-enabled", name: "Alerts" },
                        { type: "setting", id: "sounds", name: "Notification Sounds" },
                        { type: "setting", id: "do-not-disturb", name: "Do Not Disturb" },
                        { type: "setting", id: "badge-count", name: "Show Badge Count" },
                    ],
                },
            ];

            await render(
                <ScrollWrapper>
                    <GtkListView<TreeItem>
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
                            <x.ListItem key={category.id} id={category.id} value={category as TreeItem}>
                                {category.children.map((setting) => (
                                    <x.ListItem
                                        key={setting.id}
                                        id={setting.id}
                                        value={setting as TreeItem}
                                        hideExpander
                                    />
                                ))}
                            </x.ListItem>
                        ))}
                    </GtkListView>
                </ScrollWrapper>,
            );

            const treeExpanders = screen
                .queryAllByRole(Gtk.AccessibleRole.BUTTON)
                .filter((w): w is Gtk.TreeExpander => w instanceof Gtk.TreeExpander);
            const expander = treeExpanders[0] as Gtk.TreeExpander;
            const row = expander.getListRow();
            if (!row) throw new Error("Expected row to exist");

            const assertChildrenVisible = () => {
                expect(screen.queryAllByText("Loading...")).toHaveLength(0);
                expect(screen.queryAllByText("Dark Mode")).toHaveLength(1);
                expect(screen.queryAllByText("Large Text")).toHaveLength(1);
                expect(screen.queryAllByText("Enable Animations")).toHaveLength(1);
                expect(screen.queryAllByText("Transparency Effects")).toHaveLength(1);
            };

            const assertChildrenHidden = () => {
                expect(screen.queryAllByText("Dark Mode")).toHaveLength(0);
                expect(screen.queryAllByText("Large Text")).toHaveLength(0);
                expect(screen.queryAllByText("Enable Animations")).toHaveLength(0);
                expect(screen.queryAllByText("Transparency Effects")).toHaveLength(0);
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
