import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkShortcutController, x } from "@gtkx/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "../src/index.js";

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

describe("GtkShortcutController", () => {
    it("renders without errors", async () => {
        const handleActivate = vi.fn();

        await render(
            <GtkBox>
                <GtkShortcutController>
                    <x.Shortcut trigger="<Control>s" onActivate={handleActivate} />
                </GtkShortcutController>
                <GtkButton label="Test" />
            </GtkBox>,
        );

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Test" });
        expect(button).toBeDefined();
    });

    it("attaches ShortcutController to parent widget", async () => {
        await render(
            <GtkBox>
                <GtkShortcutController>
                    <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                </GtkShortcutController>
                <GtkButton label="Test" />
            </GtkBox>,
        );

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Test" });
        const box = button.getParent() as Gtk.Box;
        const controller = getShortcutController(box);

        expect(controller).not.toBeNull();
        expect(controller).toBeInstanceOf(Gtk.ShortcutController);
    });

    it("registers multiple shortcuts", async () => {
        await render(
            <GtkBox>
                <GtkShortcutController>
                    <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                    <x.Shortcut trigger="<Control>o" onActivate={() => {}} />
                    <x.Shortcut trigger="<Control>n" onActivate={() => {}} />
                </GtkShortcutController>
                <GtkButton label="Test" />
            </GtkBox>,
        );

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Test" });
        const box = button.getParent() as Gtk.Box;
        const controller = getShortcutController(box);

        expect(controller).not.toBeNull();
    });

    it("sets scope to LOCAL by default", async () => {
        await render(
            <GtkBox>
                <GtkShortcutController>
                    <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                </GtkShortcutController>
                <GtkButton label="Test" />
            </GtkBox>,
        );

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Test" });
        const box = button.getParent() as Gtk.Box;
        const controller = getShortcutController(box);

        expect(controller?.getScope()).toBe(Gtk.ShortcutScope.LOCAL);
    });

    it("sets scope to GLOBAL when specified", async () => {
        await render(
            <GtkBox>
                <GtkShortcutController scope={Gtk.ShortcutScope.GLOBAL}>
                    <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                </GtkShortcutController>
                <GtkButton label="Test" />
            </GtkBox>,
        );

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Test" });
        const box = button.getParent() as Gtk.Box;
        const controller = getShortcutController(box);

        expect(controller?.getScope()).toBe(Gtk.ShortcutScope.GLOBAL);
    });

    it("sets scope to MANAGED when specified", async () => {
        await render(
            <GtkBox>
                <GtkShortcutController scope={Gtk.ShortcutScope.MANAGED}>
                    <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                </GtkShortcutController>
                <GtkButton label="Test" />
            </GtkBox>,
        );

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Test" });
        const box = button.getParent() as Gtk.Box;
        const controller = getShortcutController(box);

        expect(controller?.getScope()).toBe(Gtk.ShortcutScope.MANAGED);
    });

    it("removes controller on unmount", async () => {
        const TestComponent = ({ showController }: { showController: boolean }) => (
            <GtkBox>
                {showController && (
                    <GtkShortcutController>
                        <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                    </GtkShortcutController>
                )}
                <GtkButton label="Test" />
            </GtkBox>
        );

        const { rerender } = await render(<TestComponent showController={true} />);

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Test" });
        const box = button.getParent() as Gtk.Box;
        expect(getShortcutController(box)).not.toBeNull();

        await rerender(<TestComponent showController={false} />);

        expect(getShortcutController(box)).toBeNull();
    });

    it("updates scope on prop change", async () => {
        const TestComponent = ({ scope }: { scope: Gtk.ShortcutScope }) => (
            <GtkBox>
                <GtkShortcutController scope={scope}>
                    <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                </GtkShortcutController>
                <GtkButton label="Test" />
            </GtkBox>
        );

        const { rerender } = await render(<TestComponent scope={Gtk.ShortcutScope.LOCAL} />);

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Test" });
        const box = button.getParent() as Gtk.Box;
        let controller = getShortcutController(box);
        expect(controller?.getScope()).toBe(Gtk.ShortcutScope.LOCAL);

        await rerender(<TestComponent scope={Gtk.ShortcutScope.GLOBAL} />);

        controller = getShortcutController(box);
        expect(controller?.getScope()).toBe(Gtk.ShortcutScope.GLOBAL);
    });

    it("works alongside regular widget children", async () => {
        await render(
            <GtkBox>
                <GtkShortcutController>
                    <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                </GtkShortcutController>
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

describe("x.Shortcut", () => {
    it("accepts single trigger string", async () => {
        await render(
            <GtkBox>
                <GtkShortcutController>
                    <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                </GtkShortcutController>
                <GtkButton label="Test" />
            </GtkBox>,
        );

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Test" });
        const box = button.getParent() as Gtk.Box;
        const controller = getShortcutController(box);

        expect(controller).not.toBeNull();
    });

    it("accepts array of triggers", async () => {
        await render(
            <GtkBox>
                <GtkShortcutController>
                    <x.Shortcut trigger={["F5", "<Control>r"]} onActivate={() => {}} />
                </GtkShortcutController>
                <GtkButton label="Test" />
            </GtkBox>,
        );

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Test" });
        const box = button.getParent() as Gtk.Box;
        const controller = getShortcutController(box);

        expect(controller).not.toBeNull();
    });

    it("updates when trigger prop changes", async () => {
        const TestComponent = ({ trigger }: { trigger: string }) => (
            <GtkBox>
                <GtkShortcutController>
                    <x.Shortcut trigger={trigger} onActivate={() => {}} />
                </GtkShortcutController>
                <GtkButton label="Test" />
            </GtkBox>
        );

        const { rerender } = await render(<TestComponent trigger="<Control>s" />);

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Test" });
        const box = button.getParent() as Gtk.Box;
        expect(getShortcutController(box)).not.toBeNull();

        await rerender(<TestComponent trigger="<Control>o" />);

        expect(getShortcutController(box)).not.toBeNull();
    });

    it("can be dynamically added", async () => {
        const TestComponent = ({ showSecond }: { showSecond: boolean }) => (
            <GtkBox>
                <GtkShortcutController>
                    <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                    {showSecond && <x.Shortcut trigger="<Control>o" onActivate={() => {}} />}
                </GtkShortcutController>
                <GtkButton label="Test" />
            </GtkBox>
        );

        const { rerender } = await render(<TestComponent showSecond={false} />);

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Test" });
        const box = button.getParent() as Gtk.Box;
        expect(getShortcutController(box)).not.toBeNull();

        await rerender(<TestComponent showSecond={true} />);

        expect(getShortcutController(box)).not.toBeNull();
    });

    it("can be dynamically removed", async () => {
        const TestComponent = ({ showSecond }: { showSecond: boolean }) => (
            <GtkBox>
                <GtkShortcutController>
                    <x.Shortcut trigger="<Control>s" onActivate={() => {}} />
                    {showSecond && <x.Shortcut trigger="<Control>o" onActivate={() => {}} />}
                </GtkShortcutController>
                <GtkButton label="Test" />
            </GtkBox>
        );

        const { rerender } = await render(<TestComponent showSecond={true} />);

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Test" });
        const box = button.getParent() as Gtk.Box;
        expect(getShortcutController(box)).not.toBeNull();

        await rerender(<TestComponent showSecond={false} />);

        expect(getShortcutController(box)).not.toBeNull();
    });
});

describe("x.Shortcut disabled prop", () => {
    it("accepts disabled prop", async () => {
        await render(
            <GtkBox>
                <GtkShortcutController>
                    <x.Shortcut trigger="<Control>s" onActivate={() => {}} disabled />
                </GtkShortcutController>
                <GtkButton label="Test" />
            </GtkBox>,
        );

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Test" });
        const box = button.getParent() as Gtk.Box;
        expect(getShortcutController(box)).not.toBeNull();
    });

    it("updates when disabled prop changes", async () => {
        const TestComponent = ({ disabled }: { disabled: boolean }) => (
            <GtkBox>
                <GtkShortcutController>
                    <x.Shortcut trigger="<Control>s" onActivate={() => {}} disabled={disabled} />
                </GtkShortcutController>
                <GtkButton label="Test" />
            </GtkBox>
        );

        const { rerender } = await render(<TestComponent disabled={false} />);

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Test" });
        const box = button.getParent() as Gtk.Box;
        expect(getShortcutController(box)).not.toBeNull();

        await rerender(<TestComponent disabled={true} />);

        expect(getShortcutController(box)).not.toBeNull();

        await rerender(<TestComponent disabled={false} />);

        expect(getShortcutController(box)).not.toBeNull();
    });
});

describe("GtkShortcutController with state updates", () => {
    it("updates callback when onActivate changes", async () => {
        const TestComponent = () => {
            const [count, setCount] = useState(0);

            return (
                <GtkBox>
                    <GtkShortcutController>
                        <x.Shortcut trigger="<Control>s" onActivate={() => setCount((c) => c + 1)} />
                    </GtkShortcutController>
                    <GtkButton label={`Count: ${count}`} />
                </GtkBox>
            );
        };

        await render(<TestComponent />);

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Count: 0" });
        expect(button).toBeDefined();
    });
});
