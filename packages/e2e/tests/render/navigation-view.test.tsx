import type * as Adw from "@gtkx/ffi/adw";
import { AdwNavigationPage, AdwNavigationView, GtkLabel } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("render - NavigationView", () => {
    describe("AdwNavigationView", () => {
        it("creates NavigationView widget", async () => {
            const ref = createRef<Adw.NavigationView>();

            await render(<AdwNavigationView ref={ref} />, { wrapper: false });

            expect(ref.current).not.toBeNull();
        });

        it("sets animateTransitions property", async () => {
            const ref = createRef<Adw.NavigationView>();

            await render(<AdwNavigationView ref={ref} animateTransitions={false} />, { wrapper: false });

            expect(ref.current?.getAnimateTransitions()).toBe(false);
        });

        it("sets popOnEscape property", async () => {
            const ref = createRef<Adw.NavigationView>();

            await render(<AdwNavigationView ref={ref} popOnEscape={false} />, { wrapper: false });

            expect(ref.current?.getPopOnEscape()).toBe(false);
        });
    });

    describe("page management", () => {
        it("adds NavigationPage as child", async () => {
            const navRef = createRef<Adw.NavigationView>();

            await render(
                <AdwNavigationView ref={navRef}>
                    <AdwNavigationPage tag="home" title="Home">
                        <GtkLabel label="Home Content" />
                    </AdwNavigationPage>
                </AdwNavigationView>,
                { wrapper: false },
            );

            const page = navRef.current?.findPage("home");
            expect(page).not.toBeNull();
            expect(page?.getTitle()).toBe("Home");
        });

        it("adds multiple NavigationPages", async () => {
            const navRef = createRef<Adw.NavigationView>();

            await render(
                <AdwNavigationView ref={navRef}>
                    <AdwNavigationPage tag="page1" title="Page 1">
                        <GtkLabel label="Content 1" />
                    </AdwNavigationPage>
                    <AdwNavigationPage tag="page2" title="Page 2">
                        <GtkLabel label="Content 2" />
                    </AdwNavigationPage>
                </AdwNavigationView>,
                { wrapper: false },
            );

            expect(navRef.current?.findPage("page1")).not.toBeNull();
            expect(navRef.current?.findPage("page2")).not.toBeNull();
        });

        it("removes NavigationPage when unmounted", async () => {
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

            await render(<App pages={["a", "b", "c"]} />, { wrapper: false });
            expect(navRef.current?.findPage("b")).not.toBeNull();

            await render(<App pages={["a", "c"]} />, { wrapper: false });
            expect(navRef.current?.findPage("a")).not.toBeNull();
            expect(navRef.current?.findPage("b")).toBeNull();
            expect(navRef.current?.findPage("c")).not.toBeNull();
        });

        it("navigates programmatically with pushByTag", async () => {
            const navRef = createRef<Adw.NavigationView>();

            await render(
                <AdwNavigationView ref={navRef}>
                    <AdwNavigationPage tag="home" title="Home">
                        <GtkLabel label="Home" />
                    </AdwNavigationPage>
                    <AdwNavigationPage tag="details" title="Details">
                        <GtkLabel label="Details" />
                    </AdwNavigationPage>
                </AdwNavigationView>,
                { wrapper: false },
            );

            navRef.current?.pushByTag("details");

            const visiblePage = navRef.current?.getVisiblePage();
            expect(visiblePage?.getTag()).toBe("details");
        });

        it("pops page from navigation stack", async () => {
            const navRef = createRef<Adw.NavigationView>();

            await render(
                <AdwNavigationView ref={navRef}>
                    <AdwNavigationPage tag="home" title="Home">
                        <GtkLabel label="Home" />
                    </AdwNavigationPage>
                    <AdwNavigationPage tag="details" title="Details">
                        <GtkLabel label="Details" />
                    </AdwNavigationPage>
                </AdwNavigationView>,
                { wrapper: false },
            );

            navRef.current?.pushByTag("details");
            expect(navRef.current?.getVisiblePage()?.getTag()).toBe("details");

            navRef.current?.pop();
            expect(navRef.current?.getVisiblePage()?.getTag()).toBe("home");
        });
    });
});
