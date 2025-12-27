import * as Gtk from "@gtkx/ffi/gtk";
import { cleanup, render, screen, userEvent, waitFor } from "@gtkx/testing";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/app.js";

describe("Todo App", () => {
    afterEach(async () => {
        await cleanup();
    });

    describe("adding todos", () => {
        it("adds a new todo when clicking Add button", async () => {
            await render(<App />, { wrapper: false });

            const input = await screen.findByTestId("todo-input");
            await userEvent.type(input, "Buy groceries");

            const addButton = await screen.findByTestId("add-button");
            await userEvent.click(addButton);

            const todoText = await screen.findByText("Buy groceries");
            expect(todoText).toBeDefined();
        });

        it("adds a new todo when pressing Enter", async () => {
            await render(<App />, { wrapper: false });

            const input = await screen.findByTestId("todo-input");
            await userEvent.type(input, "Walk the dog");
            await userEvent.activate(input);

            const todoText = await screen.findByText("Walk the dog");
            expect(todoText).toBeDefined();
        });

        it("clears input after adding todo", async () => {
            await render(<App />, { wrapper: false });

            const input = await screen.findByTestId("todo-input");
            await userEvent.type(input, "Buy groceries");

            const addButton = await screen.findByTestId("add-button");
            await userEvent.click(addButton);

            await waitFor(() => {
                const currentText = (input as Gtk.Entry).getText() ?? "";
                expect(currentText).toBe("");
            });
        });

        it("does not add empty todos", async () => {
            await render(<App />, { wrapper: false });

            const addButton = await screen.findByTestId("add-button");
            expect((addButton as Gtk.Button).getSensitive()).toBe(false);
        });
    });

    describe("completing todos", () => {
        it("can toggle a todo as completed", async () => {
            await render(<App />, { wrapper: false });

            // Add a todo first
            const input = await screen.findByTestId("todo-input");
            await userEvent.type(input, "Test todo");
            const addButton = await screen.findByTestId("add-button");
            await userEvent.click(addButton);

            // Find and click the checkbox
            const checkbox = await screen.findByRole(Gtk.AccessibleRole.CHECKBOX);
            expect((checkbox as Gtk.CheckButton).getActive()).toBe(false);

            await userEvent.click(checkbox);
            expect((checkbox as Gtk.CheckButton).getActive()).toBe(true);
        });

        it("can toggle a completed todo back to active", async () => {
            await render(<App />, { wrapper: false });

            // Add and complete a todo
            const input = await screen.findByTestId("todo-input");
            await userEvent.type(input, "Test todo");
            const addButton = await screen.findByTestId("add-button");
            await userEvent.click(addButton);

            const checkbox = await screen.findByRole(Gtk.AccessibleRole.CHECKBOX);
            await userEvent.click(checkbox);
            expect((checkbox as Gtk.CheckButton).getActive()).toBe(true);

            // Toggle back
            await userEvent.click(checkbox);
            expect((checkbox as Gtk.CheckButton).getActive()).toBe(false);
        });
    });

    describe("deleting todos", () => {
        it("can delete a todo", async () => {
            await render(<App />, { wrapper: false });

            // Add a todo
            const input = await screen.findByTestId("todo-input");
            await userEvent.type(input, "Todo to delete");
            const addButton = await screen.findByTestId("add-button");
            await userEvent.click(addButton);

            // Find and click delete button
            const deleteButtons = await screen.findAllByRole(Gtk.AccessibleRole.BUTTON);
            const deleteButton = deleteButtons.find(
                (btn) => (btn as Gtk.Button).getIconName() === "edit-delete-symbolic",
            );
            expect(deleteButton).toBeDefined();

            if (deleteButton) {
                await userEvent.click(deleteButton);
            }

            // Verify empty state appears
            const emptyMessage = await screen.findByText("No tasks yet");
            expect(emptyMessage).toBeDefined();
        });
    });

    describe("filtering todos", () => {
        it("shows filter bar when todos exist", async () => {
            await render(<App />, { wrapper: false });

            // Initially no filter bar
            await expect(screen.findByTestId("filter-all", { timeout: 100 })).rejects.toThrow();

            // Add a todo
            const input = await screen.findByTestId("todo-input");
            await userEvent.type(input, "Test todo");
            const addButton = await screen.findByTestId("add-button");
            await userEvent.click(addButton);

            // Filter bar should appear
            const filterAll = await screen.findByTestId("filter-all");
            expect(filterAll).toBeDefined();
        });

        it("filters to show only active todos", async () => {
            await render(<App />, { wrapper: false });

            // Add two todos
            const input = await screen.findByTestId("todo-input");
            const addButton = await screen.findByTestId("add-button");

            await userEvent.type(input, "Active todo");
            await userEvent.click(addButton);
            await userEvent.type(input, "Completed todo");
            await userEvent.click(addButton);

            // Complete the second one
            const checkboxes = await screen.findAllByRole(Gtk.AccessibleRole.CHECKBOX);
            await userEvent.click(checkboxes[1] as Gtk.Widget);

            // Filter to active
            const filterActive = await screen.findByTestId("filter-active");
            await userEvent.click(filterActive);

            // Should only see active todo
            const activeTodo = await screen.findByText("Active todo");
            expect(activeTodo).toBeDefined();

            await expect(screen.findByText("Completed todo", { timeout: 100 })).rejects.toThrow();
        });

        it("filters to show only completed todos", async () => {
            await render(<App />, { wrapper: false });

            // Add two todos
            const input = await screen.findByTestId("todo-input");
            const addButton = await screen.findByTestId("add-button");

            await userEvent.type(input, "Active todo");
            await userEvent.click(addButton);
            await userEvent.type(input, "Completed todo");
            await userEvent.click(addButton);

            // Complete the second one
            const checkboxes = await screen.findAllByRole(Gtk.AccessibleRole.CHECKBOX);
            await userEvent.click(checkboxes[1] as Gtk.Widget);

            // Filter to completed
            const filterCompleted = await screen.findByTestId("filter-completed");
            await userEvent.click(filterCompleted);

            // Should only see completed todo
            const completedTodo = await screen.findByText("Completed todo");
            expect(completedTodo).toBeDefined();

            await expect(screen.findByText("Active todo", { timeout: 100 })).rejects.toThrow();
        });
    });

    describe("clear completed", () => {
        it("shows clear completed button when there are completed todos", async () => {
            await render(<App />, { wrapper: false });

            // Add and complete a todo
            const input = await screen.findByTestId("todo-input");
            await userEvent.type(input, "Test todo");
            const addButton = await screen.findByTestId("add-button");
            await userEvent.click(addButton);

            // Initially no clear button
            await expect(screen.findByTestId("clear-completed", { timeout: 100 })).rejects.toThrow();

            // Complete the todo
            const checkbox = await screen.findByRole(Gtk.AccessibleRole.CHECKBOX);
            await userEvent.click(checkbox);

            // Clear button should appear
            const clearButton = await screen.findByTestId("clear-completed");
            expect(clearButton).toBeDefined();
        });

        it("removes all completed todos when clicking clear", async () => {
            await render(<App />, { wrapper: false });

            // Add two todos
            const input = await screen.findByTestId("todo-input");
            const addButton = await screen.findByTestId("add-button");

            await userEvent.type(input, "Keep this");
            await userEvent.click(addButton);
            await userEvent.type(input, "Delete this");
            await userEvent.click(addButton);

            // Complete the second one
            const checkboxes = await screen.findAllByRole(Gtk.AccessibleRole.CHECKBOX);
            await userEvent.click(checkboxes[1] as Gtk.Widget);

            // Clear completed
            const clearButton = await screen.findByTestId("clear-completed");
            await userEvent.click(clearButton);

            // Should only see the active todo
            const activeTodo = await screen.findByText("Keep this");
            expect(activeTodo).toBeDefined();

            await expect(screen.findByText("Delete this", { timeout: 100 })).rejects.toThrow();
        });
    });
});
