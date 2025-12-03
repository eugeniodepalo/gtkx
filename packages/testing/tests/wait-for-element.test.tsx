import { AccessibleRole, Orientation } from "@gtkx/ffi/gtk";
import { ApplicationWindow, Box, Button, Label } from "@gtkx/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitForElementToBeRemoved } from "../src/index.js";

describe("waitForElementToBeRemoved", () => {
    afterEach(() => {
        cleanup();
    });

    describe("element removal with state changes", () => {
        it("resolves when element is removed via state update", async () => {
            let hideLabel: () => void = () => {};

            const TestComponent = () => {
                const [showLabel, setShowLabel] = useState(true);
                hideLabel = () => setShowLabel(false);

                return (
                    <ApplicationWindow>
                        <Box spacing={0} orientation={Orientation.VERTICAL}>
                            {showLabel && <Label.Root label="Removable" />}
                            <Button label="Keep" />
                        </Box>
                    </ApplicationWindow>
                );
            };

            render(<TestComponent />);

            const label = await screen.findByText("Removable");

            setTimeout(() => {
                hideLabel();
            }, 50);

            await waitForElementToBeRemoved(label, { timeout: 500, interval: 20 });

            expect(screen.queryByText("Removable")).toBeNull();
        });

        it("resolves when element is removed using callback", async () => {
            let hideButton: () => void = () => {};

            const TestComponent = () => {
                const [showButton, setShowButton] = useState(true);
                hideButton = () => setShowButton(false);

                return (
                    <ApplicationWindow>
                        <Box spacing={0} orientation={Orientation.VERTICAL}>
                            {showButton && <Button label="ToRemove" />}
                            <Label.Root label="Static" />
                        </Box>
                    </ApplicationWindow>
                );
            };

            render(<TestComponent />);

            await screen.findByRole(AccessibleRole.BUTTON, { name: "ToRemove" });

            setTimeout(() => {
                hideButton();
            }, 50);

            await waitForElementToBeRemoved(() => screen.queryByRole(AccessibleRole.BUTTON, { name: "ToRemove" }), {
                timeout: 500,
                interval: 20,
            });

            expect(screen.queryByRole(AccessibleRole.BUTTON, { name: "ToRemove" })).toBeNull();
        });
    });

    describe("error cases", () => {
        it("throws when callback initially returns null", async () => {
            render(
                <ApplicationWindow>
                    <Label.Root label="Existing" />
                </ApplicationWindow>,
            );

            await expect(waitForElementToBeRemoved(() => screen.queryByText("NonExistent"))).rejects.toThrow(
                /The element\(s\) given to waitForElementToBeRemoved are already removed/,
            );
        });

        it("throws when element is not removed before timeout", async () => {
            render(
                <ApplicationWindow>
                    <Label.Root label="Permanent" />
                </ApplicationWindow>,
            );

            const label = await screen.findByText("Permanent");

            await expect(waitForElementToBeRemoved(label, { timeout: 100, interval: 20 })).rejects.toThrow(
                /Timed out after 100ms waiting for element to be removed/,
            );
        });
    });

    describe("options handling", () => {
        it("uses custom timeout", async () => {
            render(
                <ApplicationWindow>
                    <Label.Root label="Stays" />
                </ApplicationWindow>,
            );

            const label = await screen.findByText("Stays");
            const start = Date.now();

            await expect(waitForElementToBeRemoved(label, { timeout: 150, interval: 30 })).rejects.toThrow();

            const elapsed = Date.now() - start;
            expect(elapsed).toBeGreaterThanOrEqual(140);
            expect(elapsed).toBeLessThan(300);
        });

        it("calls onTimeout when provided", async () => {
            render(
                <ApplicationWindow>
                    <Label.Root label="Timeout Test" />
                </ApplicationWindow>,
            );

            const label = await screen.findByText("Timeout Test");
            const customError = new Error("Custom timeout error");

            await expect(
                waitForElementToBeRemoved(label, {
                    timeout: 100,
                    interval: 20,
                    onTimeout: () => customError,
                }),
            ).rejects.toThrow("Custom timeout error");
        });
    });
});
