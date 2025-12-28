import type * as Adw from "@gtkx/ffi/adw";
import { AdwNavigationPage, AdwNavigationView, GtkLabel } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - NavigationPage", () => {
    describe("NavigationPageNode", () => {
        it("adds page to NavigationView", async () => {
            const navRef = createRef<Adw.NavigationView>();

            await render(
                <AdwNavigationView ref={navRef}>
                    <AdwNavigationPage tag="test" title="Test Page">
                        <GtkLabel label="Content" />
                    </AdwNavigationPage>
                </AdwNavigationView>,
                { wrapper: false },
            );

            expect(navRef.current?.findPage("test")).not.toBeNull();
        });

        it("sets page title", async () => {
            const navRef = createRef<Adw.NavigationView>();

            await render(
                <AdwNavigationView ref={navRef}>
                    <AdwNavigationPage tag="titled" title="My Title">
                        <GtkLabel label="Content" />
                    </AdwNavigationPage>
                </AdwNavigationView>,
                { wrapper: false },
            );

            const page = navRef.current?.findPage("titled");
            expect(page?.getTitle()).toBe("My Title");
        });

        it("sets page tag", async () => {
            const navRef = createRef<Adw.NavigationView>();

            await render(
                <AdwNavigationView ref={navRef}>
                    <AdwNavigationPage tag="my-tag" title="Tagged">
                        <GtkLabel label="Content" />
                    </AdwNavigationPage>
                </AdwNavigationView>,
                { wrapper: false },
            );

            const page = navRef.current?.findPage("my-tag");
            expect(page).not.toBeNull();
            expect(page?.getTag()).toBe("my-tag");
        });

        it("sets canPop property", async () => {
            const navRef = createRef<Adw.NavigationView>();

            await render(
                <AdwNavigationView ref={navRef}>
                    <AdwNavigationPage tag="home" title="Home" canPop={false}>
                        <GtkLabel label="Content" />
                    </AdwNavigationPage>
                </AdwNavigationView>,
                { wrapper: false },
            );

            const page = navRef.current?.findPage("home");
            expect(page?.getCanPop()).toBe(false);
        });

        it("updates title when prop changes", async () => {
            const navRef = createRef<Adw.NavigationView>();

            function App({ title }: { title: string }) {
                return (
                    <AdwNavigationView ref={navRef}>
                        <AdwNavigationPage tag="dynamic" title={title}>
                            <GtkLabel label="Content" />
                        </AdwNavigationPage>
                    </AdwNavigationView>
                );
            }

            await render(<App title="Initial" />, { wrapper: false });
            let page = navRef.current?.findPage("dynamic");
            expect(page?.getTitle()).toBe("Initial");

            await render(<App title="Updated" />, { wrapper: false });
            page = navRef.current?.findPage("dynamic");
            expect(page?.getTitle()).toBe("Updated");
        });

        it("updates canPop when prop changes", async () => {
            const navRef = createRef<Adw.NavigationView>();

            function App({ canPop }: { canPop: boolean }) {
                return (
                    <AdwNavigationView ref={navRef}>
                        <AdwNavigationPage tag="dynamic" title="Page" canPop={canPop}>
                            <GtkLabel label="Content" />
                        </AdwNavigationPage>
                    </AdwNavigationView>
                );
            }

            await render(<App canPop={true} />, { wrapper: false });
            let page = navRef.current?.findPage("dynamic");
            expect(page?.getCanPop()).toBe(true);

            await render(<App canPop={false} />, { wrapper: false });
            page = navRef.current?.findPage("dynamic");
            expect(page?.getCanPop()).toBe(false);
        });

        it("handles page without tag", async () => {
            const navRef = createRef<Adw.NavigationView>();

            await render(
                <AdwNavigationView ref={navRef}>
                    <AdwNavigationPage title="No Tag">
                        <GtkLabel label="Content" />
                    </AdwNavigationPage>
                </AdwNavigationView>,
                { wrapper: false },
            );

            const visiblePage = navRef.current?.getVisiblePage();
            expect(visiblePage).not.toBeNull();
            expect(visiblePage?.getTitle()).toBe("No Tag");
        });

        it("removes page from NavigationView", async () => {
            const navRef = createRef<Adw.NavigationView>();

            function App({ pages }: { pages: string[] }) {
                return (
                    <AdwNavigationView ref={navRef}>
                        {pages.map((tag) => (
                            <AdwNavigationPage key={tag} tag={tag} title={tag}>
                                <GtkLabel label={`Content: ${tag}`} />
                            </AdwNavigationPage>
                        ))}
                    </AdwNavigationView>
                );
            }

            await render(<App pages={["A", "B", "C"]} />, { wrapper: false });
            expect(navRef.current?.findPage("B")).not.toBeNull();

            await render(<App pages={["A", "C"]} />, { wrapper: false });
            expect(navRef.current?.findPage("B")).toBeNull();
        });

        it("handles page reordering", async () => {
            const navRef = createRef<Adw.NavigationView>();

            function App({ pages }: { pages: string[] }) {
                return (
                    <AdwNavigationView ref={navRef}>
                        {pages.map((tag) => (
                            <AdwNavigationPage key={tag} tag={tag} title={tag}>
                                <GtkLabel label={`Content: ${tag}`} />
                            </AdwNavigationPage>
                        ))}
                    </AdwNavigationView>
                );
            }

            await render(<App pages={["First", "Second", "Third"]} />, { wrapper: false });
            await render(<App pages={["Second", "First", "Third"]} />, { wrapper: false });

            expect(navRef.current?.findPage("First")).not.toBeNull();
            expect(navRef.current?.findPage("Second")).not.toBeNull();
            expect(navRef.current?.findPage("Third")).not.toBeNull();
        });
    });
});
