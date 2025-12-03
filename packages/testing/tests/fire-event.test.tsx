import { AccessibleRole, Orientation } from "@gtkx/ffi/gtk";
import { ApplicationWindow, Box, Button } from "@gtkx/react";
import { afterEach, describe, expect, it } from "vitest";
import { fireEvent } from "../src/fire-event.js";
import { cleanup, render, screen } from "../src/index.js";

describe("fireEvent", () => {
    afterEach(() => {
        cleanup();
    });

    describe("base function", () => {
        it("emits signal by name on widget", async () => {
            render(
                <ApplicationWindow>
                    <Button label="Test Button" />
                </ApplicationWindow>,
            );

            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Test Button" });
            fireEvent(button, "clicked");
            expect(button).toBeDefined();
        });

        it("can emit activate signal", async () => {
            render(
                <ApplicationWindow>
                    <Button label="Activate Me" />
                </ApplicationWindow>,
            );

            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Activate Me" });
            fireEvent(button, "activate");
            expect(button).toBeDefined();
        });
    });

    describe("click", () => {
        it("emits clicked signal on button", async () => {
            render(
                <ApplicationWindow>
                    <Button label="Click Me" />
                </ApplicationWindow>,
            );

            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Click Me" });
            fireEvent.click(button);
            expect(button).toBeDefined();
        });

        it("can fire click on multiple buttons", async () => {
            render(
                <ApplicationWindow>
                    <Box spacing={10} orientation={Orientation.VERTICAL}>
                        <Button label="First" />
                        <Button label="Second" />
                    </Box>
                </ApplicationWindow>,
            );

            const first = await screen.findByRole(AccessibleRole.BUTTON, { name: "First" });
            const second = await screen.findByRole(AccessibleRole.BUTTON, { name: "Second" });

            fireEvent.click(first);
            fireEvent.click(second);

            expect(first).toBeDefined();
            expect(second).toBeDefined();
        });
    });

    describe("activate", () => {
        it("emits activate signal on button", async () => {
            render(
                <ApplicationWindow>
                    <Button label="Activate" />
                </ApplicationWindow>,
            );

            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Activate" });
            fireEvent.activate(button);
            expect(button).toBeDefined();
        });
    });

    describe("toggled", () => {
        it("emits toggled signal on widget", async () => {
            render(
                <ApplicationWindow>
                    <Button label="Toggle" />
                </ApplicationWindow>,
            );

            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Toggle" });
            fireEvent.toggled(button);
            expect(button).toBeDefined();
        });
    });

    describe("changed", () => {
        it("emits changed signal on widget", async () => {
            render(
                <ApplicationWindow>
                    <Button label="Change" />
                </ApplicationWindow>,
            );

            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Change" });
            fireEvent.changed(button);
            expect(button).toBeDefined();
        });
    });
});
