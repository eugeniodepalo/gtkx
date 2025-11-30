import { start } from "@gtkx/ffi";
import type { ApplicationFlags } from "@gtkx/ffi/gio";
import type { Application } from "@gtkx/ffi/gtk";
import type { ReactNode } from "react";
import type Reconciler from "react-reconciler";
import { reconciler } from "./reconciler.js";

/** The root container for the React reconciler. */
export let container: unknown = null;

/**
 * Renders a React element tree as a GTK application.
 * This is the main entry point for GTKX applications.
 *
 * @example
 * ```tsx
 * render(
 *   <ApplicationWindow title="My App">
 *     <Label label="Hello, World!" />
 *   </ApplicationWindow>,
 *   "com.example.myapp"
 * );
 * ```
 *
 * @param element - The root React element to render
 * @param appId - The application ID (e.g., "com.example.myapp")
 * @param flags - Optional GIO application flags
 */
export const render = (element: ReactNode, appId: string, flags?: ApplicationFlags): Application => {
    const app = start(appId, flags);
    const instance = reconciler.getInstance();

    reconciler.setApp(app);

    container = instance.createContainer(
        app,
        0,
        null,
        false,
        null,
        "",
        (error: Error, info: Reconciler.BaseErrorInfo) => {
            console.error("Uncaught error in GTKX application:", error, info);
        },
        (_error: Error, _info: Reconciler.BaseErrorInfo) => {},
        (_error: Error, _info: Reconciler.BaseErrorInfo) => {},
        () => {},
        null,
    );

    instance.updateContainer(element, container, null, () => {});

    return app;
};
