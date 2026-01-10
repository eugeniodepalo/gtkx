import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkLabel, GtkStack, x } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - Stack", () => {
    describe("GtkStack", () => {
        it("creates Stack widget", async () => {
            const ref = createRef<Gtk.Stack>();

            await render(<GtkStack ref={ref} />);

            expect(ref.current).not.toBeNull();
        });
    });

    describe("StackPage", () => {
        it("adds named page", async () => {
            const stackRef = createRef<Gtk.Stack>();

            await render(
                <GtkStack ref={stackRef}>
                    <x.StackPage id="page1">Page 1</x.StackPage>
                </GtkStack>,
            );

            expect(stackRef.current?.getChildByName("page1")).not.toBeNull();
        });

        it("adds titled page", async () => {
            const stackRef = createRef<Gtk.Stack>();

            await render(
                <GtkStack ref={stackRef}>
                    <x.StackPage title="Page Title" id="titled">
                        Titled Content
                    </x.StackPage>
                </GtkStack>,
            );

            const page = stackRef.current?.getPage(stackRef.current.getChildByName("titled") as Gtk.Widget);
            expect(page?.getTitle()).toBe("Page Title");
        });

        it("adds child page (no name/title)", async () => {
            const stackRef = createRef<Gtk.Stack>();

            await render(
                <GtkStack ref={stackRef}>
                    <x.StackPage>Unnamed Page</x.StackPage>
                </GtkStack>,
            );

            expect(stackRef.current?.getFirstChild()).not.toBeNull();
        });

        it("sets page properties (iconName, needsAttention, etc.)", async () => {
            const stackRef = createRef<Gtk.Stack>();

            await render(
                <GtkStack ref={stackRef}>
                    <x.StackPage id="props-test" iconName="dialog-information" needsAttention={true}>
                        With Props
                    </x.StackPage>
                </GtkStack>,
            );

            const child = stackRef.current?.getChildByName("props-test");
            const page = stackRef.current?.getPage(child as Gtk.Widget);
            expect(page?.getIconName()).toBe("dialog-information");
            expect(page?.getNeedsAttention()).toBe(true);
        });
    });

    describe("page management", () => {
        it("inserts page before existing page", async () => {
            const stackRef = createRef<Gtk.Stack>();

            function App({ pages }: { pages: string[] }) {
                return (
                    <GtkStack ref={stackRef}>
                        {pages.map((name) => (
                            <x.StackPage key={name} id={name}>
                                {name}
                            </x.StackPage>
                        ))}
                    </GtkStack>
                );
            }

            await render(<App pages={["first", "last"]} />);

            await render(<App pages={["first", "middle", "last"]} />);

            expect(stackRef.current?.getChildByName("first")).not.toBeNull();
            expect(stackRef.current?.getChildByName("middle")).not.toBeNull();
            expect(stackRef.current?.getChildByName("last")).not.toBeNull();
        });

        it("removes page", async () => {
            const stackRef = createRef<Gtk.Stack>();

            function App({ pages }: { pages: string[] }) {
                return (
                    <GtkStack ref={stackRef}>
                        {pages.map((name) => (
                            <x.StackPage key={name} id={name}>
                                {name}
                            </x.StackPage>
                        ))}
                    </GtkStack>
                );
            }

            await render(<App pages={["a", "b", "c"]} />);

            await render(<App pages={["a", "c"]} />);

            expect(stackRef.current?.getChildByName("a")).not.toBeNull();
            expect(stackRef.current?.getChildByName("b")).toBeNull();
            expect(stackRef.current?.getChildByName("c")).not.toBeNull();
        });

        it("updates page properties when props change", async () => {
            const stackRef = createRef<Gtk.Stack>();

            function App({ iconName }: { iconName: string }) {
                return (
                    <GtkStack ref={stackRef}>
                        <x.StackPage id="dynamic" iconName={iconName}>
                            Dynamic
                        </x.StackPage>
                    </GtkStack>
                );
            }

            await render(<App iconName="dialog-information" />);

            const child = stackRef.current?.getChildByName("dynamic");
            let page = stackRef.current?.getPage(child as Gtk.Widget);
            expect(page?.getIconName()).toBe("dialog-information");

            await render(<App iconName="dialog-warning" />);

            page = stackRef.current?.getPage(child as Gtk.Widget);
            expect(page?.getIconName()).toBe("dialog-warning");
        });
    });

    describe("visibleChild", () => {
        it("sets visible child by name", async () => {
            const stackRef = createRef<Gtk.Stack>();

            await render(
                <GtkStack ref={stackRef} page="page2">
                    <x.StackPage id="page1">Page 1</x.StackPage>
                    <x.StackPage id="page2">Page 2</x.StackPage>
                </GtkStack>,
            );

            expect(stackRef.current?.getVisibleChildName()).toBe("page2");
        });

        it("handles pending visible child before pages added", async () => {
            const stackRef = createRef<Gtk.Stack>();

            function App({ pages }: { pages: string[] }) {
                return (
                    <GtkStack ref={stackRef} page="target">
                        {pages.map((name) => (
                            <x.StackPage key={name} id={name}>
                                <GtkLabel label={name} />
                            </x.StackPage>
                        ))}
                    </GtkStack>
                );
            }

            await render(<App pages={["other"]} />);

            await render(<App pages={["other", "target"]} />);

            expect(stackRef.current?.getVisibleChildName()).toBe("target");
        });
    });
});
