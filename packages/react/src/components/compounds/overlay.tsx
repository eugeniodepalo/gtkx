import type { ReactNode } from "react";
import type { GtkOverlayProps } from "../../generated/jsx.js";
import type { OverlayChildProps } from "../../jsx.js";
import { createVirtualChild } from "../compound.js";
import { createSlotWidget } from "../slot-widget.js";

export const GtkOverlay: ((props: GtkOverlayProps) => ReactNode) & {
    Child: (props: OverlayChildProps) => ReactNode;
} = Object.assign(createSlotWidget<GtkOverlayProps>("GtkOverlay", []), {
    Child: createVirtualChild<OverlayChildProps>("OverlayChild"),
});
