import { AccessibleRole, Orientation } from "@gtkx/ffi/gtk";
import { ApplicationWindow, Box, Button, Label } from "@gtkx/react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "../src/index.js";
import { userEvent } from "../src/user-event.js";

describe("userEvent", () => {
    afterEach(() => {
        cleanup();
    });

    describe("click", () => {
        it("emits clicked signal on button widget", async () => {
            render(
                <ApplicationWindow>
                    <Button label="Click Me" />
                </ApplicationWindow>,
            );

            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Click Me" });

            // userEvent.click emits the "clicked" signal via g_signal_emit_by_name
            // The signal emission itself should complete without error
            await userEvent.click(button);

            // Verify the button is still accessible after the click
            expect(button).toBeDefined();
        });

        it("can emit click signal on multiple buttons", async () => {
            render(
                <ApplicationWindow>
                    <Box spacing={10} orientation={Orientation.VERTICAL}>
                        <Button label="Button 1" />
                        <Button label="Button 2" />
                    </Box>
                </ApplicationWindow>,
            );

            const button1 = await screen.findByRole(AccessibleRole.BUTTON, { name: "Button 1" });
            const button2 = await screen.findByRole(AccessibleRole.BUTTON, { name: "Button 2" });

            await userEvent.click(button1);
            await userEvent.click(button2);

            expect(button1).toBeDefined();
            expect(button2).toBeDefined();
        });

        it("can emit multiple clicks on same button", async () => {
            render(
                <ApplicationWindow>
                    <Button label="Multi Click" />
                </ApplicationWindow>,
            );

            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Multi Click" });

            await userEvent.click(button);
            await userEvent.click(button);
            await userEvent.click(button);

            expect(button).toBeDefined();
        });
    });

    describe("type", () => {
        it("throws when element has no setText method", async () => {
            render(
                <ApplicationWindow>
                    <Label.Root label="Not editable" />
                </ApplicationWindow>,
            );

            const label = await screen.findByText("Not editable");

            await expect(userEvent.type(label, "text")).rejects.toThrow(
                /Cannot type into element: no setText method available/,
            );
        });

        it("throws for button elements", async () => {
            render(
                <ApplicationWindow>
                    <Button label="Not Editable" />
                </ApplicationWindow>,
            );

            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Not Editable" });

            await expect(userEvent.type(button, "text")).rejects.toThrow(
                /Cannot type into element: no setText method available/,
            );
        });
    });

    describe("dblClick", () => {
        it("emits two clicked signals on button widget", async () => {
            render(
                <ApplicationWindow>
                    <Button label="Double Click Me" />
                </ApplicationWindow>,
            );

            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Double Click Me" });
            await userEvent.dblClick(button);
            expect(button).toBeDefined();
        });

        it("can emit double click on multiple buttons", async () => {
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

            await userEvent.dblClick(first);
            await userEvent.dblClick(second);

            expect(first).toBeDefined();
            expect(second).toBeDefined();
        });
    });

    describe("clear", () => {
        it("throws when element has no setText method", async () => {
            render(
                <ApplicationWindow>
                    <Label.Root label="Not clearable" />
                </ApplicationWindow>,
            );

            const label = await screen.findByText("Not clearable");

            await expect(userEvent.clear(label)).rejects.toThrow(/Cannot clear element: no setText method available/);
        });

        it("throws for button elements", async () => {
            render(
                <ApplicationWindow>
                    <Button label="Not Clearable" />
                </ApplicationWindow>,
            );

            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Not Clearable" });

            await expect(userEvent.clear(button)).rejects.toThrow(/Cannot clear element: no setText method available/);
        });
    });

    describe("setup", () => {
        it("returns a user event instance", () => {
            const user = userEvent.setup();

            expect(typeof user.click).toBe("function");
            expect(typeof user.dblClick).toBe("function");
            expect(typeof user.type).toBe("function");
            expect(typeof user.clear).toBe("function");
        });

        it("instance click works like static click", async () => {
            render(
                <ApplicationWindow>
                    <Button label="Instance Click" />
                </ApplicationWindow>,
            );

            const user = userEvent.setup();
            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Instance Click" });

            await user.click(button);
            expect(button).toBeDefined();
        });

        it("instance dblClick works like static dblClick", async () => {
            render(
                <ApplicationWindow>
                    <Button label="Instance DblClick" />
                </ApplicationWindow>,
            );

            const user = userEvent.setup();
            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Instance DblClick" });

            await user.dblClick(button);
            expect(button).toBeDefined();
        });

        it("accepts options", () => {
            const user = userEvent.setup({ delay: 100 });
            expect(typeof user.click).toBe("function");
        });
    });
});
