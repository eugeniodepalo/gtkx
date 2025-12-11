import { AccessibleRole, type DropDown, type Widget } from "@gtkx/ffi/gtk";
import { cleanup, render, screen, userEvent } from "@gtkx/testing";
import { afterEach, describe, expect, it } from "vitest";
import { dropDownDemo } from "../src/demos/lists/drop-down.js";
import { listBoxDemo } from "../src/demos/lists/list-box.js";

describe("Lists Demos", () => {
    afterEach(async () => {
        await cleanup();
    });

    describe("list box demo", () => {
        const ListBoxDemo = listBoxDemo.component;

        it("renders list box title", async () => {
            await render(<ListBoxDemo />);

            const title = await screen.findByText("List Box");
            expect(title).toBeDefined();
        });

        it("renders list items", async () => {
            await render(<ListBoxDemo />);

            const inbox = await screen.findByText("Inbox");
            const starred = await screen.findByText("Starred");
            const sent = await screen.findByText("Sent");
            const drafts = await screen.findByText("Drafts");
            const archive = await screen.findByText("Archive");

            expect(inbox).toBeDefined();
            expect(starred).toBeDefined();
            expect(sent).toBeDefined();
            expect(drafts).toBeDefined();
            expect(archive).toBeDefined();
        });

        it("shows item subtitles", async () => {
            await render(<ListBoxDemo />);

            const unreadMessages = await screen.findByText("23 unread messages");
            const starredItems = await screen.findByText("5 starred items");

            expect(unreadMessages).toBeDefined();
            expect(starredItems).toBeDefined();
        });

        it("shows selection info after activating item", async () => {
            await render(<ListBoxDemo />);

            const listRows = await screen.findAllByRole(AccessibleRole.LIST_ITEM);
            expect(listRows.length).toBeGreaterThan(0);

            const firstRow = listRows[0] as Widget;
            expect(firstRow).toBeDefined();

            await userEvent.activate(firstRow);

            const selectedLabel = await screen.findByText(/Selected:/);
            expect(selectedLabel).toBeDefined();
        });

        it("shows Inbox when first row is activated", async () => {
            await render(<ListBoxDemo />);

            const listRows = await screen.findAllByRole(AccessibleRole.LIST_ITEM);
            expect(listRows.length).toBeGreaterThan(0);

            const firstRow = listRows[0] as Widget;
            expect(firstRow).toBeDefined();

            await userEvent.activate(firstRow);

            const selectedLabel = await screen.findByText("Selected: Inbox");
            expect(selectedLabel).toBeDefined();
        });

        it("can select different items", async () => {
            await render(<ListBoxDemo />);

            const listRows = await screen.findAllByRole(AccessibleRole.LIST_ITEM);
            expect(listRows.length).toBeGreaterThanOrEqual(2);

            const secondRow = listRows[1] as Widget;
            expect(secondRow).toBeDefined();

            await userEvent.activate(secondRow);

            const selectedLabel = await screen.findByText("Selected: Starred");
            expect(selectedLabel).toBeDefined();
        });

        it("can change selection between items", async () => {
            await render(<ListBoxDemo />);

            const listRows = await screen.findAllByRole(AccessibleRole.LIST_ITEM);
            expect(listRows.length).toBeGreaterThanOrEqual(3);

            const firstRow = listRows[0] as Widget;
            const thirdRow = listRows[2] as Widget;
            expect(firstRow).toBeDefined();
            expect(thirdRow).toBeDefined();

            await userEvent.activate(firstRow);
            const inboxSelected = await screen.findByText("Selected: Inbox");
            expect(inboxSelected).toBeDefined();

            await userEvent.activate(thirdRow);
            const sentSelected = await screen.findByText("Selected: Sent");
            expect(sentSelected).toBeDefined();
        });

        it("describes selection modes", async () => {
            await render(<ListBoxDemo />);

            const selectionModes = await screen.findByText(/NONE, SINGLE, BROWSE, and MULTIPLE/);
            expect(selectionModes).toBeDefined();
        });

        it("selects item using selectOptions", async () => {
            await render(<ListBoxDemo />);

            const listBox = await screen.findByRole(AccessibleRole.LIST);
            await userEvent.selectOptions(listBox, 2);

            const selectedLabel = await screen.findByText("Selected: Sent");
            expect(selectedLabel).toBeDefined();
        });

        it("can select multiple items sequentially with selectOptions", async () => {
            await render(<ListBoxDemo />);

            const listBox = await screen.findByRole(AccessibleRole.LIST);

            await userEvent.selectOptions(listBox, 0);
            const firstSelected = await screen.findByText("Selected: Inbox");
            expect(firstSelected).toBeDefined();

            await userEvent.selectOptions(listBox, 4);
            const secondSelected = await screen.findByText("Selected: Archive");
            expect(secondSelected).toBeDefined();
        });
    });

    describe("drop down demo", () => {
        const DropDownDemo = dropDownDemo.component;

        it("renders drop down title", async () => {
            await render(<DropDownDemo />);

            const title = await screen.findByText("Drop Down");
            expect(title).toBeDefined();
        });

        it("renders description about DropDown", async () => {
            await render(<DropDownDemo />);

            const description = await screen.findByText(/GtkDropDown is a modern replacement for combo boxes/);
            expect(description).toBeDefined();
        });

        it("renders country selector dropdown", async () => {
            await render(<DropDownDemo />);

            const dropdown = await screen.findByRole(AccessibleRole.COMBO_BOX);
            expect(dropdown).toBeDefined();
        });

        it("renders country selector section", async () => {
            await render(<DropDownDemo />);

            const selectorLabel = await screen.findByText("Country Selector");
            expect(selectorLabel).toBeDefined();
        });

        it("describes DropDown features", async () => {
            await render(<DropDownDemo />);

            const featuresDescription = await screen.findByText(/custom item rendering, search\/filter/);
            expect(featuresDescription).toBeDefined();
        });

        it("selects country using selectOptions and shows selection details", async () => {
            await render(<DropDownDemo />);

            const dropdown = await screen.findByRole(AccessibleRole.COMBO_BOX);
            await userEvent.selectOptions(dropdown, 2);

            const capital = await screen.findByText("Capital: Paris");
            expect(capital).toBeDefined();
        });

        it("can change selection between countries", async () => {
            await render(<DropDownDemo />);

            const dropdown = await screen.findByRole(AccessibleRole.COMBO_BOX);

            await userEvent.selectOptions(dropdown, 1);
            const ukSelected = await screen.findByText("Capital: London");
            expect(ukSelected).toBeDefined();

            await userEvent.selectOptions(dropdown, 4);
            const japanSelected = await screen.findByText("Capital: Tokyo");
            expect(japanSelected).toBeDefined();
        });

        it("updates selected index correctly", async () => {
            await render(<DropDownDemo />);

            const dropdown = (await screen.findByRole(AccessibleRole.COMBO_BOX)) as DropDown;

            await userEvent.selectOptions(dropdown, 5);

            expect(dropdown.getSelected()).toBe(5);
        });
    });
});
