import type { ReactNode } from "react";
import type { GtkMenuButtonProps, GtkPopoverMenuBarProps, GtkPopoverMenuProps } from "../../generated/jsx.js";
import type { MenuItemProps, MenuSectionProps, MenuSubmenuProps } from "../../jsx.js";
import { createMenuChild } from "../compound.js";
import { createSlotWidget } from "../slot-widget.js";

/** @internal */
type MenuChildren = {
    MenuItem: (props: MenuItemProps) => ReactNode;
    MenuSection: (props: MenuSectionProps) => ReactNode;
    MenuSubmenu: (props: MenuSubmenuProps) => ReactNode;
};

const menuChildren: MenuChildren = {
    MenuItem: createMenuChild<MenuItemProps>("MenuItem"),
    MenuSection: createMenuChild<MenuSectionProps>("MenuSection"),
    MenuSubmenu: createMenuChild<MenuSubmenuProps>("MenuSubmenu"),
};

export const GtkMenuButton: ((props: GtkMenuButtonProps) => ReactNode) & MenuChildren = Object.assign(
    createSlotWidget<GtkMenuButtonProps>("GtkMenuButton", ["popover"]),
    menuChildren,
);

export const GtkPopoverMenu: ((props: GtkPopoverMenuProps) => ReactNode) & MenuChildren = Object.assign(
    createSlotWidget<GtkPopoverMenuProps>("GtkPopoverMenu", []),
    menuChildren,
);

export const GtkPopoverMenuBar: ((props: GtkPopoverMenuBarProps) => ReactNode) & MenuChildren = Object.assign(
    createSlotWidget<GtkPopoverMenuBarProps>("GtkPopoverMenuBar", []),
    menuChildren,
);
