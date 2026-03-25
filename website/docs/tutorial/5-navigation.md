# 5. Navigation & Split Views

A notes app benefits from a sidebar for organizing notes into categories. Adwaita provides `AdwNavigationSplitView` for responsive sidebar/content layouts and `AdwViewStack` for tabbed views.

![Notes app after this chapter](./images/5-navigation.png)

## Split View Layout

`AdwNavigationSplitView` creates a two-pane layout with a sidebar and content area. Each pane is declared with an `AdwNavigationSplitView.Page` compound component:

```tsx
import {
    AdwApplicationWindow,
    AdwHeaderBar,
    AdwNavigationSplitView,
    AdwToolbarView,
    GtkBox,
    GtkLabel,
    quit,
} from "@gtkx/react";

export default function App() {
    return (
        <AdwApplicationWindow title="Notes" defaultWidth={800} defaultHeight={600} onClose={quit}>
            <AdwNavigationSplitView
                sidebarWidthFraction={0.3}
                minSidebarWidth={200}
                maxSidebarWidth={350}
            >
                <AdwNavigationSplitView.Page id="sidebar" title="Notes">
                    <AdwToolbarView>
                        <AdwToolbarView.AddTopBar>
                            <AdwHeaderBar />
                        </AdwToolbarView.AddTopBar>
                        <GtkLabel label="Sidebar content" />
                    </AdwToolbarView>
                </AdwNavigationSplitView.Page>

                <AdwNavigationSplitView.Page id="content" title="Editor">
                    <AdwToolbarView>
                        <AdwToolbarView.AddTopBar>
                            <AdwHeaderBar />
                        </AdwToolbarView.AddTopBar>
                        <GtkLabel label="Content area" />
                    </AdwToolbarView>
                </AdwNavigationSplitView.Page>
            </AdwNavigationSplitView>
        </AdwApplicationWindow>
    );
}
```

The split view automatically collapses to a single pane on narrow windows, with back-navigation to return to the sidebar.

## Building the Sidebar

Add category navigation using `GtkListBox` with Adwaita action rows:

```tsx
import {
    AdwActionRow,
    GtkImage,
    GtkListBox,
    GtkScrolledWindow,
} from "@gtkx/react";
import * as Gtk from "@gtkx/ffi/gtk";
import { useState } from "react";

interface Category {
    id: string;
    title: string;
    icon: string;
    count: number;
}

const categories: Category[] = [
    { id: "all", title: "All Notes", icon: "document-edit-symbolic", count: 12 },
    { id: "favorites", title: "Favorites", icon: "starred-symbolic", count: 3 },
    { id: "recent", title: "Recent", icon: "document-open-recent-symbolic", count: 5 },
    { id: "trash", title: "Trash", icon: "user-trash-symbolic", count: 1 },
];

const Sidebar = ({ onCategoryChanged }: { onCategoryChanged: (id: string) => void }) => (
    <GtkScrolledWindow vexpand>
        <GtkListBox
            cssClasses={["navigation-sidebar"]}
            onRowSelected={(row) => {
                if (!row) return;
                const category = categories[row.getIndex()];
                if (category) onCategoryChanged(category.id);
            }}
        >
            {categories.map((cat) => (
                <AdwActionRow key={cat.id} title={cat.title}>
                    <AdwActionRow.AddPrefix>
                        <GtkImage iconName={cat.icon} />
                    </AdwActionRow.AddPrefix>
                    <AdwActionRow.AddSuffix>
                        <GtkLabel label={String(cat.count)} cssClasses={["dim-label"]} />
                    </AdwActionRow.AddSuffix>
                </AdwActionRow>
            ))}
        </GtkListBox>
    </GtkScrolledWindow>
);
```

Notice `AdwActionRow.AddPrefix` and `AdwActionRow.AddSuffix` — these are compound components for placing widgets at the start and end of an action row.

## Stack Navigation

For tabbed views within a pane, use `AdwViewStack` with `AdwViewStack.Page` and an `AdwViewSwitcher`:

