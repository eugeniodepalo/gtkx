import SCHEMA_ID from "../com.gtkx.tutorial.gschema.xml";

import { css } from "@gtkx/css";
import * as Gtk from "@gtkx/ffi/gtk";
import {
    AdwApplicationWindow,
    AdwHeaderBar,
    AdwNavigationSplitView,
    AdwToggleGroup,
    AdwToolbarView,
    GtkBox,
    GtkButton,
    GtkLabel,
    GtkListView,
    GtkMenuButton,
    GtkScrolledWindow,
    GtkShortcutController,
    quit,
    useSetting,
} from "@gtkx/react";
import { useState } from "react";
import { DeleteConfirmation } from "./components/delete-confirmation.js";
import { NoteCard } from "./components/note-card.js";
import { Preferences } from "./components/preferences.js";
import { Sidebar } from "./components/sidebar.js";
import type { Note } from "./types.js";

const emptyState = css`
    padding: 48px;
`;

export function App() {
    const [compactMode] = useSetting(SCHEMA_ID, "compact-mode", "boolean");
    const [fontSize] = useSetting(SCHEMA_ID, "font-size", "int");

    const [notes, setNotes] = useState<Note[]>([
        { id: "1", title: "Welcome", body: "Your first note!", createdAt: new Date() },
        { id: "2", title: "Shopping List", body: "Milk, eggs, bread", createdAt: new Date() },
        {
            id: "3",
            title: "Meeting Notes",
            body: "Discuss project timeline and deliverables",
            createdAt: new Date(),
        },
    ]);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [category, setCategory] = useState<string>("all");
    const [viewMode, setViewMode] = useState("list");
    const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
    const [showPreferences, setShowPreferences] = useState(false);

    const selectedNote = notes.find((n) => n.id === selectedId);

    const addNote = () => {
        const note: Note = {
            id: crypto.randomUUID(),
            title: "Untitled",
            body: "",
            createdAt: new Date(),
        };
        setNotes([note, ...notes]);
    };

    const categoryTitles: Record<string, string> = {
        all: "All Notes",
        favorites: "Favorites",
        recent: "Recent",
        trash: "Trash",
    };

    const deleteSelected = () => {
        if (selectedNote) setNoteToDelete(selectedNote);
    };

    const confirmDelete = () => {
        if (noteToDelete) {
            setNotes(notes.filter((n) => n.id !== noteToDelete.id));
            if (selectedId === noteToDelete.id) setSelectedId(null);
            setNoteToDelete(null);
        }
    };

    return (
        <AdwApplicationWindow title="Notes" defaultWidth={900} defaultHeight={600} onClose={quit}>
            <GtkShortcutController scope={Gtk.ShortcutScope.GLOBAL}>
                <GtkShortcutController.Shortcut trigger="<Control>n" onActivate={addNote} />
                <GtkShortcutController.Shortcut trigger="Delete" onActivate={deleteSelected} disabled={!selectedId} />
            </GtkShortcutController>

            <AdwNavigationSplitView sidebarWidthFraction={0.25} minSidebarWidth={200} maxSidebarWidth={300}>
                <AdwNavigationSplitView.Page id="sidebar" title="Notes">
                    <AdwToolbarView>
                        <AdwToolbarView.AddTopBar>
                            <AdwHeaderBar>
                                <AdwHeaderBar.PackStart>
                                    <GtkButton iconName="list-add-symbolic" onClicked={addNote} />
                                </AdwHeaderBar.PackStart>
                            </AdwHeaderBar>
                        </AdwToolbarView.AddTopBar>
                        <Sidebar
                            noteCounts={{ all: notes.length, favorites: 0, recent: notes.length, trash: 0 }}
                            onCategoryChanged={setCategory}
                        />
                    </AdwToolbarView>
                </AdwNavigationSplitView.Page>

                <AdwNavigationSplitView.Page
                    id="content"
                    title={selectedNote?.title ?? categoryTitles[category] ?? "Notes"}
                >
                    <AdwToolbarView>
                        <AdwToolbarView.AddTopBar>
                            <AdwHeaderBar
                                titleWidget={
                                    <AdwToggleGroup
                                        activeName={viewMode}
                                        onActiveChanged={(_index, name) => setViewMode(name ?? "list")}
                                        toggles={[
                                            {
                                                id: "list",
                                                iconName: "view-list-symbolic",
                                                tooltip: "List view",
                                            },
                                            {
                                                id: "grid",
                                                iconName: "view-grid-symbolic",
                                                tooltip: "Grid view",
                                            },
                                        ]}
                                    />
                                }
                            >
                                <AdwHeaderBar.PackEnd>
                                    <GtkMenuButton iconName="open-menu-symbolic">
                                        <GtkMenuButton.MenuItem
                                            id="new"
                                            label="New Note"
                                            onActivate={addNote}
                                            accels="<Control>n"
                                        />
                                        <GtkMenuButton.MenuSection>
                                            <GtkMenuButton.MenuItem
                                                id="preferences"
                                                label="Preferences"
                                                onActivate={() => setShowPreferences(true)}
                                                accels="<Control>comma"
                                            />
                                        </GtkMenuButton.MenuSection>
                                        <GtkMenuButton.MenuSection>
                                            <GtkMenuButton.MenuItem
                                                id="quit"
                                                label="Quit"
                                                onActivate={quit}
                                                accels="<Control>q"
                                            />
                                        </GtkMenuButton.MenuSection>
                                    </GtkMenuButton>
                                </AdwHeaderBar.PackEnd>
                            </AdwHeaderBar>
                        </AdwToolbarView.AddTopBar>

                        {notes.length > 0 ? (
                            viewMode === "list" ? (
                                <GtkScrolledWindow vexpand>
                                    <GtkListView
                                        estimatedItemHeight={compactMode ? 50 : 80}
                                        selectionMode={Gtk.SelectionMode.SINGLE}
                                        selected={selectedId ? [selectedId] : []}
                                        onSelectionChanged={(ids) => setSelectedId(ids[0] ?? null)}
                                        items={notes.map((note) => ({
                                            id: note.id,
                                            value: note,
                                        }))}
                                        renderItem={(note) => (
                                            <NoteCard note={note} compact={compactMode} fontSize={fontSize} />
                                        )}
                                    />
                                </GtkScrolledWindow>
                            ) : (
                                <GtkScrolledWindow vexpand>
                                    <GtkBox
                                        orientation={Gtk.Orientation.VERTICAL}
                                        spacing={8}
                                        marginTop={12}
                                        marginBottom={12}
                                        marginStart={12}
                                        marginEnd={12}
                                    >
                                        {notes.map((note) => (
                                            <NoteCard
                                                key={note.id}
                                                note={note}
                                                compact={compactMode}
                                                fontSize={fontSize}
                                            />
                                        ))}
                                    </GtkBox>
                                </GtkScrolledWindow>
                            )
                        ) : (
                            <GtkBox
                                orientation={Gtk.Orientation.VERTICAL}
                                vexpand
                                halign={Gtk.Align.CENTER}
                                valign={Gtk.Align.CENTER}
                                cssClasses={[emptyState]}
                            >
                                <GtkLabel label="No notes yet" cssClasses={["dim-label", "title-3"]} />
                            </GtkBox>
                        )}
                    </AdwToolbarView>
                </AdwNavigationSplitView.Page>
            </AdwNavigationSplitView>

            {noteToDelete && (
                <DeleteConfirmation
                    noteTitle={noteToDelete.title}
                    onConfirm={confirmDelete}
                    onCancel={() => setNoteToDelete(null)}
                />
            )}

            {showPreferences && <Preferences onClose={() => setShowPreferences(false)} />}
        </AdwApplicationWindow>
    );
}

export default App;
