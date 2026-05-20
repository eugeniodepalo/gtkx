import * as Gtk from "@gtkx/ffi/gtk";
import {
    AdwApplicationWindow,
    AdwHeaderBar,
    AdwNavigationSplitView,
    AdwToolbarView,
    GtkListView,
    GtkMenuButton,
    GtkScrolledWindow,
} from "@gtkx/react";
import { type Note, NoteCardComponent, NotesSidebarPage, noop, sampleNotes } from "../data";

export const Chapter5 = () => (
    <AdwApplicationWindow title="Notes" defaultWidth={900} defaultHeight={600} onClose={noop}>
        <AdwNavigationSplitView sidebarWidthFraction={0.25} minSidebarWidth={200} maxSidebarWidth={300}>
            <NotesSidebarPage />
            <AdwNavigationSplitView.Page id="content" title="All Notes">
                <AdwToolbarView>
                    <AdwToolbarView.AddTopBar>
                        <AdwHeaderBar>
                            <AdwHeaderBar.PackEnd>
                                <GtkMenuButton iconName="open-menu-symbolic">
                                    <GtkMenuButton.MenuItem id="about" label="About Notes" onActivate={noop} />
                                    <GtkMenuButton.MenuItem
                                        id="quit"
                                        label="Quit"
                                        accels="<Control>q"
                                        onActivate={noop}
                                    />
                                </GtkMenuButton>
                            </AdwHeaderBar.PackEnd>
                        </AdwHeaderBar>
                    </AdwToolbarView.AddTopBar>
                    <GtkScrolledWindow vexpand>
                        <GtkListView
                            estimatedItemHeight={80}
                            selectionMode={Gtk.SelectionMode.SINGLE}
                            items={sampleNotes.map((n) => ({ id: n.id, value: n }))}
                            renderItem={(note: Note) => <NoteCardComponent note={note} />}
                        />
                    </GtkScrolledWindow>
                </AdwToolbarView>
            </AdwNavigationSplitView.Page>
        </AdwNavigationSplitView>
    </AdwApplicationWindow>
);
