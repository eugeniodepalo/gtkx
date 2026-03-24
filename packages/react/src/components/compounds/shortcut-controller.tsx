import type { ReactNode } from "react";
import type { GtkShortcutControllerProps } from "../../generated/jsx.js";
import type { ShortcutProps } from "../../jsx.js";
import { createVirtualChild } from "../compound.js";
import { createSlotWidget } from "../slot-widget.js";

export const GtkShortcutController: ((props: GtkShortcutControllerProps) => ReactNode) & {
    Shortcut: (props: ShortcutProps) => ReactNode;
} = Object.assign(createSlotWidget<GtkShortcutControllerProps>("GtkShortcutController", []), {
    Shortcut: createVirtualChild<ShortcutProps>("Shortcut"),
});
