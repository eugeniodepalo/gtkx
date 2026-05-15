import { stop as nativeStop } from "@gtkx/native";
import { init as initAdwaita } from "./generated/adw/adw.js";
import { init as initGtk } from "./generated/gtk/gtk.js";
import { finalize as finalizeGtkSource, init as initGtkSource } from "./generated/gtksource/gtksource.js";

const KEEP_ALIVE_INTERVAL = 2147483647;

let keepAliveTimeout: ReturnType<typeof setTimeout> | null = null;
let stopped = false;

let resolveStopped!: () => void;
const stoppedPromise = new Promise<void>((resolve) => {
    resolveStopped = resolve;
});

const keepAlive = (): void => {
    keepAliveTimeout = setTimeout(keepAlive, KEEP_ALIVE_INTERVAL);
};

/**
 * Whether the GTK runtime is currently active.
 *
 * `true` from the moment `@gtkx/ffi` is imported until {@link stop} is called.
 */
export const isStarted = (): boolean => !stopped;

/**
 * Resolves once the GTK runtime has shut down.
 *
 * The returned promise settles exactly once, after {@link stop} has quit the
 * `GLib` main loop. Useful for releasing process-level resources that outlive
 * the GTK runtime, such as a dev server or a socket connection.
 *
 * @example
 * ```tsx
 * import { whenStopped } from "@gtkx/ffi";
 *
 * whenStopped().then(() => {
 *   console.log("Runtime stopped");
 * });
 * ```
 *
 * @see {@link stop}
 */
export const whenStopped = (): Promise<void> => stoppedPromise;

/**
 * Shuts down the GTK runtime.
 *
 * Finalizes extension libraries, quits the `GLib` main loop, resolves the
 * {@link whenStopped} promise, and clears the keep-alive timer so the Node.js
 * process can exit cleanly. Subsequent calls are no-ops. Once stopped, no
 * further FFI calls may be made.
 *
 * @see {@link whenStopped}
 */
export const stop = (): void => {
    if (stopped) return;
    stopped = true;

    try {
        finalizeGtkSource();
    } catch {}

    nativeStop();

    if (keepAliveTimeout) {
        clearTimeout(keepAliveTimeout);
        keepAliveTimeout = null;
    }

    resolveStopped();
};

keepAlive();
initGtk();

try {
    initAdwaita();
    initGtkSource();
} catch {}
