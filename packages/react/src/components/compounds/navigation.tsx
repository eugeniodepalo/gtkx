import { createElement, type ReactNode } from "react";
import type { AdwNavigationSplitViewProps, AdwNavigationViewProps, WidgetSlotNames } from "../../generated/jsx.js";
import type { NavigationPageBaseProps } from "../../jsx.js";
import { createSlotWidget } from "../slot-widget.js";

/** @internal */
type NavigationViewPageProps = NavigationPageBaseProps & { id: string };
/** @internal */
type NavigationSplitViewPageProps = NavigationPageBaseProps & {
    id: WidgetSlotNames["AdwNavigationSplitView"];
};

export const AdwNavigationView: ((props: AdwNavigationViewProps) => ReactNode) & {
    Page: (props: NavigationViewPageProps) => ReactNode;
} = Object.assign(createSlotWidget<AdwNavigationViewProps>("AdwNavigationView", []), {
    Page: (props: NavigationViewPageProps): ReactNode =>
        createElement("NavigationPage", { ...props, for: "AdwNavigationView" }, props.children),
});

export const AdwNavigationSplitView: ((props: AdwNavigationSplitViewProps) => ReactNode) & {
    Page: (props: NavigationSplitViewPageProps) => ReactNode;
} = Object.assign(createSlotWidget<AdwNavigationSplitViewProps>("AdwNavigationSplitView", ["content", "sidebar"]), {
    Page: (props: NavigationSplitViewPageProps): ReactNode =>
        createElement("NavigationPage", { ...props, for: "AdwNavigationSplitView" }, props.children),
});
