import { getInterface } from "@gtkx/ffi";
import type * as Gtk from "@gtkx/ffi/gtk";
import { Accessible, AccessibleRole } from "@gtkx/ffi/gtk";

const EDITABLE_ROLES = new Set([AccessibleRole.TEXT_BOX, AccessibleRole.SEARCH_BOX, AccessibleRole.SPIN_BUTTON]);

export const isEditable = (widget: Gtk.Widget): boolean => {
    const role = getInterface(widget, Accessible).getAccessibleRole();
    return EDITABLE_ROLES.has(role);
};

const LABEL_ROLES = new Set([
    AccessibleRole.BUTTON,
    AccessibleRole.TOGGLE_BUTTON,
    AccessibleRole.CHECKBOX,
    AccessibleRole.RADIO,
    AccessibleRole.LABEL,
    AccessibleRole.MENU_ITEM,
    AccessibleRole.MENU_ITEM_CHECKBOX,
    AccessibleRole.MENU_ITEM_RADIO,
]);

export const hasLabel = (widget: Gtk.Widget): boolean => {
    const role = getInterface(widget, Accessible).getAccessibleRole();
    return LABEL_ROLES.has(role);
};
