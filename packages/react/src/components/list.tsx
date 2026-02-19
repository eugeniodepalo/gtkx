import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { createElement, Fragment, type ReactNode, type Ref, useReducer, useRef } from "react";
import type {
    AdwComboRowProps,
    GtkColumnViewProps,
    GtkDropDownProps,
    GtkGridViewProps,
    GtkListViewProps,
} from "../generated/jsx.js";
import type { DropDownProps, GridViewProps, ListItem, ListViewProps } from "../jsx.js";
import type { BoundItem } from "../nodes/internal/bound-item.js";
import { createPortal } from "../portal.js";

type GenericListViewProps<T, S> = Omit<GtkListViewProps, keyof ListViewProps> & ListViewProps<T, S>;
type GenericGridViewProps<T> = Omit<GtkGridViewProps, keyof GridViewProps> & GridViewProps<T>;
type GenericDropDownProps<T, S> = Omit<GtkDropDownProps, keyof DropDownProps> & DropDownProps<T, S>;
type GenericComboRowProps<T, S> = Omit<AdwComboRowProps, keyof DropDownProps> & DropDownProps<T, S>;
type GenericColumnViewProps<T, S> = Omit<GtkColumnViewProps, "items" | "renderHeader"> & {
    items?: ListItem<T, S>[];
    renderHeader?: ((item: S) => ReactNode) | null;
};

function useListHandle() {
    const [, rerender] = useReducer((x: number) => x + 1, 0);
    const boundItemsRef = useRef<BoundItem[]>([]);
    const headerBoundItemsRef = useRef<BoundItem[]>([]);
    return { rerender, boundItemsRef, headerBoundItemsRef };
}

function renderListElement(intrinsicName: string, handle: ReturnType<typeof useListHandle>, props: object): ReactNode {
    const { rerender, boundItemsRef, headerBoundItemsRef } = handle;

    const portals: ReactNode[] = [];
    for (const [content, container, key] of boundItemsRef.current) {
        portals.push(createPortal(content, container, key));
    }
    for (const [content, container, key] of headerBoundItemsRef.current) {
        portals.push(createPortal(content, container, key));
    }

    return createElement(
        Fragment,
        null,
        createElement(intrinsicName, {
            ...(props as Record<string, unknown>),
            __boundItemsRef: boundItemsRef,
            __rerender: rerender,
            __headerBoundItemsRef: headerBoundItemsRef,
        }),
        ...portals,
    );
}

export function GtkListView<T = unknown, S = unknown>(
    props: GenericListViewProps<T, S> & { children?: ReactNode; ref?: Ref<Gtk.ListView> },
): ReactNode {
    return renderListElement("GtkListView", useListHandle(), props);
}

export function GtkGridView<T = unknown>(
    props: GenericGridViewProps<T> & { children?: ReactNode; ref?: Ref<Gtk.GridView> },
): ReactNode {
    return renderListElement("GtkGridView", useListHandle(), props);
}

export function GtkColumnView<T = unknown, S = unknown>(
    props: GenericColumnViewProps<T, S> & { children?: ReactNode; ref?: Ref<Gtk.ColumnView> },
): ReactNode {
    return renderListElement("GtkColumnView", useListHandle(), props);
}

export function GtkDropDown<T = unknown, S = unknown>(
    props: GenericDropDownProps<T, S> & { children?: ReactNode; ref?: Ref<Gtk.DropDown> },
): ReactNode {
    return renderListElement("GtkDropDown", useListHandle(), props);
}

export function AdwComboRow<T = unknown, S = unknown>(
    props: GenericComboRowProps<T, S> & { children?: ReactNode; ref?: Ref<Adw.ComboRow> },
): ReactNode {
    return renderListElement("AdwComboRow", useListHandle(), props);
}
