import type { ReactNode } from "react";
import { createElement } from "react";
import type { ColumnViewColumnProps, MenuItemProps, MenuSectionProps, MenuSubmenuProps } from "../../jsx.js";
import { createMenuChild } from "../compound.js";

type ColumnViewChildren = {
    Column: <T = unknown>(props: ColumnViewColumnProps<T>) => ReactNode;
    MenuItem: (props: MenuItemProps) => ReactNode;
    MenuSection: (props: MenuSectionProps) => ReactNode;
    MenuSubmenu: (props: MenuSubmenuProps) => ReactNode;
};

export const columnViewChildren: ColumnViewChildren = {
    Column: <T = unknown>(props: ColumnViewColumnProps<T>): ReactNode =>
        createElement("ColumnViewColumn", props, props.children),
    MenuItem: createMenuChild<MenuItemProps>("MenuItem"),
    MenuSection: createMenuChild<MenuSectionProps>("MenuSection"),
    MenuSubmenu: createMenuChild<MenuSubmenuProps>("MenuSubmenu"),
};
