/**
 * Yields to the event loop, allowing pending GTK events to process.
 *
 * Use this after actions that trigger async widget updates.
 *
 * @returns Promise that resolves on the next event loop tick
 *
 * @example
 * ```tsx
 * import { tick } from "@gtkx/testing";
 *
 * widget.setSensitive(false);
 * await tick(); // Wait for GTK to process the change
 * expect(widget.getSensitive()).toBe(false);
 * ```
 */
export const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Runs an action and yields one tick afterwards so GTK has a chance to flush
 * pending updates. Lets every event-emitting helper share the same post-action
 * settle policy without repeating `await tick()` at each call site.
 *
 * @example
 * ```tsx
 * const click = (el: Gtk.Widget) => withTick(() => el.activate());
 * ```
 */
export const withTick = async <T>(action: () => T | Promise<T>): Promise<T> => {
    const result = await action();
    await tick();
    return result;
};
