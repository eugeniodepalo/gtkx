import type { ReactNode } from "react";
import type { GtkSourceViewProps, GtkTextViewProps } from "../../generated/jsx.js";
import type { TextAnchorProps, TextPaintableProps, TextTagProps } from "../../jsx.js";
import { createVirtualChild } from "../compound.js";
import { createSlotWidget } from "../slot-widget.js";

/** @internal */
type TextChildren = {
    Tag: (props: TextTagProps) => ReactNode;
    Anchor: (props: TextAnchorProps) => ReactNode;
    Paintable: (props: TextPaintableProps) => ReactNode;
};

const textChildren: TextChildren = {
    Tag: createVirtualChild<TextTagProps>("TextTag"),
    Anchor: createVirtualChild<TextAnchorProps>("TextAnchor"),
    Paintable: createVirtualChild<TextPaintableProps>("TextPaintable"),
};

export const GtkTextView: ((props: GtkTextViewProps) => ReactNode) & TextChildren = Object.assign(
    createSlotWidget<GtkTextViewProps>("GtkTextView", []),
    textChildren,
);

export const GtkSourceView: ((props: GtkSourceViewProps) => ReactNode) & TextChildren = Object.assign(
    createSlotWidget<GtkSourceViewProps>("GtkSourceView", []),
    textChildren,
);
