import { getObject } from "@gtkx/ffi";
import * as Gtk from "@gtkx/ffi/gtk";
import {
    Box,
    Button,
    CheckButton,
    DropDown,
    Entry,
    Label,
    ListBox,
    ListBoxRow,
    Switch,
    ToggleButton,
} from "@gtkx/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, userEvent } from "../src/index.js";

afterEach(async () => {
    await cleanup();
});

describe("userEvent.click", () => {
    it("emits clicked signal on button", async () => {
        const handleClick = vi.fn();
        await render(<Button label="Click me" onClicked={handleClick} />);

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON);
        await userEvent.click(button);

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("toggles checkbox state", async () => {
        await render(<CheckButton.Root label="Option" />);

        const checkbox = await screen.findByRole(Gtk.AccessibleRole.CHECKBOX);
        await userEvent.click(checkbox);

        const checked = await screen.findByRole(Gtk.AccessibleRole.CHECKBOX, { checked: true });
        expect(checked).toBeDefined();
    });

    it("toggles switch state", async () => {
        await render(<Switch />);

        const switchWidget = await screen.findByRole(Gtk.AccessibleRole.SWITCH);
        await userEvent.click(switchWidget);

        const active = await screen.findByRole(Gtk.AccessibleRole.SWITCH, { checked: true });
        expect(active).toBeDefined();
    });

    it("toggles toggle button state", async () => {
        await render(<ToggleButton.Root label="Toggle" />);

        const toggle = await screen.findByRole(Gtk.AccessibleRole.TOGGLE_BUTTON);
        await userEvent.click(toggle);

        const active = await screen.findByRole(Gtk.AccessibleRole.TOGGLE_BUTTON, { checked: true });
        expect(active).toBeDefined();
    });
});

describe("userEvent.dblClick", () => {
    it("emits clicked signal twice", async () => {
        const handleClick = vi.fn();
        await render(<Button label="Double click me" onClicked={handleClick} />);

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON);
        await userEvent.dblClick(button);

        expect(handleClick).toHaveBeenCalledTimes(2);
    });
});

describe("userEvent.tripleClick", () => {
    it("emits clicked signal three times", async () => {
        const handleClick = vi.fn();
        await render(<Button label="Triple click me" onClicked={handleClick} />);

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON);
        await userEvent.tripleClick(button);

        expect(handleClick).toHaveBeenCalledTimes(3);
    });
});

describe("userEvent.activate", () => {
    it("calls activate on the widget", async () => {
        await render(<Button label="Test" />);

        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON);
        await expect(userEvent.activate(button)).resolves.toBeUndefined();
    });
});

describe("userEvent.type", () => {
    it("types text into entry", async () => {
        await render(<Entry />);

        const entry = await screen.findByRole(Gtk.AccessibleRole.TEXT_BOX);
        await userEvent.type(entry, "Hello World");

        const editable = getObject(entry.id, Gtk.Editable);
        expect(editable?.getText()).toBe("Hello World");
    });

    it("appends text to existing content", async () => {
        await render(<Entry text="Initial " />);

        const entry = await screen.findByRole(Gtk.AccessibleRole.TEXT_BOX);
        await userEvent.type(entry, "appended");

        const editable = getObject(entry.id, Gtk.Editable);
        expect(editable?.getText()).toBe("Initial appended");
    });

    describe("error handling", () => {
        it("throws when element is not editable", async () => {
            await render(<Button label="Test" />);

            const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON);
            await expect(userEvent.type(button, "text")).rejects.toThrow("element is not editable");
        });
    });
});

describe("userEvent.clear", () => {
    it("clears text from entry", async () => {
        await render(<Entry text="Some text" />);

        const entry = await screen.findByRole(Gtk.AccessibleRole.TEXT_BOX);
        await userEvent.clear(entry);

        const editable = getObject(entry.id, Gtk.Editable);
        expect(editable?.getText()).toBe("");
    });

    describe("error handling", () => {
        it("throws when element is not editable", async () => {
            await render(<Button label="Test" />);

            const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON);
            await expect(userEvent.clear(button)).rejects.toThrow("element is not editable");
        });
    });
});

