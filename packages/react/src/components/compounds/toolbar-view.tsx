import type { ReactNode } from "react";
import type { AdwToolbarViewProps } from "../../generated/jsx.js";
import { createContainerSlotChild } from "../compound.js";
import { createSlotWidget } from "../slot-widget.js";

export const AdwToolbarView: ((props: AdwToolbarViewProps) => ReactNode) & {
    AddTopBar: (props: { children?: ReactNode }) => ReactNode;
    AddBottomBar: (props: { children?: ReactNode }) => ReactNode;
} = Object.assign(createSlotWidget<AdwToolbarViewProps>("AdwToolbarView", ["content"]), {
    AddTopBar: createContainerSlotChild("addTopBar"),
    AddBottomBar: createContainerSlotChild("addBottomBar"),
});
