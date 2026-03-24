import type { ReactNode } from "react";
import type { AdwViewStackProps, GtkStackProps } from "../../generated/jsx.js";
import type { StackPageProps } from "../../jsx.js";
import { createVirtualChild } from "../compound.js";
import { createSlotWidget } from "../slot-widget.js";

export const GtkStack: ((props: GtkStackProps) => ReactNode) & {
    Page: (props: StackPageProps) => ReactNode;
} = Object.assign(createSlotWidget<GtkStackProps>("GtkStack", []), {
    Page: createVirtualChild<StackPageProps>("StackPage"),
});

export const AdwViewStack: ((props: AdwViewStackProps) => ReactNode) & {
    Page: (props: StackPageProps) => ReactNode;
} = Object.assign(createSlotWidget<AdwViewStackProps>("AdwViewStack", []), {
    Page: createVirtualChild<StackPageProps>("StackPage"),
});