```tsx
import { AdwHeaderBar, AdwToolbarView, AdwViewStack, AdwViewSwitcher } from "@gtkx/react";
import * as Adw from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";
import { useState } from "react";

const ContentPane = () => {
    const [stack, setStack] = useState<Adw.ViewStack | null>(null);
    const [page, setPage] = useState("list");

    return (
        <AdwToolbarView>
            <AdwToolbarView.AddTopBar>
                <AdwHeaderBar
                    titleWidget={<AdwViewSwitcher stack={stack} />}
                />
            </AdwToolbarView.AddTopBar>
            <AdwViewStack ref={setStack} page={page} onPageChanged={setPage}>
                <AdwViewStack.Page id="list" title="List" iconName="view-list-symbolic">
                    {/* Notes list from previous chapters */}
                </AdwViewStack.Page>
                <AdwViewStack.Page id="grid" title="Grid" iconName="view-grid-symbolic">
                    {/* Grid view of notes */}
                </AdwViewStack.Page>
            </AdwViewStack>
        </AdwToolbarView>
    );
};
```

The `AdwViewSwitcher` automatically renders tabs that correspond to the stack pages. Link them via the `ref`/`stack` pattern shown above.

## Stack-Based Navigation

For push/pop navigation (like navigating into a note detail view), use `AdwNavigationView`:

```tsx
import { AdwNavigationView } from "@gtkx/react";
import { useState } from "react";

const NotesBrowser = () => {
    const [history, setHistory] = useState(["list"]);

    const pushNote = (noteId: string) => {
        setHistory([...history, `note-${noteId}`]);
    };

    const pop = () => {
        setHistory(history.slice(0, -1));
    };

    return (
        <AdwNavigationView history={history} onHistoryChanged={setHistory}>
            <AdwNavigationView.Page id="list" title="Notes">
                <AdwToolbarView>
                    <AdwToolbarView.AddTopBar>
                        <AdwHeaderBar />
                    </AdwToolbarView.AddTopBar>
                    {/* Notes list — onClick calls pushNote(id) */}
                </AdwToolbarView>
            </AdwNavigationView.Page>

            <AdwNavigationView.Page id={`note-${selectedNote?.id}`} title={selectedNote?.title ?? ""}>
                <AdwToolbarView>
                    <AdwToolbarView.AddTopBar>
                        <AdwHeaderBar />
                    </AdwToolbarView.AddTopBar>
                    {/* Note editor */}
                </AdwToolbarView>
            </AdwNavigationView.Page>
        </AdwNavigationView>
    );
};
```

The `AdwHeaderBar` inside a navigation page automatically shows a back button when there's history to pop.

## Complete Layout

Here's how the pieces fit together:

```tsx
export default function App() {
    const [category, setCategory] = useState("all");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    return (
        <AdwApplicationWindow title="Notes" defaultWidth={900} defaultHeight={600} onClose={quit}>
            <AdwNavigationSplitView
                sidebarWidthFraction={0.25}
                minSidebarWidth={200}
                maxSidebarWidth={300}
            >
                <AdwNavigationSplitView.Page id="sidebar" title="Notes">
                    <AdwToolbarView>
                        <AdwToolbarView.AddTopBar>
                            <AdwHeaderBar>
                                <AdwHeaderBar.PackStart>
                                    <GtkButton iconName="list-add-symbolic" onClicked={addNote} />
                                </AdwHeaderBar.PackStart>
                            </AdwHeaderBar>
                        </AdwToolbarView.AddTopBar>
                        <Sidebar onCategoryChanged={setCategory} />
                    </AdwToolbarView>
                </AdwNavigationSplitView.Page>

                <AdwNavigationSplitView.Page id="content" title={selectedNote?.title ?? "Notes"}>
                    <AdwToolbarView>
                        <AdwToolbarView.AddTopBar>
                            <AdwHeaderBar>
                                <AdwHeaderBar.PackEnd>
                                    <GtkMenuButton iconName="open-menu-symbolic">
                                        {/* ... menu items */}
                                    </GtkMenuButton>
                                </AdwHeaderBar.PackEnd>
                            </AdwHeaderBar>
                        </AdwToolbarView.AddTopBar>
                        {/* Notes list filtered by category */}
                    </AdwToolbarView>
                </AdwNavigationSplitView.Page>
            </AdwNavigationSplitView>
        </AdwApplicationWindow>
    );
}
```

## Next

In the [next chapter](./6-dialogs-and-animations.md), you'll add confirmation dialogs and smooth animations.
