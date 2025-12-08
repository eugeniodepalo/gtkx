import type * as Gtk from "@gtkx/ffi/gtk";
import { type Accessible, AccessibleRole } from "@gtkx/ffi/gtk";

export const asAccessible = (widget: Gtk.Widget): Accessible => widget as unknown as Accessible;

const EDITABLE_ROLES = new Set([AccessibleRole.TEXT_BOX, AccessibleRole.SEARCH_BOX, AccessibleRole.SPIN_BUTTON]);

export const isEditable = (widget: Gtk.Widget): boolean => {
    const role = asAccessible(widget).getAccessibleRole();
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
    const role = asAccessible(widget).getAccessibleRole();
    return LABEL_ROLES.has(role);
};
