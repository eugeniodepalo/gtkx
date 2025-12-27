import * as Gtk from "@gtkx/ffi/gtk";
import {
    GtkBox,
    GtkButton,
    GtkHeaderBar,
    GtkLabel,
    GtkMenuButton,
    GtkSearchBar,
    GtkSearchEntry,
    Pack,
    Slot,
} from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

const sourceCode = `import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkHeaderBar, GtkLabel, GtkMenuButton, Slot } from "@gtkx/react";

const HeaderBarDemo = () => {
    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={20}>
            {/* Basic HeaderBar */}
            <GtkHeaderBar>
                <Slot for={GtkHeaderBar} id="titleWidget">
                    <GtkLabel label="My Application" cssClasses={["title"]} />
                </Slot>
                <GtkButton iconName="list-add-symbolic" />
                <Pack.End>
                    <GtkMenuButton iconName="open-menu-symbolic" />
                </Pack.End>
            </GtkHeaderBar>

            {/* HeaderBar with Multiple Controls */}
            <GtkHeaderBar showTitleButtons={false}>
                <GtkButton iconName="go-previous-symbolic" />
                <GtkButton iconName="go-next-symbolic" />
                <Slot for={GtkHeaderBar} id="titleWidget">
                    <GtkLabel label="Navigation" cssClasses={["title"]} />
                </Slot>
                <Pack.End>
                    <GtkButton label="Done" cssClasses={["suggested-action"]} />
                </Pack.End>
            </GtkHeaderBar>
        </GtkBox>
    );
};`;

const HeaderBarDemo = () => {
    const [searchMode, setSearchMode] = useState(false);
    const [subtitle, setSubtitle] = useState("Subtitle text");

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={20}
            marginStart={20}
            marginEnd={20}
            marginTop={20}
            marginBottom={20}
        >
            <GtkLabel label="HeaderBar" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            {/* About HeaderBar */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="About HeaderBar" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="GtkHeaderBar is a container typically used as a title bar for windows. It provides slots for controls at the start, end, and center (titleWidget)."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>

            {/* Basic HeaderBar */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Basic HeaderBar" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="A simple header with title and common controls."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={0} cssClasses={["card"]}>
                    <GtkHeaderBar showTitleButtons={false}>
                        <Slot for={GtkHeaderBar} id="titleWidget">
                            <GtkLabel label="My Application" cssClasses={["title"]} />
                        </Slot>
                        <Pack.End>
                            <GtkMenuButton iconName="open-menu-symbolic" />
                        </Pack.End>
                    </GtkHeaderBar>
                </GtkBox>
            </GtkBox>

            {/* HeaderBar with Start Controls */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Navigation Controls" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Add controls at the start (default child placement) for navigation or actions."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={0} cssClasses={["card"]}>
                    <GtkHeaderBar showTitleButtons={false}>
                        <GtkButton iconName="go-previous-symbolic" cssClasses={["flat"]} />
                        <GtkButton iconName="go-next-symbolic" cssClasses={["flat"]} />
                        <Slot for={GtkHeaderBar} id="titleWidget">
                            <GtkLabel label="History" cssClasses={["title"]} />
                        </Slot>
                        <Pack.End>
                            <GtkButton label="Clear" cssClasses={["destructive-action"]} />
                        </Pack.End>
                    </GtkHeaderBar>
                </GtkBox>
            </GtkBox>

            {/* HeaderBar with Title and Subtitle */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Title and Subtitle" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Use the titleWidget slot to create a custom title area with subtitle."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={0} cssClasses={["card"]}>
                    <GtkHeaderBar showTitleButtons={false}>
                        <GtkButton iconName="list-add-symbolic" cssClasses={["flat"]} />
                        <Slot for={GtkHeaderBar} id="titleWidget">
                            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={0} valign={Gtk.Align.CENTER}>
                                <GtkLabel label="Document.txt" cssClasses={["title"]} />
                                <GtkLabel label={subtitle} cssClasses={["subtitle"]} />
                            </GtkBox>
                        </Slot>
                        <Pack.End>
                            <GtkButton iconName="document-save-symbolic" cssClasses={["flat"]} />
                            <GtkMenuButton iconName="view-more-symbolic" cssClasses={["flat"]} />
                        </Pack.End>
                    </GtkHeaderBar>
                </GtkBox>
                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <GtkButton label="Modified" onClicked={() => setSubtitle("Modified")} />
                    <GtkButton label="Saved" onClicked={() => setSubtitle("Saved")} />
                    <GtkButton label="~/Documents" onClicked={() => setSubtitle("~/Documents")} />
                </GtkBox>
            </GtkBox>

            {/* HeaderBar with Search Toggle */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Search Integration" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="HeaderBar commonly integrates with a SearchBar below."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={0} cssClasses={["card"]}>
                    <GtkHeaderBar showTitleButtons={false}>
                        <GtkButton
                            iconName="edit-find-symbolic"
                            cssClasses={searchMode ? ["suggested-action"] : ["flat"]}
                            onClicked={() => setSearchMode(!searchMode)}
                        />
                        <Slot for={GtkHeaderBar} id="titleWidget">
                            <GtkLabel label="Files" cssClasses={["title"]} />
                        </Slot>
                        <Pack.End>
                            <GtkMenuButton iconName="open-menu-symbolic" cssClasses={["flat"]} />
                        </Pack.End>
                    </GtkHeaderBar>
                    <GtkSearchBar searchModeEnabled={searchMode}>
                        <GtkSearchEntry hexpand placeholderText="Search files..." />
                    </GtkSearchBar>
                </GtkBox>
            </GtkBox>

            {/* Action HeaderBar */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Action Header" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="Modal dialogs or selection mode often use action-focused headers."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
                <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={0} cssClasses={["card"]}>
                    <GtkHeaderBar showTitleButtons={false}>
                        <GtkButton label="Cancel" cssClasses={["flat"]} />
                        <Slot for={GtkHeaderBar} id="titleWidget">
                            <GtkLabel label="Select Items" cssClasses={["title"]} />
                        </Slot>
                        <Pack.End>
                            <GtkButton label="Done" cssClasses={["suggested-action"]} />
                        </Pack.End>
                    </GtkHeaderBar>
                </GtkBox>
            </GtkBox>

            {/* Properties */}
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                <GtkLabel label="Key Properties" cssClasses={["heading"]} halign={Gtk.Align.START} />
                <GtkLabel
                    label="showTitleButtons: Show/hide window controls (close, minimize, maximize). decorationLayout: Customize which buttons appear and their order. titleWidget: Slot for center content (typically title)."
                    wrap
                    cssClasses={["dim-label"]}
                    halign={Gtk.Align.START}
                />
            </GtkBox>
        </GtkBox>
    );
};

export const headerbarDemo: Demo = {
    id: "headerbar",
    title: "HeaderBar",
    description: "Container for title bar with controls at start, center, and end.",
    keywords: ["headerbar", "title", "titlebar", "window", "navigation", "GtkHeaderBar"],
    component: HeaderBarDemo,
    sourceCode,
};
