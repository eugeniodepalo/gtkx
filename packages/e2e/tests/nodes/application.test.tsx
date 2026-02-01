import type * as Gtk from "@gtkx/ffi/gtk";
import { GtkApplicationWindow, x } from "@gtkx/react";
import { render } from "@gtkx/testing";
import { describe, expect, it } from "vitest";

describe("render - Application", () => {
    describe("ApplicationNode", () => {
        it("sets menubar from Menu children", async () => {
            const { baseElement } = await render(
                <>
                    <GtkApplicationWindow defaultWidth={800} defaultHeight={600} />
                    <x.MenuSubmenu label="File">
                        <x.MenuItem id="new" label="New" onActivate={() => {}} />
                        <x.MenuItem id="open" label="Open" onActivate={() => {}} />
                    </x.MenuSubmenu>
                    <x.MenuSubmenu label="Edit">
                        <x.MenuItem id="cut" label="Cut" onActivate={() => {}} />
                    </x.MenuSubmenu>
                </>,
                { wrapper: false },
            );

            const app = baseElement as Gtk.Application;
            expect(app.getMenubar()).not.toBeNull();
        });

        it("clears menubar when Menu is removed", async () => {
            function App({ showMenu }: { showMenu: boolean }) {
                return (
                    <>
                        <GtkApplicationWindow defaultWidth={800} defaultHeight={600} />
                        {showMenu ? (
                            <x.MenuSubmenu label="File">
                                <x.MenuItem id="new" label="New" onActivate={() => {}} />
                            </x.MenuSubmenu>
                        ) : null}
                    </>
                );
            }

            const { baseElement, rerender } = await render(<App showMenu={true} />, { wrapper: false });

            const app = baseElement as Gtk.Application;
            expect(app.getMenubar()).not.toBeNull();

            await rerender(<App showMenu={false} />);
            expect(app.getMenubar()).toBeNull();
        });

        it("updates menubar when items change", async () => {
            function App({ items }: { items: string[] }) {
                return (
                    <>
                        <GtkApplicationWindow defaultWidth={800} defaultHeight={600} />
                        <x.MenuSubmenu label="File">
                            {items.map((label) => (
                                <x.MenuItem key={label} id={label} label={label} onActivate={() => {}} />
                            ))}
                        </x.MenuSubmenu>
                    </>
                );
            }

            const { baseElement, rerender } = await render(<App items={["New", "Open"]} />, { wrapper: false });

            const app = baseElement as Gtk.Application;
            expect(app.getMenubar()).not.toBeNull();

            await rerender(<App items={["New", "Open", "Save"]} />);
            expect(app.getMenubar()).not.toBeNull();
        });
    });
});
