import type { Value } from "@gtkx/ffi/gobject";
import { signalEmitv, signalLookup } from "@gtkx/ffi/gobject";
import type * as Gtk from "@gtkx/ffi/gtk";
import { valueFromObject } from "@gtkx/ffi/value-marshal";
import { tick } from "./timing.js";

/**
 * Emits a GTK signal on a widget or event controller.
 *
 * Low-level utility for triggering signals directly. Prefer {@link userEvent}
 * for common interactions like clicking and typing.
 *
 * @param element - The widget or event controller to emit the signal on
 * @param signalName - GTK signal name (e.g., "clicked", "activate", "drag-begin")
 * @param args - Additional signal arguments as GValues
 *
 * @example
 * ```tsx
 * import { fireEvent } from "@gtkx/testing";
 * import { valueFromDouble } from "@gtkx/ffi/value-marshal";
 *
 * // Emit signal on widget
 * await fireEvent(widget, "clicked");
 *
 * // Emit signal on gesture controller
 * const gesture = widget.observeControllers().getObject(0) as Gtk.GestureDrag;
 * await fireEvent(gesture, "drag-begin", valueFromDouble(100), valueFromDouble(100));
 * ```
 *
 * @see {@link userEvent} for high-level user interactions
 */
export const fireEvent = async (
    element: Gtk.Widget | Gtk.EventController,
    signalName: string,
    ...args: Value[]
): Promise<void> => {
    const gtype = element.__gtype__;
    const signalId = signalLookup(signalName, gtype);

    const instanceValue = valueFromObject(element);

    signalEmitv([instanceValue, ...args], signalId, 0);

    await tick();
};
