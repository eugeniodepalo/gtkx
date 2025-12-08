import type { SortType } from "@gtkx/ffi/gtk";
import type { ReactElement, ReactNode } from "react";

/**
 * Props for slot components that accept children.
 * Used by container widgets that render child elements in designated slots.
 */
export interface SlotProps {
    children?: ReactNode;
}

export interface ListItemProps<I = unknown> {
    item: I;
}

export interface GridChildProps extends SlotProps {
    column?: number;
    row?: number;
    columnSpan?: number;
    rowSpan?: number;
}

/**
 * Render function for ListView/GridView items.
 * Called with null during setup (for loading state) and with the actual item during bind.
 */
export type RenderItemFn<T> = (item: T | null) => ReactElement;

export interface ListViewRenderProps<T = unknown> {
    renderItem: RenderItemFn<T>;
}

/**
 * Comparison function for sorting items by column.
 * Returns negative if a < b, 0 if a === b, positive if a > b.
 * @param a - First item to compare
 * @param b - Second item to compare
 * @param columnId - The ID of the column being sorted
 */
export type ColumnSortFn<T, C extends string = string> = (a: T, b: T, columnId: C) => number;

export interface ColumnViewColumnProps<T = unknown> {
    title?: string;
    expand?: boolean;
    resizable?: boolean;
    fixedWidth?: number;
    id?: string;
    /**
     * Render function for column cells.
     * Called with null during setup (for loading state) and with the actual item during bind.
     * Always annotate your callback parameter type to include null, e.g.: `(item: MyItem | null) => ...`
     */
    renderCell: (item: T | null) => ReactElement;
}

export interface ColumnViewRootProps<T = unknown, C extends string = string> {
    sortColumn?: C | null;
    sortOrder?: SortType;
    onSortChange?: (column: C | null, order: SortType) => void;
    sortFn?: ColumnSortFn<T, C>;
}

export interface NotebookPageProps extends SlotProps {
    label: string;
}
