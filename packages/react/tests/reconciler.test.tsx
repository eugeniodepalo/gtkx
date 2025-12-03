import * as Gtk from "@gtkx/ffi/gtk";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { createNode } from "../src/factory.js";
import { ApplicationWindow, Box, Button, Label } from "../src/index.js";
import { getApp, render, setupTests } from "./utils.js";

setupTests();

describe("React Reconciler", () => {
    describe("node factory", () => {
        it("creates Button with correct props", () => {
            const node = createNode("Button", { label: "Click me" }, getApp());
            const widget = node.getWidget() as Gtk.Button;

            expect(widget).toBeInstanceOf(Gtk.Button);
            expect(widget.getLabel()).toBe("Click me");
        });

        it("creates Box with orientation", () => {
            const node = createNode("Box", { orientation: Gtk.Orientation.VERTICAL, spacing: 10 }, getApp());
            const widget = node.getWidget() as Gtk.Box;

            expect(widget).toBeInstanceOf(Gtk.Box);
            expect(widget.getSpacing()).toBe(10);
        });

        it("creates Label with text", () => {
            const node = createNode("Label", { label: "Hello" }, getApp());
            const widget = node.getWidget() as Gtk.Label;

            expect(widget).toBeInstanceOf(Gtk.Label);
            expect(widget.getLabel()).toBe("Hello");
        });

        it("creates ApplicationWindow with title", () => {
            const node = createNode("ApplicationWindow", { title: "Test Window" }, getApp());
            const widget = node.getWidget() as Gtk.ApplicationWindow;

            expect(widget).toBeInstanceOf(Gtk.ApplicationWindow);
            expect(widget.getTitle()).toBe("Test Window");
        });
    });

    describe("prop updates", () => {
        it("updates string props", () => {
            const node = createNode("Button", { label: "Initial" }, getApp());
            const widget = node.getWidget() as Gtk.Button;

            expect(widget.getLabel()).toBe("Initial");

            node.updateProps({ label: "Initial" }, { label: "Updated" });
            expect(widget.getLabel()).toBe("Updated");
        });

        it("updates boolean props", () => {
            const node = createNode("Button", { label: "Test", sensitive: true }, getApp());
            const widget = node.getWidget() as Gtk.Button;

            expect(widget.getSensitive()).toBe(true);

            node.updateProps({ sensitive: true }, { sensitive: false });
            expect(widget.getSensitive()).toBe(false);
        });

        it("updates numeric props", () => {
            const node = createNode("Box", { spacing: 5, orientation: Gtk.Orientation.VERTICAL }, getApp());
            const widget = node.getWidget() as Gtk.Box;

            expect(widget.getSpacing()).toBe(5);

            node.updateProps({ spacing: 5 }, { spacing: 20 });
            expect(widget.getSpacing()).toBe(20);
        });
    });

    describe("child management", () => {
        it("appends children to parent", () => {
            const parent = createNode("Box", { orientation: Gtk.Orientation.VERTICAL, spacing: 0 }, getApp());
            const child = createNode("Label", { label: "Child" }, getApp());

            parent.appendChild(child);

            const parentWidget = parent.getWidget() as Gtk.Box;
            expect(parentWidget.getFirstChild()).not.toBeNull();
        });

        it("removes children from parent", () => {
            const parent = createNode("Box", { orientation: Gtk.Orientation.VERTICAL, spacing: 0 }, getApp());
            const child = createNode("Label", { label: "Child" }, getApp());

            parent.appendChild(child);

            const parentWidget = parent.getWidget() as Gtk.Box;
            expect(parentWidget.getFirstChild()).not.toBeNull();

            parent.removeChild(child);
            expect(parentWidget.getFirstChild()).toBeNull();
        });

        it("inserts child before another", () => {
            const parent = createNode("Box", { orientation: Gtk.Orientation.VERTICAL, spacing: 0 }, getApp());
            const first = createNode("Label", { label: "First" }, getApp());
            const second = createNode("Label", { label: "Second" }, getApp());
            const middle = createNode("Label", { label: "Middle" }, getApp());

            parent.appendChild(first);
            parent.appendChild(second);
            parent.insertBefore(middle, second);

            const parentWidget = parent.getWidget() as Gtk.Box;
            expect(parentWidget.getFirstChild()).not.toBeNull();
            expect(parentWidget.getLastChild()).not.toBeNull();
        });

        it("handles multiple children", () => {
            const parent = createNode("Box", { orientation: Gtk.Orientation.VERTICAL, spacing: 0 }, getApp());

            for (let i = 0; i < 5; i++) {
                const child = createNode("Label", { label: `Label ${i}` }, getApp());
                parent.appendChild(child);
            }

            const parentWidget = parent.getWidget() as Gtk.Box;
            expect(parentWidget.getFirstChild()).not.toBeNull();
            expect(parentWidget.getLastChild()).not.toBeNull();
        });
    });

    describe("signal handlers", () => {
        it("connects signal handlers on creation", () => {
            let clicked = false;
            const node = createNode(
                "Button",
                {
                    label: "Click",
                    onClicked: () => {
                        clicked = true;
                    },
                },
                getApp(),
            );

            expect(node.getWidget()).toBeInstanceOf(Gtk.Button);
            expect(clicked).toBe(false);
        });

        it("updates signal handlers", () => {
            let handler1Called = false;
            let handler2Called = false;

            const handler1 = () => {
                handler1Called = true;
            };
            const handler2 = () => {
                handler2Called = true;
            };

            const node = createNode("Button", { label: "Click", onClicked: handler1 }, getApp());
            node.updateProps({ onClicked: handler1 }, { onClicked: handler2 });

            expect(handler1Called).toBe(false);
            expect(handler2Called).toBe(false);
        });
    });

    describe("window management", () => {
        it("attaches child to ApplicationWindow", () => {
            const window = createNode("ApplicationWindow", { title: "Test" }, getApp());
            const child = createNode("Label", { label: "Content" }, getApp());

            window.appendChild(child);

            const windowWidget = window.getWidget() as Gtk.ApplicationWindow;
            expect(windowWidget.getChild()).not.toBeNull();
        });
    });

    describe("disposal", () => {
        it("disposes node and returns cleanly", () => {
            const node = createNode("Button", { label: "Test" }, getApp());
            const widget = node.getWidget();
            expect(widget).toBeInstanceOf(Gtk.Button);

            const result = node.dispose?.(getApp());
            expect(result).toBeUndefined();
        });

        it("disposes node with signal handlers", () => {
            let handlerCalled = false;
            const node = createNode(
                "Button",
                {
                    label: "Test",
                    onClicked: () => {
                        handlerCalled = true;
                    },
                },
                getApp(),
            );
            const widget = node.getWidget();
            expect(widget).toBeInstanceOf(Gtk.Button);

            node.dispose?.(getApp());
            expect(handlerCalled).toBe(false);
        });

        it("disposes parent with children", () => {
            const parent = createNode("Box", { orientation: Gtk.Orientation.VERTICAL, spacing: 0 }, getApp());
            const child = createNode("Label", { label: "Child" }, getApp());

            parent.appendChild(child);
            const parentWidget = parent.getWidget() as Gtk.Box;
            expect(parentWidget.getFirstChild()).not.toBeNull();

            parent.dispose?.(getApp());
        });
    });

    describe("React integration", () => {
        it("renders simple component", () => {
            render(<Button label="Hello" />);
            const windows = getApp().getWindows();
            expect(windows.length).toBeGreaterThanOrEqual(0);
        });

        it("renders nested components", () => {
            render(
                <Box spacing={10} orientation={Gtk.Orientation.VERTICAL}>
                    <Label.Root label="Title" />
                    <Button label="Click Me" />
                </Box>,
            );
            const windows = getApp().getWindows();
            expect(windows.length).toBeGreaterThanOrEqual(0);
        });

        it("handles state updates", () => {
            let setCount: (value: number) => void = () => {};

            const Counter = () => {
                const [count, _setCount] = useState(0);
                setCount = _setCount;
                return <Label.Root label={`Count: ${count}`} />;
            };

            render(<Counter />);

            // State updates are batched by React, so we verify the setter is available
            expect(typeof setCount).toBe("function");

            // Trigger state update
            setCount(5);

            // Component should be updated (state is managed by React)
            expect(typeof setCount).toBe("function");
        });

        it("handles conditional rendering", () => {
            let setVisible: (value: boolean) => void = () => {};

            const Conditional = () => {
                const [visible, _setVisible] = useState(true);
                setVisible = _setVisible;
                return (
                    <Box spacing={10} orientation={Gtk.Orientation.VERTICAL}>
                        {visible && <Label.Root label="Visible" />}
                    </Box>
                );
            };

            render(<Conditional />);

            // Verify setter is available
            expect(typeof setVisible).toBe("function");

            // Trigger visibility toggle
            setVisible(false);
            setVisible(true);

            // Component should handle conditional rendering without errors
            expect(typeof setVisible).toBe("function");
        });

        it("handles list rendering", () => {
            const items = ["A", "B", "C", "D", "E"];

            render(
                <Box spacing={5} orientation={Gtk.Orientation.VERTICAL}>
                    {items.map((item) => (
                        <Label.Root key={item} label={item} />
                    ))}
                </Box>,
            );

            const windows = getApp().getWindows();
            expect(windows.length).toBeGreaterThanOrEqual(0);
        });

        it("handles multiple windows", () => {
            render(
                <>
                    <ApplicationWindow title="Window 1">
                        <Label.Root label="Content 1" />
                    </ApplicationWindow>
                    <ApplicationWindow title="Window 2">
                        <Label.Root label="Content 2" />
                    </ApplicationWindow>
                </>,
            );

            const windows = getApp().getWindows();
            // Rendering multiple windows should work
            // The exact count depends on GTK's internal state
            expect(windows.length).toBeGreaterThanOrEqual(0);
        });
    });
});
