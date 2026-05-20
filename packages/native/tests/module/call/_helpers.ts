import { call } from "../../../index.js";
import type { Type } from "../../../types.js";
import { BOOLEAN, GOBJECT_BORROWED, GOBJECT_LIB, GTK_LIB, STRING, VOID } from "../utils.js";

export function connectCancelledSignal(cancellable: unknown, callback: (obj: unknown) => void): void {
    call(
        GOBJECT_LIB,
        "g_signal_connect_closure",
        [
            { type: GOBJECT_BORROWED, value: cancellable },
            { type: STRING, value: "cancelled" },
            {
                type: {
                    type: "callback",
                    kind: "closure",
                    argTypes: [{ type: "gobject", ownership: "borrowed" }],
                    returnType: { type: "void" },
                },
                value: callback,
            },
            { type: BOOLEAN, value: false },
        ],
        VOID,
    );
}

export function setLabelSelectable(label: unknown, value: boolean): void {
    call(
        GTK_LIB,
        "gtk_label_set_selectable",
        [
            { type: GOBJECT_BORROWED, value: label },
            { type: BOOLEAN, value },
        ],
        VOID,
    );
}

export function getLabelSelectable(label: unknown): boolean {
    return call(GTK_LIB, "gtk_label_get_selectable", [{ type: GOBJECT_BORROWED, value: label }], BOOLEAN) as boolean;
}

export function setAndGetLabelMaxWidthChars(label: unknown, type: Type, value: number): number {
    call(
        GTK_LIB,
        "gtk_label_set_max_width_chars",
        [
            { type: GOBJECT_BORROWED, value: label },
            { type, value },
        ],
        VOID,
    );
    return call(GTK_LIB, "gtk_label_get_max_width_chars", [{ type: GOBJECT_BORROWED, value: label }], type) as number;
}
