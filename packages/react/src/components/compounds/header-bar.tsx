import type { ReactNode } from "react";
import type { AdwHeaderBarProps, GtkHeaderBarProps } from "../../generated/jsx.js";
import { createContainerSlotChild } from "../compound.js";
import { createSlotWidget } from "../slot-widget.js";

export const GtkHeaderBar: ((props: GtkHeaderBarProps) => ReactNode) & {
    PackStart: (props: { children?: ReactNode }) => ReactNode;
    PackEnd: (props: { children?: ReactNode }) => ReactNode;
} = Object.assign(createSlotWidget<GtkHeaderBarProps>("GtkHeaderBar", ["titleWidget"]), {
    PackStart: createContainerSlotChild("packStart"),
    PackEnd: createContainerSlotChild("packEnd"),
});

export const AdwHeaderBar: ((props: AdwHeaderBarProps) => ReactNode) & {
    PackStart: (props: { children?: ReactNode }) => ReactNode;
    PackEnd: (props: { children?: ReactNode }) => ReactNode;
} = Object.assign(createSlotWidget<AdwHeaderBarProps>("AdwHeaderBar", ["titleWidget"]), {
    PackStart: createContainerSlotChild("packStart"),
    PackEnd: createContainerSlotChild("packEnd"),
});
