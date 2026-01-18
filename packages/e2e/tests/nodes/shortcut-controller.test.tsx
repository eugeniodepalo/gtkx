import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, x } from "@gtkx/react";
import { render, screen } from "@gtkx/testing";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

const getShortcutController = (widget: Gtk.Widget): Gtk.ShortcutController | null => {
    const controllers = widget.observeControllers();
    const nItems = controllers.getNItems();

    for (let i = 0; i < nItems; i++) {
        const controller = controllers.getObject(i);
        if (controller instanceof Gtk.ShortcutController) {
            return controller as Gtk.ShortcutController;
        }
    }

    return null;
};

describe("render - ShortcutController", () => {
    describe("ShortcutControllerNode", () => {
        it("attaches controller to parent widget", async () => {
            const boxRef = createRef<Gtk.Box>();

            await render(
                <GtkBox ref={boxRef}>
                    <x.ShortcutController>
                        <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                    </x.ShortcutController>
                    <GtkButton label="Test" />
                </GtkBox>,
            );

            expect(boxRef.current).not.toBeNull();
            const controller = getShortcutController(boxRef.current as Gtk.Box);
            expect(controller).not.toBeNull();
            expect(controller).toBeInstanceOf(Gtk.ShortcutController);
        });

        it("sets LOCAL scope by default", async () => {
            const boxRef = createRef<Gtk.Box>();

            await render(
                <GtkBox ref={boxRef}>
                    <x.ShortcutController>
                        <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                    </x.ShortcutController>
                </GtkBox>,
            );

            const controller = getShortcutController(boxRef.current as Gtk.Box);
            expect(controller?.getScope()).toBe(Gtk.ShortcutScope.LOCAL);
        });

        it("sets GLOBAL scope when specified", async () => {
            const boxRef = createRef<Gtk.Box>();

            await render(
                <GtkBox ref={boxRef}>
                    <x.ShortcutController scope={Gtk.ShortcutScope.GLOBAL}>
                        <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                    </x.ShortcutController>
                </GtkBox>,
            );

            const controller = getShortcutController(boxRef.current as Gtk.Box);
            expect(controller?.getScope()).toBe(Gtk.ShortcutScope.GLOBAL);
        });

        it("sets MANAGED scope when specified", async () => {
            const boxRef = createRef<Gtk.Box>();

            await render(
                <GtkBox ref={boxRef}>
                    <x.ShortcutController scope={Gtk.ShortcutScope.MANAGED}>
                        <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                    </x.ShortcutController>
                </GtkBox>,
            );

            const controller = getShortcutController(boxRef.current as Gtk.Box);
            expect(controller?.getScope()).toBe(Gtk.ShortcutScope.MANAGED);
        });

        it("updates scope when prop changes", async () => {
            const boxRef = createRef<Gtk.Box>();

            function App({ scope }: { scope: Gtk.ShortcutScope }) {
                return (
                    <GtkBox ref={boxRef}>
                        <x.ShortcutController scope={scope}>
                            <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                        </x.ShortcutController>
                    </GtkBox>
                );
            }

            await render(<App scope={Gtk.ShortcutScope.LOCAL} />);
            let controller = getShortcutController(boxRef.current as Gtk.Box);
            expect(controller?.getScope()).toBe(Gtk.ShortcutScope.LOCAL);

            await render(<App scope={Gtk.ShortcutScope.GLOBAL} />);
            controller = getShortcutController(boxRef.current as Gtk.Box);
            expect(controller?.getScope()).toBe(Gtk.ShortcutScope.GLOBAL);
        });

        it("removes controller on unmount", async () => {
            const boxRef = createRef<Gtk.Box>();

            function App({ showController }: { showController: boolean }) {
                return (
                    <GtkBox ref={boxRef}>
                        {showController && (
                            <x.ShortcutController>
                                <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                            </x.ShortcutController>
                        )}
                        <GtkButton label="Test" />
                    </GtkBox>
                );
            }

            await render(<App showController={true} />);
            expect(getShortcutController(boxRef.current as Gtk.Box)).not.toBeNull();

            await render(<App showController={false} />);
            expect(getShortcutController(boxRef.current as Gtk.Box)).toBeNull();
        });

        it("works alongside widget children", async () => {
            await render(
                <GtkBox>
                    <x.ShortcutController>
                        <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                    </x.ShortcutController>
                    <GtkButton label="First" />
                    <GtkButton label="Second" />
                </GtkBox>,
            );

            const first = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "First" });
            const second = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Second" });

            expect(first).toBeDefined();
            expect(second).toBeDefined();
        });
    });

    describe("ShortcutNode", () => {
        it("registers shortcut with single trigger", async () => {
            const boxRef = createRef<Gtk.Box>();

            await render(
                <GtkBox ref={boxRef}>
                    <x.ShortcutController>
                        <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                    </x.ShortcutController>
                </GtkBox>,
            );

            const controller = getShortcutController(boxRef.current as Gtk.Box);
            expect(controller).not.toBeNull();
        });

        it("registers shortcut with array of triggers", async () => {
            const boxRef = createRef<Gtk.Box>();

            await render(
                <GtkBox ref={boxRef}>
                    <x.ShortcutController>
                        <x.Shortcut trigger={["F5", "<Control>r"]} onActivate={() => {}} />
                    </x.ShortcutController>
                </GtkBox>,
            );

            const controller = getShortcutController(boxRef.current as Gtk.Box);
            expect(controller).not.toBeNull();
        });

        it("registers multiple shortcuts", async () => {
            const boxRef = createRef<Gtk.Box>();

            await render(
                <GtkBox ref={boxRef}>
                    <x.ShortcutController>
                        <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                        <x.Shortcut trigger="<Control>o" onActivate={() => {}} />
                        <x.Shortcut trigger="<Control>n" onActivate={() => {}} />
                    </x.ShortcutController>
                </GtkBox>,
            );

            const controller = getShortcutController(boxRef.current as Gtk.Box);
            expect(controller).not.toBeNull();
        });

        it("updates trigger when prop changes", async () => {
            const boxRef = createRef<Gtk.Box>();

            function App({ trigger }: { trigger: string }) {
                return (
                    <GtkBox ref={boxRef}>
                        <x.ShortcutController>
                            <x.Shortcut trigger={trigger} onActivate={() => {}} />
                        </x.ShortcutController>
                    </GtkBox>
                );
            }

            await render(<App trigger="<Control>s" />);
            expect(getShortcutController(boxRef.current as Gtk.Box)).not.toBeNull();

            await render(<App trigger="<Control>o" />);
            expect(getShortcutController(boxRef.current as Gtk.Box)).not.toBeNull();
        });

        it("dynamically adds shortcuts", async () => {
            const boxRef = createRef<Gtk.Box>();

            function App({ showSecond }: { showSecond: boolean }) {
                return (
                    <GtkBox ref={boxRef}>
                        <x.ShortcutController>
                            <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                            {showSecond && <x.Shortcut trigger="<Control>o" onActivate={() => {}} />}
                        </x.ShortcutController>
                    </GtkBox>
                );
            }

            await render(<App showSecond={false} />);
            expect(getShortcutController(boxRef.current as Gtk.Box)).not.toBeNull();

            await render(<App showSecond={true} />);
            expect(getShortcutController(boxRef.current as Gtk.Box)).not.toBeNull();
        });

        it("dynamically removes shortcuts", async () => {
            const boxRef = createRef<Gtk.Box>();

            function App({ showSecond }: { showSecond: boolean }) {
                return (
                    <GtkBox ref={boxRef}>
                        <x.ShortcutController>
                            <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                            {showSecond && <x.Shortcut trigger="<Control>o" onActivate={() => {}} />}
                        </x.ShortcutController>
                    </GtkBox>
                );
            }

            await render(<App showSecond={true} />);
            expect(getShortcutController(boxRef.current as Gtk.Box)).not.toBeNull();

            await render(<App showSecond={false} />);
            expect(getShortcutController(boxRef.current as Gtk.Box)).not.toBeNull();
        });
    });

    describe("disabled prop", () => {
        it("accepts disabled prop", async () => {
            const boxRef = createRef<Gtk.Box>();

            await render(
                <GtkBox ref={boxRef}>
                    <x.ShortcutController>
                        <x.Shortcut trigger="<Control>s" onActivate={() => {}} disabled />
                    </x.ShortcutController>
                </GtkBox>,
            );

            const controller = getShortcutController(boxRef.current as Gtk.Box);
            expect(controller).not.toBeNull();
        });

        it("updates when disabled prop changes", async () => {
            const boxRef = createRef<Gtk.Box>();

            function App({ disabled }: { disabled: boolean }) {
                return (
                    <GtkBox ref={boxRef}>
                        <x.ShortcutController>
                            <x.Shortcut trigger="<Control>s" onActivate={() => {}} disabled={disabled} />
                        </x.ShortcutController>
                    </GtkBox>
                );
            }

            await render(<App disabled={false} />);
            expect(getShortcutController(boxRef.current as Gtk.Box)).not.toBeNull();

            await render(<App disabled={true} />);
            expect(getShortcutController(boxRef.current as Gtk.Box)).not.toBeNull();

            await render(<App disabled={false} />);
            expect(getShortcutController(boxRef.current as Gtk.Box)).not.toBeNull();
        });
    });
});
