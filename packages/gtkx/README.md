# @gtkx/gtkx

React integration layer for GTKX. This package provides a custom React reconciler that renders React components as native GTK4 widgets.

## Installation

```bash
pnpm add @gtkx/gtkx react
```

### Peer Dependencies

- `react` ^19.0.0

### System Requirements

- Linux with GTK4 libraries
- Node.js 20+
- Rust toolchain (for building `@gtkx/native`)

```bash
# Fedora
sudo dnf install gtk4-devel

# Ubuntu/Debian
sudo apt install libgtk-4-dev
```

## Quick Start

```tsx
import { ApplicationWindow, Button, quit, render } from "@gtkx/gtkx";

render(
  <ApplicationWindow title="My App" defaultWidth={800} defaultHeight={600} onCloseRequest={quit}>
    <Button label="Hello!" onClicked={() => console.log("Clicked!")} />
  </ApplicationWindow>,
  "com.example.myapp"
);
```

Run with:

```bash
npx tsx src/index.tsx
```

## API

### `render(element, applicationId)`

Renders a React element tree as a GTK4 application.

- `element` — Root React element (typically `ApplicationWindow`)
- `applicationId` — Unique identifier in reverse-DNS format (e.g., `com.example.app`)

### `quit()`

Signals the application to close. Returns `false` (useful as a direct event handler for `onCloseRequest`).

```tsx
<ApplicationWindow onCloseRequest={quit}>...</ApplicationWindow>
```

### `createRef()`

Creates a reference for FFI output parameters.

```tsx
import { createRef } from "@gtkx/gtkx";

const ref = createRef();
someGtkFunction(ref);
console.log(ref.value);
```

## Widgets

### Container Widgets

**ApplicationWindow** — Main application window

```tsx
<ApplicationWindow title="Window Title" defaultWidth={800} defaultHeight={600} onCloseRequest={quit}>
  {children}
</ApplicationWindow>
```

**Box** — Arranges children in a row or column

```tsx
<Box orientation={Gtk.Orientation.VERTICAL} spacing={10}>
  <Button label="First" />
  <Button label="Second" />
</Box>
```

**Grid** — Arranges children in a grid layout

```tsx
<Grid columnSpacing={10} rowSpacing={10}>
  <Button label="(0,0)" />
  <Button label="(1,0)" />
</Grid>
```

**ScrolledWindow** — Adds scrollbars to content

```tsx
<ScrolledWindow vexpand hexpand>
  <TextView />
</ScrolledWindow>
```

**Notebook** — Tabbed container

```tsx
<Notebook>
  <Box>{/* Tab 1 */}</Box>
  <Box>{/* Tab 2 */}</Box>
</Notebook>
```

**Paned** — Resizable split container

```tsx
<Paned.Root wideHandle>
  <Paned.StartChild>
    <Box>{/* Left */}</Box>
  </Paned.StartChild>
  <Paned.EndChild>
    <Box>{/* Right */}</Box>
  </Paned.EndChild>
</Paned.Root>
```

### Input Widgets

**Button** — Clickable button

```tsx
<Button label="Click me" onClicked={() => console.log("Clicked!")} />
```

**ToggleButton** — Button with on/off state

```tsx
<ToggleButton.Root label={active ? "ON" : "OFF"} active={active} onToggled={() => setActive((a) => !a)} />
```

**CheckButton** — Checkbox with label

```tsx
<CheckButton.Root label="Accept terms" active={checked} onToggled={() => setChecked((c) => !c)} />
```

**Switch** — On/off toggle

```tsx
<Switch
  active={enabled}
  onStateSet={() => {
    setEnabled((e) => !e);
    return true;
  }}
/>
```

**Entry** — Single-line text input

```tsx
<Entry placeholderText="Enter text..." text={value} onChanged={handleChange} />
```

**Scale** — Horizontal or vertical slider

```tsx
<Scale hexpand drawValue />
```

**TextView** — Multi-line text editor

```tsx
<ScrolledWindow>
  <TextView editable wrapMode={Gtk.WrapMode.WORD} />
</ScrolledWindow>
```

### Display Widgets

**Label** — Text display

```tsx
<Label.Root label="Hello, World!" />
```

**ProgressBar** — Progress indicator

```tsx
<ProgressBar fraction={0.5} showText />
```

**Spinner** — Loading indicator

```tsx
<Spinner spinning={isLoading} />
```

### Layout Widgets

**HeaderBar** — Title bar with buttons

```tsx
<HeaderBar.Root>
  <HeaderBar.TitleWidget>
    <Label.Root label="App Title" />
  </HeaderBar.TitleWidget>
</HeaderBar.Root>
```

**CenterBox** — Positions children at start, center, and end

```tsx
<CenterBox.Root>
  <CenterBox.StartWidget>
    <Button label="Left" />
  </CenterBox.StartWidget>
  <CenterBox.CenterWidget>
    <Label.Root label="Center" />
  </CenterBox.CenterWidget>
  <CenterBox.EndWidget>
    <Button label="Right" />
  </CenterBox.EndWidget>
</CenterBox.Root>
```

### Dialog Widgets

**Popover** — Popup attached to a widget

```tsx
<Popover.Root autohide>
  <Popover.Child>
    <Box>{/* Content */}</Box>
  </Popover.Child>
  <Button label="Show Popover" />
</Popover.Root>
```

**AboutDialog** — Application about dialog

```tsx
{showAbout && <AboutDialog programName="My App" version="1.0.0" onCloseRequest={() => setShowAbout(false)} />}
```

**ColorDialogButton** — Color picker

```tsx
<ColorDialogButton />
```

**FontDialogButton** — Font picker

```tsx
<FontDialogButton />
```

## Named Slots

Some GTK widgets have named child positions, handled via compound components:

```tsx
<Frame.Root>
  <Frame.LabelWidget>
    <Label.Root label="Custom Label" />
  </Frame.LabelWidget>
  <Frame.Child>
    <Box>{/* Content */}</Box>
  </Frame.Child>
</Frame.Root>
```

## Using GTK Enums

Import enums from `@gtkx/ffi/gtk`:

```tsx
import * as Gtk from "@gtkx/ffi/gtk";

<Box orientation={Gtk.Orientation.VERTICAL} />;
<ListBox selectionMode={Gtk.SelectionMode.SINGLE} />;
<Revealer transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN} />;
```

## Hooks Support

Standard React hooks work as expected:

```tsx
import { useState, useEffect } from "react";
import { ApplicationWindow, Button, Label, Box, quit, render } from "@gtkx/gtkx";

const Counter = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log(`Count: ${count}`);
  }, [count]);

  return (
    <Box spacing={10}>
      <Label.Root label={`Count: ${count}`} />
      <Button label="Increment" onClicked={() => setCount((c) => c + 1)} />
    </Box>
  );
};

render(
  <ApplicationWindow title="Counter" onCloseRequest={quit}>
    <Counter />
  </ApplicationWindow>,
  "com.example.counter"
);
```

## Architecture

```
┌─────────────────────────────────┐
│     Your React Application      │
├─────────────────────────────────┤
│   @gtkx/gtkx (React Reconciler) │
├─────────────────────────────────┤
│   @gtkx/ffi (TypeScript FFI)    │
├─────────────────────────────────┤
│   @gtkx/native (Rust Bridge)    │
├─────────────────────────────────┤
│         GTK4 / GLib             │
└─────────────────────────────────┘
```

## License

[MPL-2.0](../../LICENSE)
