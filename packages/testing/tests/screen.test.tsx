import * as Gtk from "@gtkx/ffi/gtk";
import { GtkApplicationWindow, GtkBox, GtkButton, GtkEntry, GtkLabel } from "@gtkx/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { cleanup, render, screen } from "../src/index.js";

describe("screen", () => {
    it("finds element by role", async () => {
        await render(<GtkButton label="Test" />);
        const button = await screen.findByRole(Gtk.AccessibleRole.BUTTON, { name: "Test" });
        expect(button).toBeDefined();
    });

    it("finds element by text", async () => {
        await render("Hello World");
        const label = await screen.findByText("Hello World");
        expect(label).toBeDefined();
    });

    it("finds element by label text", async () => {
        const entryRef = { current: null as Gtk.Entry | null };
        const LabelledEntry = (): ReactNode => (
            <GtkBox orientation={Gtk.Orientation.VERTICAL}>
                <GtkLabel label="Click Me" mnemonicWidget={entryRef.current} />
                <GtkEntry
                    ref={(el) => {
                        entryRef.current = el;
                    }}
                />
            </GtkBox>
        );

        const { rerender } = await render(<LabelledEntry />);
        await rerender(<LabelledEntry />);

        const entry = await screen.findByLabelText("Click Me");
        expect(entry).toBeDefined();
        expect(entry.getAccessibleRole()).toBe(Gtk.AccessibleRole.TEXT_BOX);
    });

    it("finds element by widget name", async () => {
        await render(<GtkEntry name="my-input" />);
        const entry = await screen.findByName("my-input");
        expect(entry).toBeDefined();
    });

    it("finds all elements by role", async () => {
        await render(
            <GtkBox orientation={Gtk.Orientation.VERTICAL}>
                <GtkButton label="First" />
                <GtkButton label="Second" />
                <GtkButton label="Third" />
            </GtkBox>,
        );

        const buttons = await screen.findAllByRole(Gtk.AccessibleRole.BUTTON, { name: /First|Second|Third/ });
        expect(buttons.length).toBe(3);
    });

    it("finds all elements by text", async () => {
        await render(
            <GtkBox orientation={Gtk.Orientation.VERTICAL}>
                <GtkButton label="Item" />
                <GtkButton label="Item" />
            </GtkBox>,
        );

        const buttons = await screen.findAllByText("Item");
        expect(buttons.length).toBe(2);
    });

    it("finds all elements by label text", async () => {
        const ref1 = { current: null as Gtk.Entry | null };
        const ref2 = { current: null as Gtk.Entry | null };
        const LabelledEntries = (): ReactNode => (
            <GtkBox orientation={Gtk.Orientation.VERTICAL}>
                <GtkLabel label="Action" mnemonicWidget={ref1.current} />
                <GtkEntry
                    ref={(el) => {
                        ref1.current = el;
                    }}
                />
                <GtkLabel label="Action" mnemonicWidget={ref2.current} />
                <GtkEntry
                    ref={(el) => {
                        ref2.current = el;
                    }}
                />
            </GtkBox>
        );

        const { rerender } = await render(<LabelledEntries />);
        await rerender(<LabelledEntries />);

        const entries = await screen.findAllByLabelText("Action");
        expect(entries.length).toBe(2);
    });

    it("finds all elements by widget name", async () => {
        await render(
            <GtkBox orientation={Gtk.Orientation.VERTICAL}>
                <GtkEntry name="field" />
                <GtkEntry name="field" />
            </GtkBox>,
        );

        const entries = await screen.findAllByName("field");
        expect(entries.length).toBe(2);
    });

    describe("error handling", () => {
        it("throws when no render has been performed", async () => {
            await cleanup();
            expect(() => screen.findByRole(Gtk.AccessibleRole.BUTTON, { timeout: 100 })).toThrow(
                "No render has been performed",
            );
        });
    });

    describe("screenshot", () => {
        it("captures the first window when no selector is provided", async () => {
            await render(<GtkLabel label="Snapshot" />);

            const result = await screen.screenshot();

            expect(result.mimeType).toBe("image/png");
            expect(result.data.length).toBeGreaterThan(0);
            expect(result.width).toBeGreaterThan(0);
            expect(result.height).toBeGreaterThan(0);
        });

        it("captures the window at the requested index", async () => {
            await render(<GtkLabel label="Indexed" />);

            const result = await screen.screenshot(0);

            expect(result.mimeType).toBe("image/png");
            expect(result.data.length).toBeGreaterThan(0);
        });

        it("throws when the index is out of range", async () => {
            await render(<GtkLabel label="Bounds" />);

            await expect(screen.screenshot(99)).rejects.toThrow(/Window at index 99 not found/);
        });

        it("captures a window matching a title substring", async () => {
            await render(<GtkLabel label="Titled" />, {
                wrapper: ({ children }) => (
                    <GtkApplicationWindow title="Settings Window" defaultWidth={120} defaultHeight={80}>
                        {children}
                    </GtkApplicationWindow>
                ),
            });

            const result = await screen.screenshot("Settings");

            expect(result.mimeType).toBe("image/png");
        });

        it("captures a window matching a title regex", async () => {
            await render(<GtkLabel label="Pattern" />, {
                wrapper: ({ children }) => (
                    <GtkApplicationWindow title="Demo Pattern App" defaultWidth={120} defaultHeight={80}>
                        {children}
                    </GtkApplicationWindow>
                ),
            });

            const result = await screen.screenshot(/^Demo/);

            expect(result.mimeType).toBe("image/png");
        });

        it("throws when no window matches a string selector", async () => {
            await render(<GtkLabel label="Unmatched" />, {
                wrapper: ({ children }) => (
                    <GtkApplicationWindow title="Real Title" defaultWidth={120} defaultHeight={80}>
                        {children}
                    </GtkApplicationWindow>
                ),
            });

            await expect(screen.screenshot("Nonexistent")).rejects.toThrow(/No window found with title matching/);
        });

        it("throws when no window matches a regex selector", async () => {
            await render(<GtkLabel label="Unmatched" />, {
                wrapper: ({ children }) => (
                    <GtkApplicationWindow title="Real Title" defaultWidth={120} defaultHeight={80}>
                        {children}
                    </GtkApplicationWindow>
                ),
            });

            await expect(screen.screenshot(/^Bogus/)).rejects.toThrow(/No window found with title matching/);
        });

        it("throws when no windows are available", async () => {
            await cleanup();

            await expect(screen.screenshot()).rejects.toThrow(/No windows available for screenshot/);
        });
    });
});
