import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as Gtk from "@gtkx/ffi/gtk";
import type { ScreenshotResult } from "./types.js";

/**
 * Selects a toplevel window for screenshot capture. The shape determines the
 * match strategy:
 *
 * - `undefined` — the first toplevel window
 * - `number` — the toplevel at that index
 * - `string` — the first window whose title contains the substring
 * - `RegExp` — the first window whose title matches the pattern
 */
export type WindowSelector = number | string | RegExp | undefined;

/**
 * Resolves a {@link WindowSelector} to a concrete {@link Gtk.Window}.
 *
 * @throws if no toplevel windows are open or if the selector matches none.
 */
export const resolveWindow = (selector?: WindowSelector): Gtk.Window => {
    const windows = Gtk.Window.listToplevels();

    if (windows.length === 0) {
        throw new Error("No windows available for screenshot");
    }

    if (selector === undefined) {
        const [first] = windows;
        if (!(first instanceof Gtk.Window)) {
            throw new TypeError("First toplevel is not a Window");
        }
        return first;
    }

    if (typeof selector === "number") {
        const indexed = windows[selector];
        if (!(indexed instanceof Gtk.Window)) {
            throw new TypeError(`Window at index ${selector} not found`);
        }
        return indexed;
    }

    const isRegex = selector instanceof RegExp;
    const found = windows.find((w): w is Gtk.Window => {
        if (!(w instanceof Gtk.Window)) return false;
        const title = w.getTitle() ?? "";
        return isRegex ? selector.test(title) : title.includes(selector);
    });

    if (!found) {
        const pattern = isRegex ? selector.toString() : `"${selector}"`;
        throw new Error(`No window found with title matching ${pattern}`);
    }
    return found;
};

const ensureScreenshotDir = (): string => {
    const dir = join(tmpdir(), "gtkx-screenshots");
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    return dir;
};

/**
 * Writes a {@link ScreenshotResult} to a uniquely named PNG file in the
 * system temp directory and returns the absolute path.
 *
 * Performs no console output. Pair with {@link logScreenshotPath} when
 * you want a clickable file:// link logged.
 */
export const saveScreenshotToTempFile = (result: ScreenshotResult): string => {
    const dir = ensureScreenshotDir();
    const filename = `${Date.now()}-screenshot.png`;
    const filepath = join(dir, filename);
    const buffer = Buffer.from(result.data, "base64");
    writeFileSync(filepath, buffer);
    return filepath;
};

/**
 * Logs a `file://` URI for the given screenshot path to the console.
 *
 * Separated from {@link saveScreenshotToTempFile} so callers (e.g. MCP
 * tools) can save without producing console output.
 */
export const logScreenshotPath = (filepath: string): void => {
    console.log(`Screenshot saved: file://${filepath}`);
};
