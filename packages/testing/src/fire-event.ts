import type * as Gtk from "@gtkx/ffi/gtk";
import type { Arg } from "@gtkx/native";
import { call } from "@gtkx/native";
import { tick } from "./timing.js";

/**
 * Emits a GTK signal on a widget or event controller.
 *
 * Low-level utility for triggering signals directly. Prefer {@link userEvent}
 * for common interactions like clicking and typing.
 *
 * @param element - The widget or event controller to emit the signal on
 * @param signalName - GTK signal name (e.g., "clicked", "activate", "drag-begin")
 * @param args - Additional signal arguments
 *
 * @example
 * ```tsx
 * import { fireEvent } from "@gtkx/testing";
 *
 * // Emit signal on widget
 * await fireEvent(widget, "clicked");
 *
 * // Emit signal on gesture controller
 * const gesture = widget.observeControllers().getObject(0) as Gtk.GestureDrag;
 * await fireEvent(gesture, "drag-begin", { type: { type: "float", size: 64 }, value: 100 }, { type: { type: "float", size: 64 }, value: 100 });
 * ```
 *
 * @see {@link userEvent} for high-level user interactions
 */
export const fireEvent = async (
    element: Gtk.Widget | Gtk.EventController,
    signalName: string,
    ...args: Arg[]
): Promise<void> => {
    call(
        "libgobject-2.0.so.0",
        "g_signal_emit_by_name",
        [
            { type: { type: "gobject", ownership: "borrowed" }, value: element.handle },
            { type: { type: "string", ownership: "borrowed" }, value: signalName },
            ...args,
        ],
        { type: "undefined" },
    );

    await tick();
};
