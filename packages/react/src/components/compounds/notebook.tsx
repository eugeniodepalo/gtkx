import type { ReactNode } from "react";
import type { GtkNotebookProps } from "../../generated/jsx.js";
import type { NotebookPageProps, NotebookPageTabProps } from "../../jsx.js";
import { createVirtualChild } from "../compound.js";
import { createSlotWidget } from "../slot-widget.js";

export const GtkNotebook: ((props: GtkNotebookProps) => ReactNode) & {
    Page: (props: NotebookPageProps) => ReactNode;
    PageTab: (props: NotebookPageTabProps) => ReactNode;
} = Object.assign(createSlotWidget<GtkNotebookProps>("GtkNotebook", []), {
    Page: createVirtualChild<NotebookPageProps>("NotebookPage"),
    PageTab: createVirtualChild<NotebookPageTabProps>("NotebookPageTab"),
});
