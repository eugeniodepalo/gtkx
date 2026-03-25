import type { ReactNode } from "react";
import type {
    AdwAlertDialogProps,
    AdwApplicationWindowProps,
    AdwBottomSheetProps,
    AdwFlapProps,
    AdwMessageDialogProps,
    AdwOverlaySplitViewProps,
    AdwPreferencesGroupProps,
    AdwPreferencesPageProps,
    AdwSplitButtonProps,
    AdwTabBarProps,
    AdwWindowProps,
    GtkCenterBoxProps,
    GtkExpanderProps,
    GtkFrameProps,
    GtkPanedProps,
    GtkWindowProps,
} from "../../generated/jsx.js";
import { createSlotWidget } from "../slot-widget.js";

/** Top-level GTK window with a `titlebar` slot for custom title bars. */
export const GtkWindow: (props: GtkWindowProps) => ReactNode = createSlotWidget<GtkWindowProps>("GtkWindow", [
    "titlebar",
]);

/** Libadwaita application window with a `content` slot. */
export const AdwWindow: (props: AdwWindowProps) => ReactNode = createSlotWidget<AdwWindowProps>("AdwWindow", [
    "content",
]);

/** Libadwaita top-level application window with a `content` slot. */
export const AdwApplicationWindow: (props: AdwApplicationWindowProps) => ReactNode =
    createSlotWidget<AdwApplicationWindowProps>("AdwApplicationWindow", ["content"]);

/** Resizable split pane with `startChild` and `endChild` slots. */
export const GtkPaned: (props: GtkPanedProps) => ReactNode = createSlotWidget<GtkPanedProps>("GtkPaned", [
    "startChild",
    "endChild",
]);

/** Three-slot horizontal layout with `startWidget`, `centerWidget`, and `endWidget` slots. */
export const GtkCenterBox: (props: GtkCenterBoxProps) => ReactNode = createSlotWidget<GtkCenterBoxProps>(
    "GtkCenterBox",
    ["centerWidget", "endWidget", "startWidget"],
);

export const GtkExpander: (props: GtkExpanderProps) => ReactNode = createSlotWidget<GtkExpanderProps>("GtkExpander", [
    "labelWidget",
]);

export const GtkFrame: (props: GtkFrameProps) => ReactNode = createSlotWidget<GtkFrameProps>("GtkFrame", [
    "labelWidget",
]);

export const AdwBottomSheet: (props: AdwBottomSheetProps) => ReactNode = createSlotWidget<AdwBottomSheetProps>(
    "AdwBottomSheet",
    ["bottomBar", "content", "sheet"],
);

export const AdwFlap: (props: AdwFlapProps) => ReactNode = createSlotWidget<AdwFlapProps>("AdwFlap", [
    "content",
    "flap",
    "separator",
]);

export const AdwMessageDialog: (props: AdwMessageDialogProps) => ReactNode = createSlotWidget<AdwMessageDialogProps>(
    "AdwMessageDialog",
    ["extraChild"],
);

export const AdwOverlaySplitView: (props: AdwOverlaySplitViewProps) => ReactNode =
    createSlotWidget<AdwOverlaySplitViewProps>("AdwOverlaySplitView", ["content", "sidebar"]);

export const AdwSplitButton: (props: AdwSplitButtonProps) => ReactNode = createSlotWidget<AdwSplitButtonProps>(
    "AdwSplitButton",
    ["popover"],
);

export const AdwTabBar: (props: AdwTabBarProps) => ReactNode = createSlotWidget<AdwTabBarProps>("AdwTabBar", [
    "endActionWidget",
    "startActionWidget",
]);

export const AdwPreferencesGroup: (props: AdwPreferencesGroupProps) => ReactNode =
    createSlotWidget<AdwPreferencesGroupProps>("AdwPreferencesGroup", ["headerSuffix"]);

export const AdwPreferencesPage: (props: AdwPreferencesPageProps) => ReactNode =
    createSlotWidget<AdwPreferencesPageProps>("AdwPreferencesPage", ["banner"]);

export const AdwAlertDialog: (props: AdwAlertDialogProps) => ReactNode = createSlotWidget<AdwAlertDialogProps>(
    "AdwAlertDialog",
    ["extraChild"],
);
