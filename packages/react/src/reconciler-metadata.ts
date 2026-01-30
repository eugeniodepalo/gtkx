/**
 * Reconciler Metadata
 *
 * Classification constants and interface method arrays used by reconciler nodes.
 * This is the React package's own knowledge about widget behavior,
 * decoupled from codegen which only knows about GIR definitions.
 */

import * as Adw from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";

export const LIST_WIDGET_CLASSES = [Gtk.GridView, Gtk.ListView] as const;

export const DROP_DOWN_CLASSES = [Adw.ComboRow, Gtk.DropDown] as const;

export const COLUMN_VIEW_CLASSES = [Gtk.ColumnView] as const;

export const AUTOWRAP_CLASSES = [Gtk.FlowBox, Gtk.ListBox] as const;

export const STACK_CLASSES = [Gtk.Stack, Adw.ViewStack] as const;

export const NOTEBOOK_CLASSES = [Gtk.Notebook] as const;

export const POPOVER_MENU_CLASSES = [Gtk.MenuButton, Gtk.PopoverMenu, Gtk.PopoverMenuBar] as const;

export const PACK_INTERFACE_METHODS = ["packStart", "packEnd", "remove"];

export const PREFIX_SUFFIX_INTERFACE_METHODS = ["addPrefix", "addSuffix", "remove"];

export const ADJUSTABLE_INTERFACE_METHODS = ["getAdjustment", "setAdjustment", "getValue"];
