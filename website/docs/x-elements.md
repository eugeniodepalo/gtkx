# x.\* Elements

GTKX provides declarative child components for various GTK widgets, allowing you to configure widget internals using JSX instead of imperative APIs.

## Grid Layout

Position children in a `GtkGrid` using `x.GridChild`:

```tsx
import { x, GtkGrid, GtkLabel, GtkEntry, GtkButton } from "@gtkx/react";
import * as Gtk from "@gtkx/ffi/gtk";

const FormGrid = () => (
    <GtkGrid rowSpacing={8} columnSpacing={12}>
        <x.GridChild column={0} row={0}>
            <GtkLabel label="Name:" halign={Gtk.Align.END} />
        </x.GridChild>
        <x.GridChild column={1} row={0}>
            <GtkEntry hexpand />
        </x.GridChild>
        <x.GridChild column={0} row={1}>
            <GtkLabel label="Email:" halign={Gtk.Align.END} />
        </x.GridChild>
        <x.GridChild column={1} row={1}>
            <GtkEntry hexpand />
        </x.GridChild>
        <x.GridChild column={0} row={2} columnSpan={2}>
            <GtkButton label="Submit" halign={Gtk.Align.END} />
        </x.GridChild>
    </GtkGrid>
);
```

## Fixed Positioning

Position children absolutely in a `GtkFixed` using `x.FixedChild`:

```tsx
import { x, GtkFixed, GtkLabel } from "@gtkx/react";

const AbsoluteLayout = () => (
    <GtkFixed>
        <x.FixedChild x={20} y={30}>
            <GtkLabel label="Top Left" />
        </x.FixedChild>
        <x.FixedChild x={200} y={100}>
            <GtkLabel label="Middle" />
        </x.FixedChild>
    </GtkFixed>
);
```

## Overlay Children

Layer widgets on top of each other using `x.OverlayChild`. You can include multiple children in a single overlay:

```tsx
import { x, GtkOverlay, GtkImage, GtkLabel } from "@gtkx/react";
import * as Gtk from "@gtkx/ffi/gtk";

const BadgedImage = () => (
    <GtkOverlay>
        <GtkImage iconName="folder-symbolic" pixelSize={48} />
        <x.OverlayChild>
            <GtkLabel label="3" cssClasses={["badge"]} halign={Gtk.Align.END} valign={Gtk.Align.START} />
            <GtkLabel label="New" cssClasses={["badge"]} halign={Gtk.Align.START} valign={Gtk.Align.END} />
        </x.OverlayChild>
    </GtkOverlay>
);
```

## Notebook Pages

Create tabbed interfaces with `x.NotebookPage` and optional custom tab widgets:

```tsx
import { x, GtkNotebook, GtkBox, GtkImage, GtkLabel } from "@gtkx/react";
import * as Gtk from "@gtkx/ffi/gtk";

const TabbedView = () => (
    <GtkNotebook>
        <x.NotebookPage label="Documents">
            <GtkLabel label="Documents content" vexpand />
        </x.NotebookPage>
        <x.NotebookPage tabExpand tabFill>
            <x.NotebookPageTab>
                <GtkBox spacing={4}>
                    <GtkImage iconName="folder-symbolic" />
                    <GtkLabel label="Files" />
                </GtkBox>
            </x.NotebookPageTab>
            <GtkLabel label="Files content" vexpand />
        </x.NotebookPage>
    </GtkNotebook>
);
```

Use `x.NotebookPageTab` for a custom widget as the tab label instead of text.

## TextView with Rich Text

Configure a `GtkTextView` with rich text content using `x.TextTag` children for formatting and `x.TextAnchor` for embedded widgets.

### Basic Usage

```tsx
import { x, GtkTextView, GtkScrolledWindow } from "@gtkx/react";
import * as Gtk from "@gtkx/ffi/gtk";

const TextEditor = () => {
    return (
        <GtkScrolledWindow minContentHeight={200}>
            <GtkTextView wrapMode={Gtk.WrapMode.WORD_CHAR} enableUndo onBufferChanged={(text) => console.log(text)}>
                Hello, World!
            </GtkTextView>
        </GtkScrolledWindow>
    );
};
```

When `enableUndo` is true, the built-in keyboard shortcuts `Ctrl+Z` (undo) and `Ctrl+Shift+Z` (redo) are automatically available.

