import type * as Gtk from "@gtkx/ffi/gtk";
import { call } from "@gtkx/native";
import { getWidgetPtr, hasGetText, hasSetText } from "./widget.js";

const emitSignal = (widget: Gtk.Widget, signalName: string): void => {
    call(
        "libgobject-2.0.so.0",
        "g_signal_emit_by_name",
        [
            { type: { type: "gobject" }, value: getWidgetPtr(widget) },
            { type: { type: "string" }, value: signalName },
        ],
        { type: "undefined" },
    );
};

export interface UserEventOptions {
    delay?: number;
}

export interface UserEventInstance {
    click: (element: Gtk.Widget) => Promise<void>;
    dblClick: (element: Gtk.Widget) => Promise<void>;
    type: (element: Gtk.Widget, text: string) => Promise<void>;
    clear: (element: Gtk.Widget) => Promise<void>;
}

const createUserEventInstance = (_options?: UserEventOptions): UserEventInstance => {
    return {
        click: async (element: Gtk.Widget): Promise<void> => {
            emitSignal(element, "clicked");
        },

        dblClick: async (element: Gtk.Widget): Promise<void> => {
            emitSignal(element, "clicked");
            emitSignal(element, "clicked");
        },

        type: async (element: Gtk.Widget, text: string): Promise<void> => {
            if (!hasSetText(element)) {
                throw new Error("Cannot type into element: no setText method available");
            }

            const currentText = hasGetText(element) ? element.getText() : "";
            element.setText(currentText + text);
        },

        clear: async (element: Gtk.Widget): Promise<void> => {
            if (!hasSetText(element)) {
                throw new Error("Cannot clear element: no setText method available");
            }

            element.setText("");
        },
    };
};

export const userEvent = {
    setup: (options?: UserEventOptions): UserEventInstance => createUserEventInstance(options),

    click: async (element: Gtk.Widget): Promise<void> => {
        emitSignal(element, "clicked");
    },

    dblClick: async (element: Gtk.Widget): Promise<void> => {
        emitSignal(element, "clicked");
        emitSignal(element, "clicked");
    },

    type: async (element: Gtk.Widget, text: string): Promise<void> => {
        if (!hasSetText(element)) {
            throw new Error("Cannot type into element: no setText method available");
        }

        const currentText = hasGetText(element) ? element.getText() : "";
        element.setText(currentText + text);
    },

    clear: async (element: Gtk.Widget): Promise<void> => {
        if (!hasSetText(element)) {
            throw new Error("Cannot clear element: no setText method available");
        }

        element.setText("");
    },
};
