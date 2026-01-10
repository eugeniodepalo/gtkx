import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkStack, x } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - StackPage", () => {
    describe("StackPageNode", () => {
        it("adds named page to Stack", async () => {
            const stackRef = createRef<Gtk.Stack>();

            await render(
                <GtkStack ref={stackRef}>
                    <x.StackPage id="test-page">Content</x.StackPage>
                </GtkStack>,
            );

            expect(stackRef.current?.getChildByName("test-page")).not.toBeNull();
        });

        it("sets page title", async () => {
            const stackRef = createRef<Gtk.Stack>();

            await render(
                <GtkStack ref={stackRef}>
                    <x.StackPage id="titled" title="Page Title">
                        Content
                    </x.StackPage>
                </GtkStack>,
            );

            const child = stackRef.current?.getChildByName("titled");
            const page = stackRef.current?.getPage(child as Gtk.Widget);
            expect(page?.getTitle()).toBe("Page Title");
        });

        it("sets page icon", async () => {
            const stackRef = createRef<Gtk.Stack>();

            await render(
                <GtkStack ref={stackRef}>
                    <x.StackPage id="iconic" iconName="dialog-information">
                        Content
                    </x.StackPage>
                </GtkStack>,
            );

            const child = stackRef.current?.getChildByName("iconic");
            const page = stackRef.current?.getPage(child as Gtk.Widget);
            expect(page?.getIconName()).toBe("dialog-information");
        });

        it("removes page from Stack", async () => {
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

            await render(<App pages={["a", "b"]} />);
            expect(stackRef.current?.getChildByName("b")).not.toBeNull();

            await render(<App pages={["a"]} />);
            expect(stackRef.current?.getChildByName("b")).toBeNull();
        });
    });
});
