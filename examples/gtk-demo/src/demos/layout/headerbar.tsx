import { GtkBox, GtkButton, GtkHeaderBar, GtkSwitch, GtkTextView, x } from "@gtkx/react";
import type { Demo } from "../types.js";
import sourceCode from "./headerbar.tsx?raw";

const HeaderBarDemo = () => {
    return (
        <>
            <x.Slot for="GtkWindow" id="titlebar">
                <GtkHeaderBar>
                    <x.PackStart>
                        <GtkBox cssClasses={["linked"]}>
                            <GtkButton iconName="go-previous-symbolic" tooltipText="Back" />
                            <GtkButton iconName="go-next-symbolic" tooltipText="Forward" />
                        </GtkBox>
                    </x.PackStart>
                    <x.PackStart>
                        <GtkSwitch />
                    </x.PackStart>
                    <x.PackEnd>
                        <GtkButton iconName="mail-send-receive-symbolic" tooltipText="Check out" />
                    </x.PackEnd>
                </GtkHeaderBar>
            </x.Slot>
            <GtkTextView hexpand vexpand />
        </>
    );
};

export const headerbarDemo: Demo = {
    id: "headerbar",
    title: "Header Bar",
    description:
        "GtkHeaderBar is a container that is suitable for implementing window titlebars. One of its features is that it can position a title centered with regard to the full width, regardless of variable-width content at the left or right. It is commonly used with gtk_window_set_titlebar().",
    keywords: ["headerbar", "GtkHeaderBar", "GtkWindowHandle", "GtkWindowControls", "titlebar"],
    component: HeaderBarDemo,
    sourceCode,
};
