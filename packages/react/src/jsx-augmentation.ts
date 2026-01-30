/**
 * JSX Augmentation
 *
 * Extends generated GIR-derived interfaces with reconciler-specific props.
 * Uses TypeScript declaration merging to add custom props without
 * modifying generated code.
 */

import type * as Adw from "@gtkx/ffi/adw";
import type * as cairo from "@gtkx/ffi/cairo";
import type * as Gdk from "@gtkx/ffi/gdk";
import type * as Gtk from "@gtkx/ffi/gtk";
import type * as GtkSource from "@gtkx/ffi/gtksource";
import type * as Pango from "@gtkx/ffi/pango";
import type { ReactNode } from "react";

declare module "./generated/jsx.js" {
    interface GtkRangeProps {
        value?: number;
        lower?: number;
        upper?: number;
        stepIncrement?: number;
        pageIncrement?: number;
        pageSize?: number;
        onValueChanged?: ((value: number, self: Gtk.Range) => void) | null;
    }

    interface GtkScaleProps {
        marks?: Array<{ value: number; position?: Gtk.PositionType; label?: string | null }> | null;
    }

    interface GtkScaleButtonProps {
        value?: number;
        lower?: number;
        upper?: number;
        stepIncrement?: number;
        pageIncrement?: number;
        pageSize?: number;
        onValueChanged?: ((value: number, self: Gtk.ScaleButton) => void) | null;
    }

    interface GtkSpinButtonProps {
        value?: number;
        lower?: number;
        upper?: number;
        stepIncrement?: number;
        pageIncrement?: number;
        pageSize?: number;
        onValueChanged?: ((value: number, self: Gtk.SpinButton) => void) | null;
    }

    interface AdwSpinRowProps {
        value?: number;
        lower?: number;
        upper?: number;
        stepIncrement?: number;
        pageIncrement?: number;
        pageSize?: number;
        onValueChanged?: ((value: number, self: Adw.SpinRow) => void) | null;
    }

    interface GtkCalendarProps {
        markedDays?: number[] | null;
    }

    interface GtkLevelBarProps {
        offsets?: Array<{ id: string; value: number }> | null;
    }

    interface GtkTextViewProps {
        enableUndo?: boolean;
        onBufferChanged?: ((buffer: Gtk.TextBuffer) => void) | null;
        onTextInserted?: ((buffer: Gtk.TextBuffer, offset: number, text: string) => void) | null;
        onTextDeleted?: ((buffer: Gtk.TextBuffer, startOffset: number, endOffset: number) => void) | null;
        onCanUndoChanged?: ((canUndo: boolean) => void) | null;
        onCanRedoChanged?: ((canRedo: boolean) => void) | null;
    }

    interface GtkSourceViewProps {
        enableUndo?: boolean;
        onBufferChanged?: ((buffer: Gtk.TextBuffer) => void) | null;
        onTextInserted?: ((buffer: Gtk.TextBuffer, offset: number, text: string) => void) | null;
        onTextDeleted?: ((buffer: Gtk.TextBuffer, startOffset: number, endOffset: number) => void) | null;
        onCanUndoChanged?: ((canUndo: boolean) => void) | null;
        onCanRedoChanged?: ((canRedo: boolean) => void) | null;
        language?: string | GtkSource.Language;
        styleScheme?: string | GtkSource.StyleScheme;
        highlightSyntax?: boolean;
        highlightMatchingBrackets?: boolean;
        implicitTrailingNewline?: boolean;
        onCursorMoved?: (() => void) | null;
        onHighlightUpdated?: ((start: Gtk.TextIter, end: Gtk.TextIter) => void) | null;
    }

    interface GtkListViewProps {
        // biome-ignore lint/suspicious/noExplicitAny: Required for contravariant item type
        renderItem: (item: any) => ReactNode;
        estimatedItemHeight?: number;
        selected?: string[] | null;
        onSelectionChanged?: ((ids: string[]) => void) | null;
        selectionMode?: Gtk.SelectionMode | null;
    }

    interface GtkGridViewProps {
        // biome-ignore lint/suspicious/noExplicitAny: Required for contravariant item type
        renderItem: (item: any) => ReactNode;
        estimatedItemHeight?: number;
        selected?: string[] | null;
        onSelectionChanged?: ((ids: string[]) => void) | null;
        selectionMode?: Gtk.SelectionMode | null;
    }

    interface GtkColumnViewProps {
        selected?: string[] | null;
        onSelectionChanged?: ((ids: string[]) => void) | null;
        selectionMode?: Gtk.SelectionMode | null;
        sortColumn?: string | null;
        sortOrder?: Gtk.SortType | null;
        onSortChanged?: ((column: string | null, order: Gtk.SortType) => void) | null;
        estimatedRowHeight?: number | null;
    }

    interface GtkDropDownProps {
        selectedId?: string | null;
        onSelectionChanged?: ((id: string) => void) | null;
    }

    interface AdwComboRowProps {
        selectedId?: string | null;
        onSelectionChanged?: ((id: string) => void) | null;
    }

    interface GtkStackProps {
        page?: string | null;
        onPageChanged?: ((page: string | null, self: Gtk.Stack) => void) | null;
    }

    interface AdwViewStackProps {
        page?: string | null;
        onPageChanged?: ((page: string | null, self: Adw.ViewStack) => void) | null;
    }

    interface AdwNavigationViewProps {
        history?: string[] | null;
        onHistoryChanged?: ((history: string[]) => void) | null;
    }

    interface GtkWindowProps {
        onClose?: (() => void) | null;
    }

    interface GtkDrawingAreaProps {
        onDraw?: ((self: Gtk.DrawingArea, cr: cairo.Context, width: number, height: number) => void) | null;
    }

    interface GtkColorDialogButtonProps {
        onRgbaChanged?: ((rgba: Gdk.RGBA) => void) | null;
        title?: string;
        modal?: boolean;
        withAlpha?: boolean;
    }

    interface GtkFontDialogButtonProps {
        onFontDescChanged?: ((fontDesc: Pango.FontDescription) => void) | null;
        title?: string;
        modal?: boolean;
        language?: Pango.Language | null;
        useFont?: boolean;
        useSize?: boolean;
        level?: Gtk.FontLevel;
    }

    interface GtkAboutDialogProps {
        creditSections?: Array<{ name: string; people: string[] }>;
    }

    interface GtkSearchBarProps {
        onSearchModeChanged?: ((searchMode: boolean) => void) | null;
    }

    interface AdwToggleGroupProps {
        onActiveChanged?: ((active: number, activeName: string | null) => void) | null;
    }

    interface GtkDragSourceProps {
        icon?: Gdk.Paintable | null;
        iconHotX?: number;
        iconHotY?: number;
    }

    interface GtkDropTargetProps {
        types?: number[];
    }
}
