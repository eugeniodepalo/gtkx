import type { ReactNode } from "react";
import type { GtkGridProps } from "../../generated/jsx.js";
import type { GridChildProps } from "../../jsx.js";
import { createVirtualChild } from "../compound.js";
import { createSlotWidget } from "../slot-widget.js";

export const GtkGrid: ((props: GtkGridProps) => ReactNode) & {
    Child: (props: GridChildProps) => ReactNode;
} = Object.assign(createSlotWidget<GtkGridProps>("GtkGrid", []), {
    Child: createVirtualChild<GridChildProps>("GridChild"),
});
