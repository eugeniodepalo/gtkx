import { getObject } from "@gtkx/ffi";
import * as Gtk from "@gtkx/ffi/gtk";

const EDITABLE_ROLES = new Set([
    Gtk.AccessibleRole.TEXT_BOX,
    Gtk.AccessibleRole.SEARCH_BOX,
    Gtk.AccessibleRole.SPIN_BUTTON,
]);

/**
 * Checks if a widget has an editable accessible role (text box, search box, or spin button).
 */
export const isEditable = (widget: Gtk.Widget): boolean => {
    const accessible = getObject(widget.id, Gtk.Accessible);
    if (!accessible) return false;
    return EDITABLE_ROLES.has(accessible.getAccessibleRole());
};

const LABEL_ROLES = new Set([
    Gtk.AccessibleRole.BUTTON,
    Gtk.AccessibleRole.TOGGLE_BUTTON,
    Gtk.AccessibleRole.CHECKBOX,
    Gtk.AccessibleRole.RADIO,
    Gtk.AccessibleRole.LABEL,
    Gtk.AccessibleRole.MENU_ITEM,
    Gtk.AccessibleRole.MENU_ITEM_CHECKBOX,
    Gtk.AccessibleRole.MENU_ITEM_RADIO,
]);

/**
 * Checks if a widget has an accessible role that supports labels.
 */
export const hasLabel = (widget: Gtk.Widget): boolean => {
    const accessible = getObject(widget.id, Gtk.Accessible);
    if (!accessible) return false;
    return LABEL_ROLES.has(accessible.getAccessibleRole());
};
