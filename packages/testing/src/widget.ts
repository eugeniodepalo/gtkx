import * as Gtk from "@gtkx/ffi/gtk";

const EDITABLE_ROLES = new Set([
    Gtk.AccessibleRole.TEXT_BOX,
    Gtk.AccessibleRole.SEARCH_BOX,
    Gtk.AccessibleRole.SPIN_BUTTON,
]);

export const isEditable = (widget: Gtk.Widget): boolean => {
    return EDITABLE_ROLES.has(widget.getAccessibleRole());
};