### Rich Text with TextTag

Use `x.TextTag` to apply formatting to portions of text. Tags can be nested for combined styling:

```tsx
import { x, GtkTextView, GtkScrolledWindow } from "@gtkx/react";
import * as Pango from "@gtkx/ffi/pango";
import * as Gtk from "@gtkx/ffi/gtk";

const RichTextEditor = () => {
    return (
        <GtkScrolledWindow minContentHeight={200}>
            <GtkTextView wrapMode={Gtk.WrapMode.WORD_CHAR}>
                Normal text,{" "}
                <x.TextTag id="bold" weight={Pango.Weight.BOLD}>
                    bold text
                </x.TextTag>
                ,{" "}
                <x.TextTag id="italic" style={Pango.Style.ITALIC}>
                    italic text
                </x.TextTag>
                , and{" "}
                <x.TextTag id="colored" foreground="red">
                    <x.TextTag id="underlined" underline={Pango.Underline.SINGLE}>
                        nested red underlined
                    </x.TextTag>
                </x.TextTag>{" "}
                text.
            </GtkTextView>
        </GtkScrolledWindow>
    );
};
```

### Embedded Widgets with TextAnchor

Use `x.TextAnchor` to embed widgets inline with text content:

```tsx
import { x, GtkTextView, GtkScrolledWindow, GtkButton } from "@gtkx/react";

const TextWithWidgets = () => {
    return (
        <GtkScrolledWindow minContentHeight={200}>
            <GtkTextView>
                Click here:{" "}
                <x.TextAnchor>
                    <GtkButton label="Click me" onClicked={() => console.log("Clicked!")} />
                </x.TextAnchor>{" "}
                to continue.
            </GtkTextView>
        </GtkScrolledWindow>
    );
};
```

### Inline Images with TextPaintable

Use `x.TextPaintable` to embed inline images or icons in text:

```tsx
import { x, GtkTextView, GtkScrolledWindow } from "@gtkx/react";
import * as Gtk from "@gtkx/ffi/gtk";

const TextWithIcons = () => {
    const iconTheme = Gtk.IconTheme.getForDisplay(Gdk.Display.getDefault()!);
    const icon = iconTheme.lookupIcon("starred-symbolic", null, 16, 1, Gtk.TextDirection.LTR, Gtk.IconLookupFlags.NONE);

    return (
        <GtkScrolledWindow minContentHeight={200}>
            <GtkTextView>
                This is a <x.TextPaintable paintable={icon} /> star icon inline with text.
            </GtkTextView>
        </GtkScrolledWindow>
    );
};
```

## Keyboard Shortcuts

Attach keyboard shortcuts to widgets using `<GtkShortcutController>` with `x.Shortcut` children:

```tsx
import { x, GtkBox, GtkLabel, GtkShortcutController } from "@gtkx/react";
import * as Gtk from "@gtkx/ffi/gtk";
import { useState } from "react";

const App = () => {
    const [count, setCount] = useState(0);
    const [searchMode, setSearchMode] = useState(false);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12} focusable>
            <GtkShortcutController scope={Gtk.ShortcutScope.LOCAL}>
                <x.Shortcut trigger="<Control>equal" onActivate={() => setCount((c) => c + 1)} />
                <x.Shortcut trigger="<Control>minus" onActivate={() => setCount((c) => c - 1)} />
                <x.Shortcut trigger="<Control>f" onActivate={() => setSearchMode((s) => !s)} />
            </GtkShortcutController>
            <GtkLabel label={`Count: ${count}`} />
            <GtkLabel label={searchMode ? "Search mode ON" : "Search mode OFF"} />
        </GtkBox>
    );
};
```

The `scope` prop controls when shortcuts are active: `LOCAL` (only when focused), `MANAGED` (managed by parent), or `GLOBAL` (anywhere in window).

The `trigger` prop accepts GTK accelerator strings (e.g., `"<Control>s"`, `"<Alt>F4"`). Pass an array for multiple triggers:

```tsx
<x.Shortcut trigger={["F5", "<Control>r"]} onActivate={refresh} />
```

Use `disabled` to temporarily disable a shortcut:

```tsx
<x.Shortcut trigger="<Control>s" onActivate={save} disabled={!hasChanges} />
```
