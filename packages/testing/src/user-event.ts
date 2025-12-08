import { getObject } from "@gtkx/ffi";
import type * as Gtk from "@gtkx/ffi/gtk";
import {
    AccessibleRole,
    CheckButton,
    ComboBox,
    DirectionType,
    DropDown,
    Editable,
    ListBox,
    ListBoxRow,
    ToggleButton,
    Widget,
} from "@gtkx/ffi/gtk";
import { fireEvent } from "./fire-event.js";
import { tick } from "./timing.js";
import { asAccessible, isEditable } from "./widget.js";

export interface TabOptions {
    /** If true, navigates backwards (Shift+Tab behavior) */
    shift?: boolean;
}

const TOGGLEABLE_ROLES = new Set([AccessibleRole.CHECKBOX, AccessibleRole.RADIO, AccessibleRole.TOGGLE_BUTTON]);

const isToggleable = (widget: Gtk.Widget): boolean => {
    const role = asAccessible(widget).getAccessibleRole();
    return TOGGLEABLE_ROLES.has(role);
};

const click = async (element: Gtk.Widget): Promise<void> => {
    if (isToggleable(element)) {
        const role = asAccessible(element).getAccessibleRole();
        if (role === AccessibleRole.CHECKBOX || role === AccessibleRole.RADIO) {
            const checkButton = getObject(element.ptr, CheckButton);
            checkButton.setActive(!checkButton.getActive());
        } else {
            const toggleButton = getObject(element.ptr, ToggleButton);
            toggleButton.setActive(!toggleButton.getActive());
        }
        // Note: setActive() automatically emits the "toggled" signal, so we don't need to emit it manually
    } else {
        fireEvent(element, "clicked");
    }
    await tick();
};

const dblClick = async (element: Gtk.Widget): Promise<void> => {
    fireEvent(element, "clicked");
    await tick();
    fireEvent(element, "clicked");
    await tick();
};

const tripleClick = async (element: Gtk.Widget): Promise<void> => {
    fireEvent(element, "clicked");
    await tick();
    fireEvent(element, "clicked");
    await tick();
    fireEvent(element, "clicked");
    await tick();
};

const activate = async (element: Gtk.Widget): Promise<void> => {
    element.activate();
    await tick();
};

const tab = async (element: Gtk.Widget, options?: TabOptions): Promise<void> => {
    const direction = options?.shift ? DirectionType.TAB_BACKWARD : DirectionType.TAB_FORWARD;
    const root = element.getRoot();
    if (root) {
        const rootWidget = getObject(root.ptr, Widget);
        rootWidget.childFocus(direction);
    }
    await tick();
};

const type = async (element: Gtk.Widget, text: string): Promise<void> => {
    if (!isEditable(element)) {
        throw new Error("Cannot type into element: element is not editable (TEXT_BOX, SEARCH_BOX, or SPIN_BUTTON)");
    }

    const editable = getObject(element.ptr, Editable);
    const currentText = editable.getText();
    editable.setText(currentText + text);
    await tick();
};

const clear = async (element: Gtk.Widget): Promise<void> => {
    if (!isEditable(element)) {
        throw new Error("Cannot clear element: element is not editable (TEXT_BOX, SEARCH_BOX, or SPIN_BUTTON)");
    }

    const editable = getObject(element.ptr, Editable);
    editable.setText("");
    await tick();
};

const SELECTABLE_ROLES = new Set([AccessibleRole.COMBO_BOX, AccessibleRole.LIST]);

const isSelectable = (widget: Gtk.Widget): boolean => {
    const role = asAccessible(widget).getAccessibleRole();
    return SELECTABLE_ROLES.has(role);
};

const selectOptions = async (element: Gtk.Widget, values: string | string[] | number | number[]): Promise<void> => {
    if (!isSelectable(element)) {
        throw new Error("Cannot select options: element is not a selectable widget (COMBO_BOX or LIST)");
    }

    const role = asAccessible(element).getAccessibleRole();
    const valueArray = Array.isArray(values) ? values : [values];

    if (role === AccessibleRole.COMBO_BOX) {
        if (valueArray.length > 1) {
            throw new Error("Cannot select multiple options on a ComboBox/DropDown");
        }
        const value = valueArray[0];
        if (typeof value !== "number") {
            throw new Error("ComboBox/DropDown selection requires a numeric index");
        }

        const isDropDown = element.constructor.name === "DropDown";
        if (isDropDown) {
            getObject(element.ptr, DropDown).setSelected(value);
        } else {
            getObject(element.ptr, ComboBox).setActive(value);
        }
    } else if (role === AccessibleRole.LIST) {
        const listBox = getObject(element.ptr, ListBox);
        for (const value of valueArray) {
            if (typeof value !== "number") {
                throw new Error("ListBox selection requires numeric indices");
            }
            const row = listBox.getRowAtIndex(value);
            if (row) {
                listBox.selectRow(row);
            }
        }
    }

    await tick();
};

const deselectOptions = async (element: Gtk.Widget, values: number | number[]): Promise<void> => {
    const role = asAccessible(element).getAccessibleRole();

    if (role !== AccessibleRole.LIST) {
        throw new Error("Cannot deselect options: only ListBox supports deselection");
    }

    const listBox = getObject(element.ptr, ListBox);
    const valueArray = Array.isArray(values) ? values : [values];

    for (const value of valueArray) {
        const row = listBox.getRowAtIndex(value);
        if (row) {
            listBox.unselectRow(getObject(row.ptr, ListBoxRow));
        }
    }

    await tick();
};

/**
 * Simulates user interactions with GTK widgets. Provides methods that mimic
 * real user behavior like clicking, typing, and clearing input fields.
 */
export const userEvent = {
    click,
    dblClick,
    tripleClick,
    activate,
    tab,
    type,
    clear,
    selectOptions,
    deselectOptions,
};
