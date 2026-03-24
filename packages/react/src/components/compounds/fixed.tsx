import type { ReactNode } from "react";
import type { GtkFixedProps } from "../../generated/jsx.js";
import type { FixedChildProps } from "../../jsx.js";
import { createVirtualChild } from "../compound.js";
import { createSlotWidget } from "../slot-widget.js";

export const GtkFixed: ((props: GtkFixedProps) => ReactNode) & {
    Child: (props: FixedChildProps) => ReactNode;
} = Object.assign(createSlotWidget<GtkFixedProps>("GtkFixed", []), {
    Child: createVirtualChild<FixedChildProps>("FixedChild"),
});
