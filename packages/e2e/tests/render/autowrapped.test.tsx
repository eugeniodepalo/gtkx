import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkFlowBox, GtkLabel, GtkListBox } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - Autowrapped", () => {
    describe("GtkListBox", () => {
        it("creates ListBox widget", async () => {
            const ref = createRef<Gtk.ListBox>();

            await render(<GtkListBox ref={ref} />);

            expect(ref.current).not.toBeNull();
        });

        it("wraps children in ListBoxRow", async () => {
            const listBoxRef = createRef<Gtk.ListBox>();
            const labelRef = createRef<Gtk.Label>();

            await render(
                <GtkListBox ref={listBoxRef}>
                    <GtkLabel ref={labelRef} label="Item 1" />
                </GtkListBox>,
            );

            const firstChild = listBoxRef.current?.getFirstChild();
            expect(firstChild).not.toBeNull();
            expect(labelRef.current?.getParent()).not.toBe(listBoxRef.current);
        });

        it("appends multiple children", async () => {
            const listBoxRef = createRef<Gtk.ListBox>();

            await render(
                <GtkListBox ref={listBoxRef}>
                    <GtkLabel label="Item 1" />
                    <GtkLabel label="Item 2" />
                    <GtkLabel label="Item 3" />
                </GtkListBox>,
            );

            let count = 0;
            let child = listBoxRef.current?.getFirstChild();
            while (child) {
                count++;
                child = child.getNextSibling();
            }
            expect(count).toBe(3);
        });

        it("removes children", async () => {
            const listBoxRef = createRef<Gtk.ListBox>();

            function App({ items }: { items: string[] }) {
                return (
                    <GtkListBox ref={listBoxRef}>
                        {items.map((item) => (
                            <GtkLabel key={item} label={item} />
                        ))}
                    </GtkListBox>
                );
            }

            await render(<App items={["a", "b", "c"]} />);

            let count = 0;
            let child = listBoxRef.current?.getFirstChild();
            while (child) {
                count++;
                child = child.getNextSibling();
            }
            expect(count).toBe(3);

            await render(<App items={["a", "c"]} />);

            count = 0;
            child = listBoxRef.current?.getFirstChild();
            while (child) {
                count++;
                child = child.getNextSibling();
            }
            expect(count).toBe(2);
        });

        it("reorders children", async () => {
            const listBoxRef = createRef<Gtk.ListBox>();

            function App({ items }: { items: string[] }) {
                return (
                    <GtkListBox ref={listBoxRef}>
                        {items.map((item) => (
                            <GtkLabel key={item} label={item} />
                        ))}
                    </GtkListBox>
                );
            }

            await render(<App items={["first", "second"]} />);
            await render(<App items={["second", "first"]} />);

            expect(listBoxRef.current?.getFirstChild()).not.toBeNull();
        });
    });

    describe("GtkFlowBox", () => {
        it("creates FlowBox widget", async () => {
            const ref = createRef<Gtk.FlowBox>();

            await render(<GtkFlowBox ref={ref} />);

            expect(ref.current).not.toBeNull();
        });

        it("wraps children in FlowBoxChild", async () => {
            const flowBoxRef = createRef<Gtk.FlowBox>();
            const labelRef = createRef<Gtk.Label>();

            await render(
                <GtkFlowBox ref={flowBoxRef}>
                    <GtkLabel ref={labelRef} label="Item 1" />
                </GtkFlowBox>,
            );

            const firstChild = flowBoxRef.current?.getFirstChild();
            expect(firstChild).not.toBeNull();
            expect(labelRef.current?.getParent()).not.toBe(flowBoxRef.current);
        });

        it("appends multiple children", async () => {
            const flowBoxRef = createRef<Gtk.FlowBox>();

            await render(
                <GtkFlowBox ref={flowBoxRef}>
                    <GtkLabel label="Item 1" />
                    <GtkLabel label="Item 2" />
                    <GtkLabel label="Item 3" />
                </GtkFlowBox>,
            );

            let count = 0;
            let child = flowBoxRef.current?.getFirstChild();
            while (child) {
                count++;
                child = child.getNextSibling();
            }
            expect(count).toBe(3);
        });

        it("removes children", async () => {
            const flowBoxRef = createRef<Gtk.FlowBox>();

            function App({ items }: { items: string[] }) {
                return (
                    <GtkFlowBox ref={flowBoxRef}>
                        {items.map((item) => (
                            <GtkLabel key={item} label={item} />
                        ))}
                    </GtkFlowBox>
                );
            }

            await render(<App items={["a", "b", "c"]} />);

            let count = 0;
            let child = flowBoxRef.current?.getFirstChild();
            while (child) {
                count++;
                child = child.getNextSibling();
            }
            expect(count).toBe(3);

            await render(<App items={["a"]} />);

            count = 0;
            child = flowBoxRef.current?.getFirstChild();
            while (child) {
                count++;
                child = child.getNextSibling();
            }
            expect(count).toBe(1);
        });
    });
});
