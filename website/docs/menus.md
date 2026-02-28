# Menus

GTKX provides a declarative API for building menus, replacing the imperative `Gio.Menu` construction with React intrinsic elements.

## Basic Menu

Attach a menu to a button with `GtkMenuButton`:

```tsx
import { x, GtkMenuButton } from "@gtkx/react";

const FileMenu = () => (
    <GtkMenuButton label="File">
        <x.MenuItem id="new" label="New" onActivate={() => console.log("New")} accels="<Control>n" />
        <x.MenuItem id="open" label="Open" onActivate={() => console.log("Open")} accels="<Control>o" />
        <x.MenuItem id="save" label="Save" onActivate={() => console.log("Save")} accels="<Control>s" />
    </GtkMenuButton>
);
```

## Sections and Submenus

### x.MenuSection

Group items with a visual separator and optional header:

```tsx
<GtkMenuButton label="Edit">
    <x.MenuItem id="undo" label="Undo" onActivate={undo} accels="<Control>z" />
    <x.MenuItem id="redo" label="Redo" onActivate={redo} accels="<Control><Shift>z" />

    <x.MenuSection label="Clipboard">
        <x.MenuItem id="cut" label="Cut" onActivate={cut} accels="<Control>x" />
        <x.MenuItem id="copy" label="Copy" onActivate={copy} accels="<Control>c" />
        <x.MenuItem id="paste" label="Paste" onActivate={paste} accels="<Control>v" />
    </x.MenuSection>
</GtkMenuButton>
```

### x.MenuSubmenu

Nested menu with its own items.

```tsx
<GtkMenuButton label="File">
    <x.MenuItem id="new" label="New" onActivate={handleNew} />

    <x.MenuSubmenu label="Recent Files">
        <x.MenuItem id="file1" label="document.txt" onActivate={() => openRecent("document.txt")} />
        <x.MenuItem id="file2" label="report.pdf" onActivate={() => openRecent("report.pdf")} />
        <x.MenuItem id="file3" label="notes.md" onActivate={() => openRecent("notes.md")} />
    </x.MenuSubmenu>

    <x.MenuSection>
        <x.MenuItem id="quit" label="Quit" onActivate={quit} accels="<Control>q" />
    </x.MenuSection>
</GtkMenuButton>
```

## Application Menu Bar

For a traditional menu bar, use `showMenubar` on the window and place menus as children:

```tsx
import { x, GtkApplicationWindow, quit } from "@gtkx/react";

const App = () => (
    <>
        <x.MenuSubmenu label="File">
            <x.MenuItem id="new" label="New" onActivate={handleNew} accels="<Control>n" />
            <x.MenuItem id="open" label="Open" onActivate={handleOpen} accels="<Control>o" />
            <x.MenuSection>
                <x.MenuItem id="quit" label="Quit" onActivate={quit} accels="<Control>q" />
            </x.MenuSection>
        </x.MenuSubmenu>

        <x.MenuSubmenu label="Edit">
            <x.MenuItem id="undo" label="Undo" onActivate={handleUndo} accels="<Control>z" />
            <x.MenuItem id="redo" label="Redo" onActivate={handleRedo} accels="<Control><Shift>z" />
        </x.MenuSubmenu>

        <x.MenuSubmenu label="Help">
            <x.MenuItem id="about" label="About" onActivate={showAbout} />
        </x.MenuSubmenu>

        <GtkApplicationWindow title="My App" showMenubar onClose={quit}>
            {/* App content */}
        </GtkApplicationWindow>
    </>
);
```
