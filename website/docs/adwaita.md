# Adwaita

GTKX includes full support for Adwaita widgets, and provides additional x.\* components to make them more ergonomic to use in a declarative React style.

## Components

### x.StackPage

Declarative stack page component. Use the `page` and `onPageChanged` props for controlled state:

```tsx
import { x, AdwViewStack, AdwViewSwitcher, GtkBox } from "@gtkx/react";
import * as Adw from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";
import { useState } from "react";

const TabbedView = () => {
    const [stack, setStack] = useState<Adw.ViewStack | null>(null);
    const [currentPage, setCurrentPage] = useState("home");

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL}>
            <AdwViewSwitcher stack={stack} />

            <AdwViewStack ref={setStack} page={currentPage} onPageChanged={setCurrentPage}>
                <x.StackPage id="home" title="Home" iconName="go-home-symbolic">
                    Home content
                </x.StackPage>
                <x.StackPage id="settings" title="Settings" iconName="preferences-system-symbolic">
                    Settings content
                </x.StackPage>
            </AdwViewStack>
        </GtkBox>
    );
};
```

### x.NavigationPage

Declarative navigation page component. Use with `AdwNavigationView` for stack-based navigation, or `AdwNavigationSplitView` for sidebar/content layouts. The `id` prop determines the page's identity in the navigation history or layout slots:

```tsx
import { x, AdwNavigationView, AdwHeaderBar, GtkBox, GtkButton, GtkLabel } from "@gtkx/react";
import * as Gtk from "@gtkx/ffi/gtk";
import { useState } from "react";

const NavigationExample = () => {
    const [history, setHistory] = useState(["home"]);

    const pushDetail = () => {
        setHistory([...history, "detail"]);
    };

    const pop = () => {
        setHistory(history.slice(0, -1));
    };

    return (
        <AdwNavigationView history={history} onHistoryChanged={setHistory}>
            <x.NavigationPage for={AdwNavigationView} id="home" title="Main">
                <GtkBox orientation={Gtk.Orientation.VERTICAL}>
                    <AdwHeaderBar />
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={12}
                        marginTop={24}
                        marginStart={24}
                        marginEnd={24}
                    >
                        <GtkLabel label="Welcome to the app" cssClasses={["title-2"]} />
                        <GtkButton label="View Details" onClicked={pushDetail} cssClasses={["suggested-action"]} />
                    </GtkBox>
                </GtkBox>
            </x.NavigationPage>

            <x.NavigationPage for={AdwNavigationView} id="detail" title="Details">
                <GtkBox orientation={Gtk.Orientation.VERTICAL}>
                    <AdwHeaderBar />
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={12}
                        marginTop={24}
                        marginStart={24}
                        marginEnd={24}
                    >
                        <GtkLabel label="Detail content here" />
                        <GtkButton label="Go Back" onClicked={pop} />
                    </GtkBox>
                </GtkBox>
            </x.NavigationPage>
        </AdwNavigationView>
    );
};
```

### x.NavigationPage (AdwNavigationSplitView)

Declarative page component for `AdwNavigationSplitView`. The `id` prop determines the page's identity in the split view layout:

```tsx
import {
    x,
    AdwNavigationSplitView,
    AdwToolbarView,
    AdwHeaderBar,
    AdwActionRow,
    GtkListBox,
    GtkScrolledWindow,
    GtkBox,
    GtkImage,
    GtkLabel,
} from "@gtkx/react";
import * as Gtk from "@gtkx/ffi/gtk";
import { useState } from "react";

interface Item {
    id: string;
    title: string;
    icon: string;
}

const items: Item[] = [
    { id: "inbox", title: "Inbox", icon: "mail-unread-symbolic" },
    { id: "starred", title: "Starred", icon: "starred-symbolic" },
    { id: "sent", title: "Sent", icon: "mail-send-symbolic" },
];

const SplitViewExample = () => {
    const [selected, setSelected] = useState(items[0]);

    return (
        <AdwNavigationSplitView sidebarWidthFraction={0.33} minSidebarWidth={200} maxSidebarWidth={300}>
            <x.NavigationPage for={AdwNavigationSplitView} id="sidebar" title="Mail">
                <AdwToolbarView>
                    <x.ContainerSlot for={AdwToolbarView} id="addTopBar">
                        <AdwHeaderBar />
                    </x.ContainerSlot>
                    <GtkScrolledWindow vexpand>
                        <GtkListBox
                            cssClasses={["navigation-sidebar"]}
                            onRowSelected={(row) => {
                                if (!row) return;
                                const item = items[row.getIndex()];
                                if (item) setSelected(item);
                            }}
                        >
                            {items.map((item) => (
                                <AdwActionRow key={item.id} title={item.title}>
                                    <x.ContainerSlot for={AdwActionRow} id="addPrefix">
                                        <GtkImage iconName={item.icon} />
                                    </x.ContainerSlot>
                                </AdwActionRow>
                            ))}
                        </GtkListBox>
                    </GtkScrolledWindow>
                </AdwToolbarView>
            </x.NavigationPage>

            <x.NavigationPage for={AdwNavigationSplitView} id="content" title={selected?.title ?? ""}>
                <AdwToolbarView>
                    <x.ContainerSlot for={AdwToolbarView} id="addTopBar">
                        <AdwHeaderBar />
                    </x.ContainerSlot>
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={12}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                        vexpand
                    >
                        <GtkImage iconName={selected?.icon ?? ""} iconSize={Gtk.IconSize.LARGE} />
                        <GtkLabel label={selected?.title ?? ""} cssClasses={["title-2"]} />
                    </GtkBox>
                </AdwToolbarView>
            </x.NavigationPage>
        </AdwNavigationSplitView>
    );
};
```

### x.AlertDialogResponse

Modern confirmation dialogs using `x.AlertDialogResponse` for declarative response buttons:

```tsx
import { x, AdwAlertDialog, GtkButton, useApplication, createPortal } from "@gtkx/react";
import * as Adw from "@gtkx/ffi/adw";
import { useState } from "react";

const DeleteConfirmation = () => {
    const [showDialog, setShowDialog] = useState(false);
    const application = useApplication();
    const activeWindow = application?.getActiveWindow();

    return (
        <>
            <GtkButton label="Delete" cssClasses={["destructive-action"]} onClicked={() => setShowDialog(true)} />
            {showDialog &&
                activeWindow &&
                createPortal(
                    <AdwAlertDialog
                        heading="Delete File?"
                        body="This action cannot be undone."
                        onResponse={(id) => {
                            if (id === "delete") {
                                console.log("Deleting...");
                            }
                            setShowDialog(false);
                        }}
                    >
                        <x.AlertDialogResponse id="cancel" label="Cancel" />
                        <x.AlertDialogResponse
                            id="delete"
                            label="Delete"
                            appearance={Adw.ResponseAppearance.DESTRUCTIVE}
                        />
                    </AdwAlertDialog>,
                    activeWindow,
                )}
        </>
    );
};
```

### x.Toggle

Declarative toggle options for `AdwToggleRow` and `AdwToggleGroup`. Use the `id` prop to identify toggles within a group:

```tsx
import { x, AdwToggleGroup } from "@gtkx/react";
import { useState } from "react";

const ViewModeSelector = () => {
    const [mode, setMode] = useState("list");

    return (
        <AdwToggleGroup activeName={mode} onActiveChanged={(_index, name) => setMode(name ?? "list")}>
            <x.Toggle id="list" iconName="view-list-symbolic" tooltip="List view" />
            <x.Toggle id="grid" iconName="view-grid-symbolic" tooltip="Grid view" />
        </AdwToggleGroup>
    );
};
```
