import { GtkBox, GtkButton, GtkHeaderBar, GtkSwitch, GtkTextView } from "@gtkx/react";
import type { Demo } from "../types.js";
import sourceCode from "./headerbar.tsx?raw";

const Slot = "Slot" as const;

const HeaderBarDemo = () => {
    return (
        <>
            <Slot id="titlebar">
                <GtkHeaderBar>
                    <GtkHeaderBar.PackStart>
                        <GtkBox cssClasses={["linked"]}>
                            <GtkButton iconName="go-previous-symbolic" tooltipText="Back" />
                            <GtkButton iconName="go-next-symbolic" tooltipText="Forward" />
                        </GtkBox>
                    </GtkHeaderBar.PackStart>
                    <GtkHeaderBar.PackStart>
                        <GtkSwitch accessibleLabel="Change something" />
                    </GtkHeaderBar.PackStart>
                    <GtkHeaderBar.PackEnd>
                        <GtkButton iconName="mail-send-receive-symbolic" tooltipText="Check out" />
                    </GtkHeaderBar.PackEnd>
                </GtkHeaderBar>
            </Slot>
            <GtkTextView accessibleLabel="Content" />
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
    defaultWidth: 600,
    defaultHeight: 400,
};
