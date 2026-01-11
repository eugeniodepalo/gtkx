import * as Gtk from "@gtkx/ffi/gtk";
import {
    AdwHeaderBar,
    AdwNavigationView,
    AdwPreferencesGroup,
    AdwToolbarView,
    GtkBox,
    GtkButton,
    GtkFrame,
    GtkImage,
    GtkLabel,
    GtkNotebook,
    GtkStack,
    GtkStackSwitcher,
    x,
} from "@gtkx/react";
import { useCallback, useState } from "react";

export const NavigationDemo = () => {
    const [stackPage, setStackPage] = useState("page1");
    const [history, setHistory] = useState(["home"]);

    const handleHistoryChanged = useCallback((newHistory: string[]) => {
        setHistory(newHistory);
    }, []);

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={24}
            marginTop={24}
            marginBottom={24}
            marginStart={24}
            marginEnd={24}
        >
            <GtkLabel label="Navigation Components" cssClasses={["title-1"]} halign={Gtk.Align.START} />

            <AdwPreferencesGroup title="x.StackPage" description="Named pages within a GtkStack or AdwViewStack">
                <GtkFrame marginTop={12}>
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                        <GtkStackSwitcher
                            stack={null as unknown as Gtk.Stack}
                            halign={Gtk.Align.CENTER}
                            marginTop={12}
                        />
                        <GtkStack page={stackPage} heightRequest={150}>
                            <x.StackPage id="page1" title="Home" iconName="go-home-symbolic">
                                <GtkBox
                                    orientation={Gtk.Orientation.VERTICAL}
                                    spacing={12}
                                    halign={Gtk.Align.CENTER}
                                    valign={Gtk.Align.CENTER}
                                >
                                    <GtkImage iconName="go-home-symbolic" iconSize={Gtk.IconSize.LARGE} />
                                    <GtkLabel label="Welcome to the Home page" />
                                </GtkBox>
                            </x.StackPage>
                            <x.StackPage id="page2" title="Documents" iconName="folder-documents-symbolic">
                                <GtkBox
                                    orientation={Gtk.Orientation.VERTICAL}
                                    spacing={12}
                                    halign={Gtk.Align.CENTER}
                                    valign={Gtk.Align.CENTER}
                                >
                                    <GtkImage iconName="folder-documents-symbolic" iconSize={Gtk.IconSize.LARGE} />
                                    <GtkLabel label="Your documents appear here" />
                                </GtkBox>
                            </x.StackPage>
                            <x.StackPage id="page3" title="Settings" iconName="emblem-system-symbolic">
                                <GtkBox
                                    orientation={Gtk.Orientation.VERTICAL}
                                    spacing={12}
                                    halign={Gtk.Align.CENTER}
                                    valign={Gtk.Align.CENTER}
                                >
                                    <GtkImage iconName="emblem-system-symbolic" iconSize={Gtk.IconSize.LARGE} />
                                    <GtkLabel label="Application settings" />
                                </GtkBox>
                            </x.StackPage>
                        </GtkStack>
                        <GtkBox
                            orientation={Gtk.Orientation.HORIZONTAL}
                            spacing={6}
                            halign={Gtk.Align.CENTER}
                            marginBottom={12}
                        >
                            <GtkButton
                                label="Home"
                                onClicked={() => setStackPage("page1")}
                                cssClasses={stackPage === "page1" ? ["suggested-action"] : []}
                            />
                            <GtkButton
                                label="Documents"
                                onClicked={() => setStackPage("page2")}
                                cssClasses={stackPage === "page2" ? ["suggested-action"] : []}
                            />
                            <GtkButton
                                label="Settings"
                                onClicked={() => setStackPage("page3")}
                                cssClasses={stackPage === "page3" ? ["suggested-action"] : []}
                            />
                        </GtkBox>
                    </GtkBox>
                </GtkFrame>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup
                title="x.NavigationPage + history"
                description="Declarative navigation with React-controlled history and onHistoryChanged for back gestures"
            >
                <GtkFrame marginTop={12}>
                    <AdwNavigationView history={history} onHistoryChanged={handleHistoryChanged} heightRequest={280}>
                        <x.NavigationPage id="home" title="Home">
                            <AdwToolbarView>
                                <x.ToolbarTop>
                                    <AdwHeaderBar />
                                </x.ToolbarTop>
                                <GtkBox
                                    orientation={Gtk.Orientation.VERTICAL}
                                    spacing={12}
                                    halign={Gtk.Align.CENTER}
                                    valign={Gtk.Align.CENTER}
                                >
                                    <GtkImage iconName="go-home-symbolic" iconSize={Gtk.IconSize.LARGE} />
                                    <GtkLabel label="Home Page" cssClasses={["title-3"]} />
                                    <GtkButton
                                        label="Go to Details →"
                                        onClicked={() => setHistory([...history, "details"])}
                                        cssClasses={["suggested-action", "pill"]}
                                    />
                                </GtkBox>
                            </AdwToolbarView>
                        </x.NavigationPage>
                        <x.NavigationPage id="details" title="Details">
                            <AdwToolbarView>
                                <x.ToolbarTop>
                                    <AdwHeaderBar />
                                </x.ToolbarTop>
                                <GtkBox
                                    orientation={Gtk.Orientation.VERTICAL}
                                    spacing={12}
                                    halign={Gtk.Align.CENTER}
                                    valign={Gtk.Align.CENTER}
                                >
                                    <GtkImage iconName="emblem-documents-symbolic" iconSize={Gtk.IconSize.LARGE} />
                                    <GtkLabel label="Details Page" cssClasses={["title-3"]} />
                                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={6}>
                                        <GtkButton label="← Back" onClicked={() => setHistory(history.slice(0, -1))} />
                                        <GtkButton
                                            label="Go to Settings →"
                                            onClicked={() => setHistory([...history, "settings"])}
                                            cssClasses={["suggested-action", "pill"]}
                                        />
                                    </GtkBox>
                                </GtkBox>
                            </AdwToolbarView>
                        </x.NavigationPage>
                        <x.NavigationPage id="settings" title="Settings">
                            <AdwToolbarView>
                                <x.ToolbarTop>
                                    <AdwHeaderBar />
                                </x.ToolbarTop>
                                <GtkBox
                                    orientation={Gtk.Orientation.VERTICAL}
                                    spacing={12}
                                    halign={Gtk.Align.CENTER}
                                    valign={Gtk.Align.CENTER}
                                >
                                    <GtkImage iconName="emblem-system-symbolic" iconSize={Gtk.IconSize.LARGE} />
                                    <GtkLabel label="Settings Page" cssClasses={["title-3"]} />
                                    <GtkButton label="← Back" onClicked={() => setHistory(history.slice(0, -1))} />
                                </GtkBox>
                            </AdwToolbarView>
                        </x.NavigationPage>
                    </AdwNavigationView>
                </GtkFrame>
                <GtkLabel
                    label={`History: [${history.map((h) => `"${h}"`).join(", ")}] (swipe right or click header back button to pop)`}
                    cssClasses={["dim-label", "monospace"]}
                    marginTop={8}
                />
            </AdwPreferencesGroup>

            <AdwPreferencesGroup title="x.NotebookPage" description="Tabbed pages with string labels">
                <GtkFrame marginTop={12}>
                    <GtkNotebook>
                        <x.NotebookPage label="General">
                            <GtkBox
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={12}
                                halign={Gtk.Align.CENTER}
                                valign={Gtk.Align.CENTER}
                                heightRequest={120}
                            >
                                <GtkLabel label="General Settings" cssClasses={["title-3"]} />
                                <GtkLabel label="Configure basic application options" cssClasses={["dim-label"]} />
                            </GtkBox>
                        </x.NotebookPage>
                        <x.NotebookPage label="Appearance">
                            <GtkBox
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={12}
                                halign={Gtk.Align.CENTER}
                                valign={Gtk.Align.CENTER}
                                heightRequest={120}
                            >
                                <GtkLabel label="Appearance Settings" cssClasses={["title-3"]} />
                                <GtkLabel label="Customize the look and feel" cssClasses={["dim-label"]} />
                            </GtkBox>
                        </x.NotebookPage>
                        <x.NotebookPage label="Advanced">
                            <GtkBox
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={12}
                                halign={Gtk.Align.CENTER}
                                valign={Gtk.Align.CENTER}
                                heightRequest={120}
                            >
                                <GtkLabel label="Advanced Settings" cssClasses={["title-3"]} />
                                <GtkLabel label="Expert configuration options" cssClasses={["dim-label"]} />
                            </GtkBox>
                        </x.NotebookPage>
                    </GtkNotebook>
                </GtkFrame>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup title="x.NotebookPageTab" description="Custom widget tabs for notebook pages">
                <GtkFrame marginTop={12}>
                    <GtkNotebook>
                        <x.NotebookPage>
                            <x.NotebookPageTab>
                                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={6}>
                                    <GtkImage iconName="mail-unread-symbolic" />
                                    <GtkLabel label="Inbox (3)" />
                                </GtkBox>
                            </x.NotebookPageTab>
                            <GtkBox
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={0}
                                halign={Gtk.Align.CENTER}
                                valign={Gtk.Align.CENTER}
                                heightRequest={100}
                            >
                                <GtkLabel label="3 unread messages" />
                            </GtkBox>
                        </x.NotebookPage>
                        <x.NotebookPage>
                            <x.NotebookPageTab>
                                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={6}>
                                    <GtkImage iconName="mail-send-symbolic" />
                                    <GtkLabel label="Sent" />
                                </GtkBox>
                            </x.NotebookPageTab>
                            <GtkBox
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={0}
                                halign={Gtk.Align.CENTER}
                                valign={Gtk.Align.CENTER}
                                heightRequest={100}
                            >
                                <GtkLabel label="Sent messages" />
                            </GtkBox>
                        </x.NotebookPage>
                        <x.NotebookPage>
                            <x.NotebookPageTab>
                                <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={6}>
                                    <GtkImage iconName="user-trash-symbolic" />
                                    <GtkLabel label="Trash" />
                                </GtkBox>
                            </x.NotebookPageTab>
                            <GtkBox
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={0}
                                halign={Gtk.Align.CENTER}
                                valign={Gtk.Align.CENTER}
                                heightRequest={100}
                            >
                                <GtkLabel label="Deleted messages" />
                            </GtkBox>
                        </x.NotebookPage>
                    </GtkNotebook>
                </GtkFrame>
            </AdwPreferencesGroup>
        </GtkBox>
    );
};
