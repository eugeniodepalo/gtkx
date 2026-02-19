import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkDropDown, GtkLabel, GtkListView, GtkScrolledWindow } from "@gtkx/react";
import { render, screen, tick } from "@gtkx/testing";
import type { ReactNode } from "react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

const ScrollWrapper = ({ children }: { children: ReactNode }) => (
    <GtkScrolledWindow minContentHeight={200} minContentWidth={200}>
        {children}
    </GtkScrolledWindow>
);

describe("render - ListItem", () => {
    describe("ListItem", () => {
        it("renders list item in ListView", async () => {
            await render(
                <ScrollWrapper>
                    <GtkListView
                        items={[{ id: "1", value: { text: "First" } }]}
                        renderItem={(item: { text: string }) => <GtkLabel label={item.text} />}
                    />
                </ScrollWrapper>,
            );

            expect(screen.queryAllByText("First")).toHaveLength(1);
        });

        it("renders multiple list items", async () => {
            await render(
                <ScrollWrapper>
                    <GtkListView
                        items={[
                            { id: "1", value: { text: "First" } },
                            { id: "2", value: { text: "Second" } },
                            { id: "3", value: { text: "Third" } },
                        ]}
                        renderItem={(item: { text: string }) => <GtkLabel label={item.text} />}
                    />
                </ScrollWrapper>,
            );

            expect(screen.queryAllByText("First")).toHaveLength(1);
            expect(screen.queryAllByText("Second")).toHaveLength(1);
            expect(screen.queryAllByText("Third")).toHaveLength(1);
        });

        it("updates item value on prop change", async () => {
            function App({ value }: { value: { text: string } }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            items={[{ id: "dynamic", value }]}
                            renderItem={(item) => <GtkLabel label={item.text} />}
                        />
                    </ScrollWrapper>
                );
            }

            await render(<App value={{ text: "Initial" }} />);
            expect(screen.queryAllByText("Initial")).toHaveLength(1);

            await render(<App value={{ text: "Updated" }} />);
            expect(screen.queryAllByText("Updated")).toHaveLength(1);
            expect(screen.queryAllByText("Initial")).toHaveLength(0);
        });

        it("removes item from list", async () => {
            function App({ items }: { items: Array<{ id: string; text: string }> }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            items={items.map((item) => ({ id: item.id, value: item }))}
                            renderItem={(item: { text: string }) => <GtkLabel label={item.text} />}
                        />
                    </ScrollWrapper>
                );
            }

            await render(
                <App
                    items={[
                        { id: "1", text: "First" },
                        { id: "2", text: "Second" },
                        { id: "3", text: "Third" },
                    ]}
                />,
            );
            expect(screen.queryAllByText("First")).toHaveLength(1);
            expect(screen.queryAllByText("Second")).toHaveLength(1);
            expect(screen.queryAllByText("Third")).toHaveLength(1);

            await render(<App items={[{ id: "1", text: "First" }]} />);
            expect(screen.queryAllByText("First")).toHaveLength(1);
            expect(screen.queryAllByText("Second")).toHaveLength(0);
            expect(screen.queryAllByText("Third")).toHaveLength(0);
        });

        it("inserts item before existing item", async () => {
            function App({ items }: { items: Array<{ id: string; text: string }> }) {
                return (
                    <ScrollWrapper>
                        <GtkListView
                            items={items.map((item) => ({ id: item.id, value: item }))}
                            renderItem={(item: { text: string }) => <GtkLabel label={item.text} />}
                        />
                    </ScrollWrapper>
                );
            }

            await render(
                <App
                    items={[
                        { id: "first", text: "First" },
                        { id: "last", text: "Last" },
                    ]}
                />,
            );
            expect(screen.queryAllByText("First")).toHaveLength(1);
            expect(screen.queryAllByText("Last")).toHaveLength(1);

            await render(
                <App
                    items={[
                        { id: "first", text: "First" },
                        { id: "middle", text: "Middle" },
                        { id: "last", text: "Last" },
                    ]}
                />,
            );
            expect(screen.queryAllByText("First")).toHaveLength(1);
            expect(screen.queryAllByText("Middle")).toHaveLength(1);
            expect(screen.queryAllByText("Last")).toHaveLength(1);
        });
    });

    describe("ListItem in DropDown", () => {
        it("renders list item in DropDown", async () => {
            await render(<GtkDropDown items={[{ id: "item1", value: "Item Value" }]} />);

            expect(screen.queryAllByText("Item Value").length).toBeGreaterThan(0);
        });

        it("handles string value", async () => {
            await render(<GtkDropDown items={[{ id: "test", value: "Test String" }]} />);

            expect(screen.queryAllByText("Test String").length).toBeGreaterThan(0);
        });

        it("updates value on prop change", async () => {
            function App({ value }: { value: string }) {
                return <GtkDropDown items={[{ id: "dynamic", value }]} />;
            }

            await render(<App value="Initial" />);
            expect(screen.queryAllByText("Initial").length).toBeGreaterThan(0);

            await render(<App value="Updated" />);
            expect(screen.queryAllByText("Updated").length).toBeGreaterThan(0);
            expect(screen.queryAllByText("Initial")).toHaveLength(0);
        });

        it("maintains order with multiple items", async () => {
            const dropDownRef = createRef<Gtk.DropDown>();

            await render(
                <GtkDropDown
                    ref={dropDownRef}
                    items={[
                        { id: "a", value: "First" },
                        { id: "b", value: "Second" },
                        { id: "c", value: "Third" },
                    ]}
                />,
            );

            expect(screen.queryAllByText("First").length).toBeGreaterThan(0);

            dropDownRef.current?.setSelected(1);
            await tick();
            expect(screen.queryAllByText("Second").length).toBeGreaterThan(0);

            dropDownRef.current?.setSelected(2);
            await tick();
            expect(screen.queryAllByText("Third").length).toBeGreaterThan(0);
        });

        it("inserts item before existing item", async () => {
            const dropDownRef = createRef<Gtk.DropDown>();

            function App({ items }: { items: string[] }) {
                return <GtkDropDown ref={dropDownRef} items={items.map((item) => ({ id: item, value: item }))} />;
            }

            await render(<App items={["first", "last"]} />);
            expect(screen.queryAllByText("first").length).toBeGreaterThan(0);

            dropDownRef.current?.setSelected(1);
            await tick();
            expect(screen.queryAllByText("last").length).toBeGreaterThan(0);

            await render(<App items={["first", "middle", "last"]} />);
            dropDownRef.current?.setSelected(0);
            await tick();
            expect(screen.queryAllByText("first").length).toBeGreaterThan(0);

            dropDownRef.current?.setSelected(1);
            await tick();
            expect(screen.queryAllByText("middle").length).toBeGreaterThan(0);

            dropDownRef.current?.setSelected(2);
            await tick();
            expect(screen.queryAllByText("last").length).toBeGreaterThan(0);
        });
    });
});
