import type { ReactNode } from "react";
import type { AdwActionRowProps, AdwEntryRowProps, AdwExpanderRowProps } from "../../generated/jsx.js";
import { createContainerSlotChild } from "../compound.js";
import { createSlotWidget } from "../slot-widget.js";

export const AdwActionRow: ((props: AdwActionRowProps) => ReactNode) & {
    AddPrefix: (props: { children?: ReactNode }) => ReactNode;
    AddSuffix: (props: { children?: ReactNode }) => ReactNode;
} = Object.assign(createSlotWidget<AdwActionRowProps>("AdwActionRow", ["activatableWidget"]), {
    AddPrefix: createContainerSlotChild("addPrefix"),
    AddSuffix: createContainerSlotChild("addSuffix"),
});

export const AdwEntryRow: ((props: AdwEntryRowProps) => ReactNode) & {
    AddPrefix: (props: { children?: ReactNode }) => ReactNode;
    AddSuffix: (props: { children?: ReactNode }) => ReactNode;
} = Object.assign(createSlotWidget<AdwEntryRowProps>("AdwEntryRow", []), {
    AddPrefix: createContainerSlotChild("addPrefix"),
    AddSuffix: createContainerSlotChild("addSuffix"),
});

export const AdwExpanderRow: ((props: AdwExpanderRowProps) => ReactNode) & {
    AddPrefix: (props: { children?: ReactNode }) => ReactNode;
    AddSuffix: (props: { children?: ReactNode }) => ReactNode;
    AddRow: (props: { children?: ReactNode }) => ReactNode;
    AddAction: (props: { children?: ReactNode }) => ReactNode;
} = Object.assign(createSlotWidget<AdwExpanderRowProps>("AdwExpanderRow", []), {
    AddPrefix: createContainerSlotChild("addPrefix"),
    AddSuffix: createContainerSlotChild("addSuffix"),
    AddRow: createContainerSlotChild("addRow"),
    AddAction: createContainerSlotChild("addAction"),
});
