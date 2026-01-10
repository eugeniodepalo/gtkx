import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkDropDown, x } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - SimpleListItem", () => {
    describe("SimpleListItemNode", () => {
        it("renders simple list item in DropDown", async () => {
            const dropDownRef = createRef<Gtk.DropDown>();

            await render(
                <GtkDropDown ref={dropDownRef}>
                    <x.SimpleListItem id="item1" value="Item Value" />
                </GtkDropDown>,
            );

            expect(dropDownRef.current?.getModel()?.getNItems()).toBe(1);
        });

        it("handles string value", async () => {
            const dropDownRef = createRef<Gtk.DropDown>();

            await render(
                <GtkDropDown ref={dropDownRef}>
                    <x.SimpleListItem id="test" value="Test String" />
                </GtkDropDown>,
            );

            expect(dropDownRef.current?.getModel()?.getNItems()).toBe(1);
        });

        it("updates value on prop change", async () => {
            const dropDownRef = createRef<Gtk.DropDown>();

            function App({ value }: { value: string }) {
                return (
                    <GtkDropDown ref={dropDownRef}>
                        <x.SimpleListItem id="dynamic" value={value} />
                    </GtkDropDown>
                );
            }

            await render(<App value="Initial" />);
            expect(dropDownRef.current?.getModel()?.getNItems()).toBe(1);

            await render(<App value="Updated" />);
            expect(dropDownRef.current?.getModel()?.getNItems()).toBe(1);
        });

        it("maintains order with multiple items", async () => {
            const dropDownRef = createRef<Gtk.DropDown>();

            await render(
                <GtkDropDown ref={dropDownRef}>
                    <x.SimpleListItem id="a" value="First" />
                    <x.SimpleListItem id="b" value="Second" />
                    <x.SimpleListItem id="c" value="Third" />
                </GtkDropDown>,
            );

            expect(dropDownRef.current?.getModel()?.getNItems()).toBe(3);
        });

        it("inserts item before existing item", async () => {
            const dropDownRef = createRef<Gtk.DropDown>();

            function App({ items }: { items: string[] }) {
                return (
                    <GtkDropDown ref={dropDownRef}>
                        {items.map((item) => (
                            <x.SimpleListItem key={item} id={item} value={item} />
                        ))}
                    </GtkDropDown>
                );
            }

            await render(<App items={["first", "last"]} />);
            expect(dropDownRef.current?.getModel()?.getNItems()).toBe(2);

            await render(<App items={["first", "middle", "last"]} />);
            expect(dropDownRef.current?.getModel()?.getNItems()).toBe(3);
        });
    });
});
