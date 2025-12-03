import type * as Gtk from "@gtkx/ffi/gtk";
import { AccessibleRole, Orientation } from "@gtkx/ffi/gtk";
import { ApplicationWindow, Box, Button, Label } from "@gtkx/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "../src/index.js";

describe("render", () => {
    afterEach(() => {
        cleanup();
    });

    describe("return value", () => {
        it("returns an object with container", () => {
            const result = render(
                <ApplicationWindow>
                    <Label.Root label="Test" />
                </ApplicationWindow>,
            );

            expect(result.container).toBeDefined();
            expect(typeof result.container.getActiveWindow).toBe("function");
        });

        it("returns query functions", () => {
            const result = render(
                <ApplicationWindow>
                    <Label.Root label="Test" />
                </ApplicationWindow>,
            );

            expect(typeof result.getByRole).toBe("function");
            expect(typeof result.getByText).toBe("function");
            expect(typeof result.getByLabelText).toBe("function");
            expect(typeof result.findByRole).toBe("function");
            expect(typeof result.findByText).toBe("function");
            expect(typeof result.findByLabelText).toBe("function");
        });

        it("returns unmount function", () => {
            const result = render(
                <ApplicationWindow>
                    <Label.Root label="Test" />
                </ApplicationWindow>,
            );

            expect(typeof result.unmount).toBe("function");
        });

        it("returns rerender function", () => {
            const result = render(
                <ApplicationWindow>
                    <Label.Root label="Test" />
                </ApplicationWindow>,
            );

            expect(typeof result.rerender).toBe("function");
        });

        it("returns debug function", () => {
            const result = render(
                <ApplicationWindow>
                    <Label.Root label="Test" />
                </ApplicationWindow>,
            );

            expect(typeof result.debug).toBe("function");
        });
    });

    describe("bound queries", () => {
        it("getByRole finds element", () => {
            const { getByRole } = render(
                <ApplicationWindow>
                    <Button label="Click me" />
                </ApplicationWindow>,
            );

            const button = getByRole(AccessibleRole.BUTTON, { name: "Click me" });
            expect(button).toBeDefined();
        });

        it("getByText finds element", () => {
            const { getByText } = render(
                <ApplicationWindow>
                    <Label.Root label="Hello World" />
                </ApplicationWindow>,
            );

            const label = getByText("Hello World");
            expect(label).toBeDefined();
        });

        it("getByLabelText finds element", () => {
            const { getByLabelText } = render(
                <ApplicationWindow>
                    <Button label="Submit" />
                </ApplicationWindow>,
            );

            const button = getByLabelText("Submit");
            expect(button).toBeDefined();
        });

        it("findByRole finds element asynchronously", async () => {
            const { findByRole } = render(
                <ApplicationWindow>
                    <Button label="Async" />
                </ApplicationWindow>,
            );

            const button = await findByRole(AccessibleRole.BUTTON, { name: "Async" });
            expect(button).toBeDefined();
        });

        it("findByText finds element asynchronously", async () => {
            const { findByText } = render(
                <ApplicationWindow>
                    <Label.Root label="Async Text" />
                </ApplicationWindow>,
            );

            const label = await findByText("Async Text");
            expect(label).toBeDefined();
        });

        it("findByLabelText finds element asynchronously", async () => {
            const { findByLabelText } = render(
                <ApplicationWindow>
                    <Button label="Async Label" />
                </ApplicationWindow>,
            );

            const button = await findByLabelText("Async Label");
            expect(button).toBeDefined();
        });
    });

    describe("rerender", () => {
        it("updates the rendered content", async () => {
            const { rerender, findByText } = render(
                <ApplicationWindow>
                    <Label.Root label="Initial" />
                </ApplicationWindow>,
            );

            await findByText("Initial");

            rerender(
                <ApplicationWindow>
                    <Label.Root label="Updated" />
                </ApplicationWindow>,
            );

            const label = await findByText("Updated");
            expect(label).toBeDefined();
        });

        it("preserves state when rerendering same component", async () => {
            let setCount: (n: number) => void = () => {};

            const Counter = () => {
                const [count, _setCount] = useState(0);
                setCount = _setCount;
                return <Label.Root label={`Count: ${count}`} />;
            };

            const { findByText, rerender } = render(
                <ApplicationWindow>
                    <Counter />
                </ApplicationWindow>,
            );

            await findByText("Count: 0");
            setCount(5);
            await findByText("Count: 5");

            rerender(
                <ApplicationWindow>
                    <Counter />
                </ApplicationWindow>,
            );

            await findByText("Count: 5");
        });
    });

    describe("unmount", () => {
        it("removes rendered content", async () => {
            const { unmount, findByText } = render(
                <ApplicationWindow>
                    <Label.Root label="Will be removed" />
                </ApplicationWindow>,
            );

            await findByText("Will be removed");

            unmount();

            await expect(findByText("Will be removed")).rejects.toThrow();
        });
    });

    describe("container", () => {
        it("provides access to application", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Label.Root label="Test" />
                </ApplicationWindow>,
            );

            const windows = container.getWindows();
            expect(windows.length).toBeGreaterThan(0);
        });

        it("provides access to active window", () => {
            const { container } = render(
                <ApplicationWindow title="Test Window">
                    <Label.Root label="Test" />
                </ApplicationWindow>,
            );

            const activeWindow = container.getActiveWindow();
            expect(activeWindow).not.toBeNull();
            expect((activeWindow as Gtk.ApplicationWindow).getTitle()).toBe("Test Window");
        });
    });
});

describe("cleanup", () => {
    it("removes windows after cleanup", async () => {
        const { container, findByText } = render(
            <ApplicationWindow>
                <Label.Root label="Before cleanup" />
            </ApplicationWindow>,
        );

        await findByText("Before cleanup");
        const windowsBefore = container.getWindows();
        expect(windowsBefore.length).toBeGreaterThan(0);

        cleanup();

        const windowsAfter = container.getWindows();
        expect(windowsAfter.length).toBe(0);
    });

    it("allows rendering again after cleanup", async () => {
        render(
            <ApplicationWindow>
                <Label.Root label="First render" />
            </ApplicationWindow>,
        );

        cleanup();

        const { findByText } = render(
            <ApplicationWindow>
                <Label.Root label="Second render" />
            </ApplicationWindow>,
        );

        const label = await findByText("Second render");
        expect(label).toBeDefined();
    });
});

describe("multiple renders", () => {
    afterEach(() => {
        cleanup();
    });

    it("subsequent renders update the same container", async () => {
        const result1 = render(
            <ApplicationWindow>
                <Label.Root label="First" />
            </ApplicationWindow>,
        );

        const result2 = render(
            <ApplicationWindow>
                <Label.Root label="Second" />
            </ApplicationWindow>,
        );

        expect(result1.container).toBe(result2.container);
    });

    it("can render complex nested components", async () => {
        const { findByRole, findByText } = render(
            <ApplicationWindow>
                <Box spacing={10} orientation={Orientation.VERTICAL}>
                    <Label.Root label="Header" />
                    <Box spacing={5} orientation={Orientation.HORIZONTAL}>
                        <Button label="Action 1" />
                        <Button label="Action 2" />
                    </Box>
                    <Label.Root label="Footer" />
                </Box>
            </ApplicationWindow>,
        );

        await findByText("Header");
        await findByText("Footer");
        await findByRole(AccessibleRole.BUTTON, { name: "Action 1" });
        await findByRole(AccessibleRole.BUTTON, { name: "Action 2" });
    });
});
