import { events, isStarted } from "@gtkx/ffi";
import * as Gio from "@gtkx/ffi/gio";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkApplicationWindow, quit, render, useApplication } from "@gtkx/react";
import { tick } from "@gtkx/testing";
import { describe, expect, it, vi } from "vitest";

describe("render and quit", () => {
    it("initializes the runtime, registers the app, mounts the tree, then quits", async () => {
        const app = new Gtk.Application(Gio.ApplicationFlags.NON_UNIQUE, "org.gtkx.render-coverage");
        const stopHandler = vi.fn();
        events.on("stop", stopHandler);

        let resolvedApp: Gtk.Application | null = null;
        const Probe = () => {
            resolvedApp = useApplication();
            return <GtkApplicationWindow defaultWidth={100} defaultHeight={100} />;
        };

        render(<Probe />, app);
        await tick();

        expect(app.getIsRegistered()).toBe(true);
        expect(isStarted()).toBe(true);
        expect(resolvedApp).toBe(app);

        quit();
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(stopHandler).toHaveBeenCalledTimes(1);
        expect(isStarted()).toBe(false);
    });
});
