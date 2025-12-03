import { AccessibleRole, Orientation } from "@gtkx/ffi/gtk";
import { ApplicationWindow, Box, Button, Label } from "@gtkx/react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "../src/index.js";
import { screen, setScreenRoot } from "../src/screen.js";

describe("screen", () => {
    afterEach(() => {
        cleanup();
    });

    describe("before render", () => {
        it("getByRole throws when no render has been performed", () => {
            setScreenRoot(null);

            expect(() => screen.getByRole(AccessibleRole.BUTTON)).toThrow(
                /No render has been performed. Call render\(\) before using screen queries/,
            );
        });

        it("getByText throws when no render has been performed", () => {
            setScreenRoot(null);

            expect(() => screen.getByText("test")).toThrow(
                /No render has been performed. Call render\(\) before using screen queries/,
            );
        });

        it("getByLabelText throws when no render has been performed", () => {
            setScreenRoot(null);

            expect(() => screen.getByLabelText("test")).toThrow(
                /No render has been performed. Call render\(\) before using screen queries/,
            );
        });

        it("findByRole throws when no render has been performed", async () => {
            setScreenRoot(null);

            // findByRole internally calls getRoot() which throws synchronously
            // We need to catch it properly by wrapping in a try/catch or expect().rejects
            await expect(
                (async () => {
                    return screen.findByRole(AccessibleRole.BUTTON);
                })(),
            ).rejects.toThrow(/No render has been performed. Call render\(\) before using screen queries/);
        });

        it("findByText throws when no render has been performed", async () => {
            setScreenRoot(null);

            await expect(
                (async () => {
                    return screen.findByText("test");
                })(),
            ).rejects.toThrow(/No render has been performed. Call render\(\) before using screen queries/);
        });

        it("findByLabelText throws when no render has been performed", async () => {
            setScreenRoot(null);

            await expect(
                (async () => {
                    return screen.findByLabelText("test");
                })(),
            ).rejects.toThrow(/No render has been performed. Call render\(\) before using screen queries/);
        });
    });

    describe("after render", () => {
        it("getByRole finds elements", () => {
            render(
                <ApplicationWindow>
                    <Button label="Test Button" />
                </ApplicationWindow>,
            );

            const button = screen.getByRole(AccessibleRole.BUTTON, { name: "Test Button" });
            expect(button).toBeDefined();
        });

        it("getByText finds elements", () => {
            render(
                <ApplicationWindow>
                    <Label.Root label="Hello World" />
                </ApplicationWindow>,
            );

            const label = screen.getByText("Hello World");
            expect(label).toBeDefined();
        });

        it("getByLabelText finds elements", () => {
            render(
                <ApplicationWindow>
                    <Button label="Submit" />
                </ApplicationWindow>,
            );

            const button = screen.getByLabelText("Submit");
            expect(button).toBeDefined();
        });

        it("findByRole finds elements asynchronously", async () => {
            render(
                <ApplicationWindow>
                    <Button label="Async Button" />
                </ApplicationWindow>,
            );

            const button = await screen.findByRole(AccessibleRole.BUTTON, { name: "Async Button" });
            expect(button).toBeDefined();
        });

        it("findByText finds elements asynchronously", async () => {
            render(
                <ApplicationWindow>
                    <Label.Root label="Async Label" />
                </ApplicationWindow>,
            );

            const label = await screen.findByText("Async Label");
            expect(label).toBeDefined();
        });

        it("findByLabelText finds elements asynchronously", async () => {
            render(
                <ApplicationWindow>
                    <Button label="Async Submit" />
                </ApplicationWindow>,
            );

            const button = await screen.findByLabelText("Async Submit");
            expect(button).toBeDefined();
        });
    });

    describe("query options", () => {
        it("getByRole with name option filters results", () => {
            render(
                <ApplicationWindow>
                    <Box spacing={10} orientation={Orientation.VERTICAL}>
                        <Button label="First" />
                        <Button label="Second" />
                    </Box>
                </ApplicationWindow>,
            );

            // Use name option to find specific button
            const button = screen.getByRole(AccessibleRole.BUTTON, { name: "Second" });
            expect(button).toBeDefined();
        });

        it("getByText with regex matches partial text", () => {
            render(
                <ApplicationWindow>
                    <Label.Root label="Welcome to the application" />
                </ApplicationWindow>,
            );

            const label = screen.getByText(/Welcome/);
            expect(label).toBeDefined();
        });

        it("getByLabelText with regex matches partial label", () => {
            render(
                <ApplicationWindow>
                    <Button label="Submit Form" />
                </ApplicationWindow>,
            );

            const button = screen.getByLabelText(/Submit/);
            expect(button).toBeDefined();
        });
    });

    describe("error cases", () => {
        it("getByRole throws when element not found with name filter", () => {
            render(
                <ApplicationWindow>
                    <Label.Root label="No buttons here" />
                </ApplicationWindow>,
            );

            // Use a specific name to ensure we're looking for something that doesn't exist
            expect(() => screen.getByRole(AccessibleRole.BUTTON, { name: "Nonexistent Button" })).toThrow(
                /Unable to find any elements with role/,
            );
        });

        it("getByText throws when text not found", () => {
            render(
                <ApplicationWindow>
                    <Label.Root label="Different text" />
                </ApplicationWindow>,
            );

            expect(() => screen.getByText("Nonexistent")).toThrow(/Unable to find any elements with text/);
        });

        it("getByRole throws when multiple elements match without name filter", () => {
            render(
                <ApplicationWindow>
                    <Box spacing={10} orientation={Orientation.VERTICAL}>
                        <Button label="First" />
                        <Button label="Second" />
                    </Box>
                </ApplicationWindow>,
            );

            // Without name filter, multiple buttons should be found
            expect(() => screen.getByRole(AccessibleRole.BUTTON)).toThrow(/Found \d+ elements with role/);
        });
    });
});

describe("setScreenRoot", () => {
    afterEach(() => {
        cleanup();
    });

    it("allows setting root to null", () => {
        render(
            <ApplicationWindow>
                <Label.Root label="Test" />
            </ApplicationWindow>,
        );

        setScreenRoot(null);

        expect(() => screen.getByText("Test")).toThrow(/No render has been performed/);
    });

    it("allows setting root to application", () => {
        const { container } = render(
            <ApplicationWindow>
                <Label.Root label="Test Label" />
            </ApplicationWindow>,
        );

        setScreenRoot(null);
        setScreenRoot(container);

        const label = screen.getByText("Test Label");
        expect(label).toBeDefined();
    });
});
