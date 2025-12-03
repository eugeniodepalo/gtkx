import { AccessibleRole, Orientation } from "@gtkx/ffi/gtk";
import { ApplicationWindow, Box, Button, Label } from "@gtkx/react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "../src/index.js";
import {
    findAllByTestId,
    findByTestId,
    getAllByLabelText,
    getAllByRole,
    getAllByTestId,
    getAllByText,
    getByTestId,
    queryAllByLabelText,
    queryAllByRole,
    queryAllByTestId,
    queryAllByText,
    queryByLabelText,
    queryByRole,
    queryByTestId,
    queryByText,
} from "../src/queries.js";

describe("Queries", () => {
    afterEach(() => {
        cleanup();
    });

    describe("findByRole", () => {
        it("finds a button by role", async () => {
            render(
                <ApplicationWindow>
                    <Button label="Click me" />
                </ApplicationWindow>,
            );

            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Click me" });
            expect(button).toBeDefined();
        });

        it("finds a button by role and name", async () => {
            render(
                <ApplicationWindow>
                    <Box spacing={0} orientation={Orientation.VERTICAL}>
                        <Button label="First" />
                        <Button label="Second" />
                    </Box>
                </ApplicationWindow>,
            );

            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Second" });
            expect(button).toBeDefined();
        });

        it("throws when element not found", async () => {
            render(
                <ApplicationWindow>
                    <Label.Root label="No buttons here" />
                </ApplicationWindow>,
            );

            await expect(screen.findByRole(AccessibleRole.BUTTON, { name: "NonExistent" })).rejects.toThrow(
                /Unable to find any elements with role/,
            );
        });
    });

    describe("findByText", () => {
        it("finds element by text content", async () => {
            render(
                <ApplicationWindow>
                    <Label.Root label="Hello World" />
                </ApplicationWindow>,
            );

            const label = await screen.findByText("Hello World");
            expect(label).toBeDefined();
        });

        it("finds element by regex", async () => {
            render(
                <ApplicationWindow>
                    <Label.Root label="Hello World" />
                </ApplicationWindow>,
            );

            const label = await screen.findByText(/Hello/);
            expect(label).toBeDefined();
        });
    });

    describe("findByLabelText", () => {
        it("finds element by label", async () => {
            render(
                <ApplicationWindow>
                    <Button label="Submit" />
                </ApplicationWindow>,
            );

            const button = await screen.findByLabelText("Submit");
            expect(button).toBeDefined();
        });
    });

    describe("render result queries", () => {
        it("returns bound queries from render", async () => {
            const { findByRole, findByText } = render(
                <ApplicationWindow>
                    <Box spacing={0} orientation={Orientation.VERTICAL}>
                        <Button label="Click" />
                        <Label.Root label="Text" />
                    </Box>
                </ApplicationWindow>,
            );

            expect(await findByRole(AccessibleRole.BUTTON, { name: "Click" })).toBeDefined();
            expect(await findByText("Text")).toBeDefined();
        });
    });

    describe("queryByRole", () => {
        it("returns null when element not found with name filter", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Label.Root label="No buttons matching" />
                </ApplicationWindow>,
            );

            const result = queryByRole(container, AccessibleRole.BUTTON, { name: "NonExistent" });
            expect(result).toBeNull();
        });

        it("returns element when found", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Button label="Found" />
                </ApplicationWindow>,
            );

            const result = queryByRole(container, AccessibleRole.BUTTON, { name: "Found" });
            expect(result).toBeDefined();
        });

        it("throws when multiple elements with same name found", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Box spacing={0} orientation={Orientation.VERTICAL}>
                        <Button label="Same" />
                        <Button label="Same" />
                    </Box>
                </ApplicationWindow>,
            );

            expect(() => queryByRole(container, AccessibleRole.BUTTON, { name: "Same" })).toThrow(/Found \d+ elements/);
        });
    });

    describe("queryByText", () => {
        it("returns null when text not found", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Label.Root label="Different" />
                </ApplicationWindow>,
            );

            const result = queryByText(container, "NotFound");
            expect(result).toBeNull();
        });

        it("returns element when found", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Label.Root label="Found Text" />
                </ApplicationWindow>,
            );

            const result = queryByText(container, "Found Text");
            expect(result).toBeDefined();
        });
    });

    describe("queryByLabelText", () => {
        it("returns null when label not found", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Button label="Different" />
                </ApplicationWindow>,
            );

            const result = queryByLabelText(container, "NotFound");
            expect(result).toBeNull();
        });

        it("returns element when found", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Button label="Found Label" />
                </ApplicationWindow>,
            );

            const result = queryByLabelText(container, "Found Label");
            expect(result).toBeDefined();
        });
    });

    describe("getAllByRole", () => {
        it("returns all matching elements with name filter", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Box spacing={0} orientation={Orientation.VERTICAL}>
                        <Button label="Action" />
                        <Button label="Action" />
                        <Button label="Action" />
                        <Button label="Different" />
                    </Box>
                </ApplicationWindow>,
            );

            const buttons = getAllByRole(container, AccessibleRole.BUTTON, { name: "Action" });
            expect(buttons.length).toBe(3);
        });

        it("throws when no elements match name filter", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Button label="Existing" />
                </ApplicationWindow>,
            );

            expect(() => getAllByRole(container, AccessibleRole.BUTTON, { name: "NonExistent" })).toThrow(
                /Unable to find any elements/,
            );
        });
    });

    describe("getAllByText", () => {
        it("returns all matching elements", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Box spacing={0} orientation={Orientation.VERTICAL}>
                        <Label.Root label="Same" />
                        <Label.Root label="Same" />
                    </Box>
                </ApplicationWindow>,
            );

            const labels = getAllByText(container, "Same");
            expect(labels.length).toBe(2);
        });
    });

    describe("getAllByLabelText", () => {
        it("returns all matching elements", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Box spacing={0} orientation={Orientation.VERTICAL}>
                        <Button label="Action" />
                        <Button label="Action" />
                    </Box>
                </ApplicationWindow>,
            );

            const buttons = getAllByLabelText(container, "Action");
            expect(buttons.length).toBe(2);
        });
    });

    describe("queryAllByRole", () => {
        it("returns empty array when no elements match name filter", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Button label="Existing" />
                </ApplicationWindow>,
            );

            const result = queryAllByRole(container, AccessibleRole.BUTTON, { name: "NonExistent" });
            expect(result).toEqual([]);
        });

        it("returns all matching elements with name filter", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Box spacing={0} orientation={Orientation.VERTICAL}>
                        <Button label="Action" />
                        <Button label="Action" />
                        <Button label="Different" />
                    </Box>
                </ApplicationWindow>,
            );

            const result = queryAllByRole(container, AccessibleRole.BUTTON, { name: "Action" });
            expect(result.length).toBe(2);
        });
    });

    describe("queryAllByText", () => {
        it("returns empty array when no elements found", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Label.Root label="Different" />
                </ApplicationWindow>,
            );

            const result = queryAllByText(container, "NotFound");
            expect(result).toEqual([]);
        });
    });

    describe("queryAllByLabelText", () => {
        it("returns empty array when no elements found", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Button label="Different" />
                </ApplicationWindow>,
            );

            const result = queryAllByLabelText(container, "NotFound");
            expect(result).toEqual([]);
        });
    });

    describe("getByTestId", () => {
        it("finds element by test id (widget name)", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Button label="Test" name="test-button" />
                </ApplicationWindow>,
            );

            const button = getByTestId(container, "test-button");
            expect(button).toBeDefined();
        });

        it("throws when test id not found", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Button label="Test" />
                </ApplicationWindow>,
            );

            expect(() => getByTestId(container, "nonexistent")).toThrow(/Unable to find any elements with test id/);
        });
    });

    describe("queryByTestId", () => {
        it("returns null when test id not found", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Button label="Test" />
                </ApplicationWindow>,
            );

            const result = queryByTestId(container, "nonexistent");
            expect(result).toBeNull();
        });

        it("returns element when found", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Button label="Test" name="my-button" />
                </ApplicationWindow>,
            );

            const result = queryByTestId(container, "my-button");
            expect(result).toBeDefined();
        });
    });

    describe("getAllByTestId", () => {
        it("returns all matching elements", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Box spacing={0} orientation={Orientation.VERTICAL}>
                        <Button label="One" name="action-btn" />
                        <Button label="Two" name="action-btn" />
                    </Box>
                </ApplicationWindow>,
            );

            const buttons = getAllByTestId(container, "action-btn");
            expect(buttons.length).toBe(2);
        });
    });

    describe("queryAllByTestId", () => {
        it("returns empty array when no elements found", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Button label="Test" />
                </ApplicationWindow>,
            );

            const result = queryAllByTestId(container, "nonexistent");
            expect(result).toEqual([]);
        });
    });

    describe("findByTestId", () => {
        it("finds element by test id asynchronously", async () => {
            const { container } = render(
                <ApplicationWindow>
                    <Button label="Async" name="async-test" />
                </ApplicationWindow>,
            );

            const button = await findByTestId(container, "async-test");
            expect(button).toBeDefined();
        });
    });

    describe("findAllByTestId", () => {
        it("finds all elements by test id asynchronously", async () => {
            const { container } = render(
                <ApplicationWindow>
                    <Box spacing={0} orientation={Orientation.VERTICAL}>
                        <Button label="One" name="item" />
                        <Button label="Two" name="item" />
                    </Box>
                </ApplicationWindow>,
            );

            const buttons = await findAllByTestId(container, "item");
            expect(buttons.length).toBe(2);
        });
    });

    describe("TextMatchOptions", () => {
        it("supports exact: false for partial matching", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Label.Root label="Hello World" />
                </ApplicationWindow>,
            );

            const result = queryByText(container, "Hello", { exact: false });
            expect(result).toBeDefined();
        });

        it("supports exact: true (default) for exact matching", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Label.Root label="Hello World" />
                </ApplicationWindow>,
            );

            const result = queryByText(container, "Hello", { exact: true });
            expect(result).toBeNull();
        });

        it("supports custom normalizer", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Label.Root label="  Spaced  Text  " />
                </ApplicationWindow>,
            );

            const result = queryByText(container, "Spaced Text", {
                normalizer: (text) => text.trim().replace(/\s+/g, " "),
            });
            expect(result).toBeDefined();
        });

        it("supports regex matching", () => {
            const { container } = render(
                <ApplicationWindow>
                    <Label.Root label="Count: 42" />
                </ApplicationWindow>,
            );

            const result = queryByText(container, /Count: \d+/);
            expect(result).toBeDefined();
        });
    });
});
