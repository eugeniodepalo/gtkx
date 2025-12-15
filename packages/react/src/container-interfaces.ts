import type * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "./node.js";

/**
 * Type for containers that manage child widgets with attach/detach semantics.
 * Used by ActionBar, FlowBox, ListBox, Overlay.
 */
export type ChildContainer = {
    attachChild(child: Gtk.Widget): void;
    insertChildBefore(child: Gtk.Widget, before: Gtk.Widget): void;
    detachChild(child: Gtk.Widget): void;
};

/**
 * Type for page-based containers like Notebook.
 */
export type PageContainer = {
    addPage(child: Gtk.Widget, label: string): void;
    insertPageBefore(child: Gtk.Widget, label: string, beforeChild: Gtk.Widget): void;
    removePage(child: Gtk.Widget): void;
    updatePageLabel(child: Gtk.Widget, label: string): void;
};

/**
 * Props for Stack pages.
 * Used by Gtk.Stack and Adw.ViewStack.
 */
export type StackPageProps = {
    name?: string;
    title?: string;
    iconName?: string;
    needsAttention?: boolean;
    visible?: boolean;
    useUnderline?: boolean;
    badgeNumber?: number;
};

/**
 * Type for Stack containers.
 */
export type StackPageContainer = {
    addStackPage(child: Gtk.Widget, props: StackPageProps): void;
    insertStackPageBefore(child: Gtk.Widget, props: StackPageProps, beforeChild: Gtk.Widget): void;
    removeStackPage(child: Gtk.Widget): void;
    updateStackPageProps(child: Gtk.Widget, props: StackPageProps): void;
};

/**
 * Type for grid-based containers.
 */
export type GridContainer = {
    attachToGrid(child: Gtk.Widget, column: number, row: number, colSpan: number, rowSpan: number): void;
    removeFromGrid(child: Gtk.Widget): void;
};

/**
 * Type for item-based containers like ListView, ColumnView, DropDown.
 */
export type ItemContainer<T> = {
    addItem(item: T): void;
    insertItemBefore(item: T, beforeItem: T): void;
    removeItem(item: T): void;
    updateItem(oldItem: T, newItem: T): void;
};

/**
 * Type for column-based containers like ColumnView.
 * Note: Column type is generic to support both raw Gtk.ColumnViewColumn and wrapper nodes.
 */
export type ColumnContainer = {
    addColumn(column: unknown): void;
    insertColumnBefore(column: unknown, beforeColumn: unknown): void;
    removeColumn(column: unknown): void;
    getItems(): unknown[];
    getSortFn(): ((a: unknown, b: unknown, columnId: string) => number) | null;
};

export const isChildContainer = (node: Node): node is Node & ChildContainer =>
    "attachChild" in node && "detachChild" in node && "insertChildBefore" in node;

export const isPageContainer = (node: Node): node is Node & PageContainer =>
    "addPage" in node && "removePage" in node && "insertPageBefore" in node && "updatePageLabel" in node;

export const isStackPageContainer = (node: Node): node is Node & StackPageContainer =>
    "addStackPage" in node && "removeStackPage" in node && "updateStackPageProps" in node;

export const isGridContainer = (node: Node): node is Node & GridContainer =>
    "attachToGrid" in node && "removeFromGrid" in node;

export const isItemContainer = <T>(node: Node): node is Node & ItemContainer<T> =>
    "addItem" in node && "insertItemBefore" in node && "removeItem" in node && "updateItem" in node;

export const isColumnContainer = (node: Node): node is Node & ColumnContainer =>
    "addColumn" in node && "removeColumn" in node && "getSortFn" in node;

/**
 * Type for containers that support packStart/packEnd semantics.
 * Used by HeaderBar, ActionBar.
 */
export type PackContainer = {
    packStart(child: Gtk.Widget): void;
    packEnd(child: Gtk.Widget): void;
    removeFromPack(child: Gtk.Widget): void;
};

export const isPackContainer = (node: Node): node is Node & PackContainer =>
    "packStart" in node && "packEnd" in node && "removeFromPack" in node;
