import { AccessibleRole } from "@gtkx/ffi/gtk";
import { cleanup, render, screen, userEvent } from "@gtkx/testing";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/app.js";

describe("Counter", () => {
    afterEach(async () => {
        cleanup();
    });

    it("renders initial count of zero", async () => {
        render(<App />);

        const label = await screen.findByText("Count: 0");
        expect(label).toBeDefined();
    });

    it("renders increment, decrement, and reset buttons", async () => {
        render(<App />);

        const increment = await screen.findByRole(AccessibleRole.BUTTON, { name: "Increment" });
        const decrement = await screen.findByRole(AccessibleRole.BUTTON, { name: "Decrement" });
        const reset = await screen.findByRole(AccessibleRole.BUTTON, { name: "Reset" });

        expect(increment).toBeDefined();
        expect(decrement).toBeDefined();
        expect(reset).toBeDefined();
    });

    it("increments count when clicking increment button", async () => {
        render(<App />);

        const increment = await screen.findByRole(AccessibleRole.BUTTON, { name: "Increment" });
        await userEvent.click(increment);

        await screen.findByText("Count: 1");
    });

    it("decrements count when clicking decrement button", async () => {
        render(<App />);

        const decrement = await screen.findByRole(AccessibleRole.BUTTON, { name: "Decrement" });
        await userEvent.click(decrement);

        await screen.findByText("Count: -1");
    });

    it("resets count to zero when clicking reset button", async () => {
        render(<App />);

        const increment = await screen.findByRole(AccessibleRole.BUTTON, { name: "Increment" });
        await userEvent.click(increment);
        await userEvent.click(increment);
        await userEvent.click(increment);

        await screen.findByText("Count: 3");

        const reset = await screen.findByRole(AccessibleRole.BUTTON, { name: "Reset" });
        await userEvent.click(reset);

        await screen.findByText("Count: 0");
    });

    it("handles multiple increments and decrements", async () => {
        render(<App />);

        const increment = await screen.findByRole(AccessibleRole.BUTTON, { name: "Increment" });
        const decrement = await screen.findByRole(AccessibleRole.BUTTON, { name: "Decrement" });

        await userEvent.click(increment);
        await userEvent.click(increment);
        await userEvent.click(increment);
        await screen.findByText("Count: 3");

        await userEvent.click(decrement);
        await screen.findByText("Count: 2");

        await userEvent.click(decrement);
        await userEvent.click(decrement);
        await screen.findByText("Count: 0");
    });
});
