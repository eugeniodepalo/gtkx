import * as Gtk from "@gtkx/ffi/gtk";

const EDITABLE_ROLES = new Set([
    Gtk.AccessibleRole.TEXT_BOX,
    Gtk.AccessibleRole.SEARCH_BOX,
    Gtk.AccessibleRole.SPIN_BUTTON,
]);

export const isEditable = (widget: Gtk.Widget): boolean => {
    return EDITABLE_ROLES.has(widget.getAccessibleRole());
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

export const hasLabel = (widget: Gtk.Widget): boolean => {
    return LABEL_ROLES.has(widget.getAccessibleRole());
};
