import "react";
import type { ReactElement } from "react";
import { createElement } from "react";
import type {
    ColumnViewColumnProps,
    ColumnViewRootProps,
    GridChildProps,
    ListItemProps,
    ListViewRenderProps,
    MenuItemProps,
    MenuRootProps,
    MenuSectionProps,
    MenuSubmenuProps,
    NotebookPageProps,
    SlotProps,
    StackPageProps,
    StackRootProps,
    StringListItemProps,
} from "./types.js";

export type {
    ColumnViewColumnProps,
    ColumnViewRootProps,
    GridChildProps,
    ListItemProps,
    ListViewRenderProps,
    MenuItemProps,
    MenuRootProps,
    MenuSectionProps,
    MenuSubmenuProps,
    NotebookPageProps,
    SlotProps,
    StackPageProps,
    StackRootProps,
    StringListItemProps,
};

export const ApplicationMenu = "ApplicationMenu" as const;

function MenuItem(props: MenuItemProps): ReactElement {
    return createElement("Menu.Item", props);
}

function MenuSection(props: MenuSectionProps): ReactElement {
    return createElement("Menu.Section", props);
}

function MenuSubmenu(props: MenuSubmenuProps): ReactElement {
    return createElement("Menu.Submenu", props);
}

export const Menu = {
    Item: MenuItem,
    Section: MenuSection,
    Submenu: MenuSubmenu,
};