describe("userEvent.tab", () => {
    it("moves focus forward", async () => {
        await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <Button label="First" />
                <Button label="Second" />
            </Box>,
        );

        const first = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "First" });
        first.grabFocus();
        await userEvent.tab(first);
    });

    it("moves focus backward with shift option", async () => {
        await render(
            <Box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                <Button label="First" />
                <Button label="Second" />
            </Box>,
        );

        const second = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Second" });
        second.grabFocus();
        await userEvent.tab(second, { shift: true });
    });
});

describe("userEvent.selectOptions", () => {
    it("selects option in dropdown by index", async () => {
        await render(
            <DropDown.Root>
                <DropDown.Item id="a" label="Option A" />
                <DropDown.Item id="b" label="Option B" />
                <DropDown.Item id="c" label="Option C" />
            </DropDown.Root>,
        );

        const dropdown = await screen.findByRole(Gtk.AccessibleRole.COMBO_BOX);
        await userEvent.selectOptions(dropdown, 1);
    });

    it("selects row in list box by index", async () => {
        await render(
            <ListBox selectionMode={Gtk.SelectionMode.SINGLE}>
                <ListBoxRow>
                    <Label label="Item 1" />
                </ListBoxRow>
                <ListBoxRow>
                    <Label label="Item 2" />
                </ListBoxRow>
            </ListBox>,
        );

        const listBox = await screen.findByRole(Gtk.AccessibleRole.LIST);
        await userEvent.selectOptions(listBox, 0);
    });

    describe("error handling", () => {
        it("throws when element is not selectable", async () => {
            await render(<Button label="Test" />);

            const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON);
            await expect(userEvent.selectOptions(button, 0)).rejects.toThrow("element is not a selectable widget");
        });

        it("throws when selecting multiple options on dropdown", async () => {
            await render(
                <DropDown.Root>
                    <DropDown.Item id="a" label="A" />
                    <DropDown.Item id="b" label="B" />
                </DropDown.Root>,
            );

            const dropdown = await screen.findByRole(Gtk.AccessibleRole.COMBO_BOX);
            await expect(userEvent.selectOptions(dropdown, [0, 1])).rejects.toThrow(
                "Cannot select multiple options on a ComboBox",
            );
        });

        it("throws when passing non-numeric value to dropdown", async () => {
            await render(
                <DropDown.Root>
                    <DropDown.Item id="a" label="A" />
                </DropDown.Root>,
            );

            const dropdown = await screen.findByRole(Gtk.AccessibleRole.COMBO_BOX);
            await expect(userEvent.selectOptions(dropdown, "invalid" as unknown as number)).rejects.toThrow(
                "requires a numeric index",
            );
        });
    });
});

describe("userEvent.deselectOptions", () => {
    it("deselects row in list box", async () => {
        await render(
            <ListBox selectionMode={Gtk.SelectionMode.MULTIPLE}>
                <ListBoxRow>
                    <Label label="Item 1" />
                </ListBoxRow>
                <ListBoxRow>
                    <Label label="Item 2" />
                </ListBoxRow>
            </ListBox>,
        );

        const listBox = await screen.findByRole(Gtk.AccessibleRole.LIST);
        await userEvent.selectOptions(listBox, [0, 1]);
        await userEvent.deselectOptions(listBox, 0);
    });

    describe("error handling", () => {
        it("throws when element is not a list box", async () => {
            await render(
                <DropDown.Root>
                    <DropDown.Item id="a" label="A" />
                </DropDown.Root>,
            );

            const dropdown = await screen.findByRole(Gtk.AccessibleRole.COMBO_BOX);
            await expect(userEvent.deselectOptions(dropdown, 0)).rejects.toThrow("only ListBox supports deselection");
        });
    });
});
