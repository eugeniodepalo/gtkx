import type { ReactNode } from "react";
import type { GtkActionBarProps } from "../../generated/jsx.js";
import { createContainerSlotChild } from "../compound.js";
import { createSlotWidget } from "../slot-widget.js";

export const GtkActionBar: ((props: GtkActionBarProps) => ReactNode) & {
    PackStart: (props: { children?: ReactNode }) => ReactNode;
    PackEnd: (props: { children?: ReactNode }) => ReactNode;
} = Object.assign(createSlotWidget<GtkActionBarProps>("GtkActionBar", []), {
    PackStart: createContainerSlotChild("packStart"),
    PackEnd: createContainerSlotChild("packEnd"),
});
