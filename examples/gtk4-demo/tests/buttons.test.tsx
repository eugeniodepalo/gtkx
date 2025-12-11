import { AccessibleRole, type Switch } from "@gtkx/ffi/gtk";
import { cleanup, render, screen, userEvent } from "@gtkx/testing";
import { afterEach, describe, expect, it } from "vitest";
import { buttonsDemo } from "../src/demos/buttons/buttons.js";
import { checkButtonDemo } from "../src/demos/buttons/check-button.js";
import { switchDemo } from "../src/demos/buttons/switch.js";
import { toggleButtonDemo } from "../src/demos/buttons/toggle-button.js";

describe("Buttons Demo", () => {
    afterEach(async () => {
        await cleanup();
    });

    describe("buttons demo", () => {
        const ButtonsDemo = buttonsDemo.component;

        it("renders button types title", async () => {
            await render(<ButtonsDemo />);

            const title = await screen.findByText("Button Types");
            expect(title).toBeDefined();
        });

        it("renders regular button variants", async () => {
            await render(<ButtonsDemo />);

            const suggestedBtn = await screen.findByRole(AccessibleRole.BUTTON, { name: "Suggested" });
            const destructiveBtn = await screen.findByRole(AccessibleRole.BUTTON, { name: "Destructive" });
            const flatBtn = await screen.findByRole(AccessibleRole.BUTTON, { name: "Flat" });

            expect(suggestedBtn).toBeDefined();
            expect(destructiveBtn).toBeDefined();
            expect(flatBtn).toBeDefined();
        });

        it("increments click counter when button is clicked", async () => {
            await render(<ButtonsDemo />);

            const clickCountLabel = await screen.findByText("Clicked 0 times");
            expect(clickCountLabel).toBeDefined();

            const suggestedBtn = await screen.findByRole(AccessibleRole.BUTTON, { name: "Suggested" });
            await userEvent.click(suggestedBtn);

            const updatedLabel = await screen.findByText("Clicked 1 times");
            expect(updatedLabel).toBeDefined();
        });

        it("increments counter for any button variant", async () => {
            await render(<ButtonsDemo />);

            const suggestedBtn = await screen.findByRole(AccessibleRole.BUTTON, { name: "Suggested" });
            await userEvent.click(suggestedBtn);

            const destructiveBtn = await screen.findByRole(AccessibleRole.BUTTON, { name: "Destructive" });
            await userEvent.click(destructiveBtn);

            const updatedLabel = await screen.findByText("Clicked 2 times");
            expect(updatedLabel).toBeDefined();
        });

        it("has toggle button that changes label", async () => {
            await render(<ButtonsDemo />);

            const toggleBtn = await screen.findByRole(AccessibleRole.TOGGLE_BUTTON, { name: "OFF" });
            expect(toggleBtn).toBeDefined();

            await userEvent.click(toggleBtn);

            const toggledBtn = await screen.findByRole(AccessibleRole.TOGGLE_BUTTON, { name: "ON" });
            expect(toggledBtn).toBeDefined();
        });

        it("updates toggle state label", async () => {
            await render(<ButtonsDemo />);

            const stateLabel = await screen.findByText("Toggle state: Inactive");
            expect(stateLabel).toBeDefined();

            const toggleBtn = await screen.findByRole(AccessibleRole.TOGGLE_BUTTON, { name: "OFF" });
            await userEvent.click(toggleBtn);

            const activeLabel = await screen.findByText("Toggle state: Active");
            expect(activeLabel).toBeDefined();
        });

        it("renders link button", async () => {
            await render(<ButtonsDemo />);

            const linkBtn = await screen.findByRole(AccessibleRole.LINK, { name: "Visit GTK Website" });
            expect(linkBtn).toBeDefined();
        });

        it("renders button size variants", async () => {
            await render(<ButtonsDemo />);

            const smallBtn = await screen.findByRole(AccessibleRole.BUTTON, { name: "Small" });
            const largeBtn = await screen.findByRole(AccessibleRole.BUTTON, { name: "Large" });

            expect(smallBtn).toBeDefined();
            expect(largeBtn).toBeDefined();
        });
    });

    describe("check button demo", () => {
        const CheckButtonDemo = checkButtonDemo.component;

        it("renders check buttons title", async () => {
            await render(<CheckButtonDemo />);

            const title = await screen.findByText("Check Buttons");
            expect(title).toBeDefined();
        });

        it("renders three checkboxes with correct initial states", async () => {
            await render(<CheckButtonDemo />);

            const option1 = await screen.findByRole(AccessibleRole.CHECKBOX, { name: "Option 1", checked: false });
            const option2 = await screen.findByRole(AccessibleRole.CHECKBOX, {
                name: "Option 2 (initially checked)",
                checked: true,
            });
            const option3 = await screen.findByRole(AccessibleRole.CHECKBOX, { name: "Option 3", checked: false });

            expect(option1).toBeDefined();
            expect(option2).toBeDefined();
            expect(option3).toBeDefined();
        });

        it("shows initially selected option", async () => {
            await render(<CheckButtonDemo />);

            const selectedLabel = await screen.findByText("Selected: 2");
            expect(selectedLabel).toBeDefined();
        });

        it("toggles checkbox on click", async () => {
            await render(<CheckButtonDemo />);

            const option1 = await screen.findByRole(AccessibleRole.CHECKBOX, { name: "Option 1", checked: false });
            await userEvent.click(option1);

            const option1Checked = await screen.findByRole(AccessibleRole.CHECKBOX, {
                name: "Option 1",
                checked: true,
            });
            expect(option1Checked).toBeDefined();
        });

        it("updates selected label after toggling", async () => {
            await render(<CheckButtonDemo />);

            const option1 = await screen.findByRole(AccessibleRole.CHECKBOX, { name: "Option 1", checked: false });
            await userEvent.click(option1);

            const selectedLabel = await screen.findByText("Selected: 1, 2");
            expect(selectedLabel).toBeDefined();
        });

        it("has disabled checkboxes", async () => {
            await render(<CheckButtonDemo />);

            const disabledUnchecked = await screen.findByRole(AccessibleRole.CHECKBOX, {
                name: "Disabled unchecked",
                checked: false,
            });
            const disabledChecked = await screen.findByRole(AccessibleRole.CHECKBOX, {
                name: "Disabled checked",
                checked: true,
            });

            expect(disabledUnchecked.getSensitive()).toBe(false);
            expect(disabledChecked.getSensitive()).toBe(false);
        });

        it("can uncheck initially checked option", async () => {
            await render(<CheckButtonDemo />);

            const option2 = await screen.findByRole(AccessibleRole.CHECKBOX, {
                name: "Option 2 (initially checked)",
                checked: true,
            });
            await userEvent.click(option2);

            const option2Unchecked = await screen.findByRole(AccessibleRole.CHECKBOX, {
                name: "Option 2 (initially checked)",
                checked: false,
            });
            expect(option2Unchecked).toBeDefined();

            const selectedLabel = await screen.findByText("Selected: None");
            expect(selectedLabel).toBeDefined();
        });

        it("can select all options", async () => {
            await render(<CheckButtonDemo />);

            const option1 = await screen.findByRole(AccessibleRole.CHECKBOX, { name: "Option 1", checked: false });
            const option3 = await screen.findByRole(AccessibleRole.CHECKBOX, { name: "Option 3", checked: false });

            await userEvent.click(option1);
            await userEvent.click(option3);

            const selectedLabel = await screen.findByText("Selected: 1, 2, 3");
            expect(selectedLabel).toBeDefined();
        });
    });

    describe("toggle button demo", () => {
        const ToggleButtonDemo = toggleButtonDemo.component;

        it("renders toggle buttons title", async () => {
            await render(<ToggleButtonDemo />);

            const title = await screen.findByText("Toggle Buttons");
            expect(title).toBeDefined();
        });

        it("renders text formatting toolbar", async () => {
            await render(<ToggleButtonDemo />);

            const boldBtn = await screen.findByRole(AccessibleRole.TOGGLE_BUTTON, { name: "B" });
            const italicBtn = await screen.findByRole(AccessibleRole.TOGGLE_BUTTON, { name: "I" });
            const underlineBtn = await screen.findByRole(AccessibleRole.TOGGLE_BUTTON, { name: "U" });

            expect(boldBtn).toBeDefined();
            expect(italicBtn).toBeDefined();
            expect(underlineBtn).toBeDefined();
        });

        it("shows initial style as Normal", async () => {
            await render(<ToggleButtonDemo />);

            const styleLabel = await screen.findByText("Current style: Normal");
            expect(styleLabel).toBeDefined();
        });

        it("has standalone toggle button", async () => {
            await render(<ToggleButtonDemo />);

            const standaloneToggle = await screen.findByRole(AccessibleRole.TOGGLE_BUTTON, { name: "Toggle Me" });
            expect(standaloneToggle).toBeDefined();
        });

        it("can toggle off styles", async () => {
            await render(<ToggleButtonDemo />);

            const boldBtn = await screen.findByRole(AccessibleRole.TOGGLE_BUTTON, { name: "B" });
            await userEvent.click(boldBtn);
            await userEvent.click(boldBtn);

            const styleLabel = await screen.findByText("Current style: Normal");
            expect(styleLabel).toBeDefined();
        });

        it("updates style label when Bold is toggled", async () => {
            await render(<ToggleButtonDemo />);

            const boldBtn = await screen.findByRole(AccessibleRole.TOGGLE_BUTTON, { name: "B" });
            await userEvent.click(boldBtn);

            const styleLabel = await screen.findByText("Current style: Bold");
            expect(styleLabel).toBeDefined();
        });

        it("updates style label when Italic is toggled", async () => {
            await render(<ToggleButtonDemo />);

            const italicBtn = await screen.findByRole(AccessibleRole.TOGGLE_BUTTON, { name: "I" });
            await userEvent.click(italicBtn);

            const styleLabel = await screen.findByText("Current style: Italic");
            expect(styleLabel).toBeDefined();
        });

        it("updates style label when Underline is toggled", async () => {
            await render(<ToggleButtonDemo />);

            const underlineBtn = await screen.findByRole(AccessibleRole.TOGGLE_BUTTON, { name: "U" });
            await userEvent.click(underlineBtn);

            const styleLabel = await screen.findByText("Current style: Underline");
            expect(styleLabel).toBeDefined();
        });

        it("combines multiple styles", async () => {
            await render(<ToggleButtonDemo />);

            const boldBtn = await screen.findByRole(AccessibleRole.TOGGLE_BUTTON, { name: "B" });
            const italicBtn = await screen.findByRole(AccessibleRole.TOGGLE_BUTTON, { name: "I" });

            await userEvent.click(boldBtn);
            await userEvent.click(italicBtn);

            const styleLabel = await screen.findByText("Current style: Bold + Italic");
            expect(styleLabel).toBeDefined();
        });

        it("combines all three styles", async () => {
            await render(<ToggleButtonDemo />);

            const boldBtn = await screen.findByRole(AccessibleRole.TOGGLE_BUTTON, { name: "B" });
            const italicBtn = await screen.findByRole(AccessibleRole.TOGGLE_BUTTON, { name: "I" });
            const underlineBtn = await screen.findByRole(AccessibleRole.TOGGLE_BUTTON, { name: "U" });

            await userEvent.click(boldBtn);
            await userEvent.click(italicBtn);
            await userEvent.click(underlineBtn);

            const styleLabel = await screen.findByText("Current style: Bold + Italic + Underline");
            expect(styleLabel).toBeDefined();
        });

        it("standalone toggle syncs with Bold button", async () => {
            await render(<ToggleButtonDemo />);

            const standaloneToggle = await screen.findByRole(AccessibleRole.TOGGLE_BUTTON, { name: "Toggle Me" });
            await userEvent.click(standaloneToggle);

            const styleLabel = await screen.findByText("Current style: Bold");
            expect(styleLabel).toBeDefined();
        });
    });

    describe("switch demo", () => {
        const SwitchDemo = switchDemo.component;

        it("renders switch title", async () => {
            await render(<SwitchDemo />);

            const title = await screen.findByText("Switch");
            expect(title).toBeDefined();
        });

        it("renders setting switches with correct initial states", async () => {
            await render(<SwitchDemo />);

            const switches = await screen.findAllByRole(AccessibleRole.SWITCH);
            expect(switches.length).toBeGreaterThanOrEqual(3);
        });

        it("has disabled switches", async () => {
            await render(<SwitchDemo />);

            const switches = await screen.findAllByRole(AccessibleRole.SWITCH);

            const disabledSwitches = switches.filter((sw) => !sw.getSensitive());
            expect(disabledSwitches.length).toBe(2);
        });

        it("can toggle dark mode switch on", async () => {
            await render(<SwitchDemo />);

            const uncheckedSwitches = await screen.findAllByRole(AccessibleRole.SWITCH, { checked: false });
            const darkModeSwitch = uncheckedSwitches.find((sw) => sw.getSensitive()) as Switch;
            expect(darkModeSwitch).toBeDefined();

            await userEvent.click(darkModeSwitch);

            expect(darkModeSwitch.getActive()).toBe(true);
        });

        it("can toggle notifications switch off", async () => {
            await render(<SwitchDemo />);

            const checkedSwitches = await screen.findAllByRole(AccessibleRole.SWITCH, { checked: true });
            const notificationsSwitch = checkedSwitches.find((sw) => sw.getSensitive()) as Switch;
            expect(notificationsSwitch).toBeDefined();

            await userEvent.click(notificationsSwitch);

            expect(notificationsSwitch.getActive()).toBe(false);
        });

        it("can toggle switch multiple times", async () => {
            await render(<SwitchDemo />);

            const uncheckedSwitches = await screen.findAllByRole(AccessibleRole.SWITCH, { checked: false });
            const darkModeSwitch = uncheckedSwitches.find((sw) => sw.getSensitive()) as Switch;
            expect(darkModeSwitch).toBeDefined();

            await userEvent.click(darkModeSwitch);
            expect(darkModeSwitch.getActive()).toBe(true);

            await userEvent.click(darkModeSwitch);
            expect(darkModeSwitch.getActive()).toBe(false);
        });
    });
});
