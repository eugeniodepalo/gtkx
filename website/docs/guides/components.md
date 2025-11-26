---
sidebar_position: 1
---

# Components Guide

GTKX provides React components for GTK4 widgets. This guide covers the most commonly used components and patterns.

## Basic Components

### ApplicationWindow

The main window container for your application:

```tsx
import { ApplicationWindow, quit, render } from "@gtkx/gtkx";

render(
  <ApplicationWindow
    title="My App"
    defaultWidth={800}
    defaultHeight={600}
    onCloseRequest={quit}
  >
    {/* Your app content */}
  </ApplicationWindow>,
  "com.example.app"
);
```

### Button

A clickable button widget:

```tsx
<Button
  label="Click me"
  onClicked={() => console.log("Clicked!")}
  tooltipText="This is a tooltip"
/>
```

### Label

Display text (GTKX doesn't support text nodes):

```tsx
// Use Label.Root for compound component pattern
<Label.Root label="Hello, World!" wrap />

// Or the simple form
<Label label="Hello, World!" />
```

### Entry

Single-line text input:

```tsx
const [text, setText] = useState("");

<Entry
  text={text}
  placeholderText="Type something..."
  onChanged={() => setText(text)}
/>
```

### Switch

A toggle switch:

```tsx
const [active, setActive] = useState(false);

<Switch
  active={active}
  onStateSet={() => {
    setActive(a => !a);
    return true; // Return true to prevent default handling
  }}
/>
```

### CheckButton

Checkbox or radio button:

```tsx
const [checked, setChecked] = useState(false);

<CheckButton.Root
  label="Enable feature"
  active={checked}
  onToggled={() => setChecked(c => !c)}
/>
```

## Layout Components

### Box

Arrange children horizontally or vertically:

```tsx
import * as Gtk from "@gtkx/ffi/gtk";

// Horizontal (default)
<Box spacing={10}>
  <Button label="A" />
  <Button label="B" />
</Box>

// Vertical
<Box orientation={Gtk.Orientation.VERTICAL} spacing={10}>
  <Button label="A" />
  <Button label="B" />
</Box>
```

### Grid

Two-dimensional grid layout:

```tsx
<Grid columnSpacing={10} rowSpacing={10}>
  <Button label="(0,0)" />
  <Button label="(1,0)" />
  <Button label="(0,1)" />
  <Button label="(1,1)" />
</Grid>
```

### CenterBox

Place widgets at start, center, and end:

```tsx
<CenterBox.Root hexpand>
  <CenterBox.StartWidget>
    <Button label="Start" />
  </CenterBox.StartWidget>
  <CenterBox.CenterWidget>
    <Label.Root label="Center" />
  </CenterBox.CenterWidget>
  <CenterBox.EndWidget>
    <Button label="End" />
  </CenterBox.EndWidget>
</CenterBox.Root>
```

### Paned

Resizable split view:

```tsx
<Paned.Root wideHandle>
  <Paned.StartChild>
    <Box cssClasses={["card"]}>
      <Label.Root label="Left pane" />
    </Box>
  </Paned.StartChild>
  <Paned.EndChild>
    <Box cssClasses={["card"]}>
      <Label.Root label="Right pane" />
    </Box>
  </Paned.EndChild>
</Paned.Root>
```

### ScrolledWindow

Add scrollbars to content:

```tsx
<ScrolledWindow vexpand hexpand>
  {/* Scrollable content */}
</ScrolledWindow>
```

## Container Components

### Frame

Group related content with a label:

```tsx
<Frame.Root>
  <Frame.LabelWidget>
    <Label.Root label="Settings" />
  </Frame.LabelWidget>
  <Frame.Child>
    <Box spacing={10} marginTop={10} marginStart={10}>
      {/* Frame content */}
    </Box>
  </Frame.Child>
</Frame.Root>
```

### Expander

Collapsible content:

```tsx
<Expander.Root label="Show more">
  <Expander.Child>
    <Label.Root label="Hidden content" />
  </Expander.Child>
</Expander.Root>
```

### Revealer

Animate showing/hiding content:

```tsx
import * as Gtk from "@gtkx/ffi/gtk";

const [revealed, setRevealed] = useState(false);

<Button label="Toggle" onClicked={() => setRevealed(r => !r)} />
<Revealer
  revealChild={revealed}
  transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
>
  <Label.Root label="Revealed content" />
</Revealer>
```

### Notebook

Tabbed interface:

```tsx
<Notebook>
  <Box>
    <Label.Root label="Tab 1 content" />
  </Box>
  <Box>
    <Label.Root label="Tab 2 content" />
  </Box>
</Notebook>
```

## Header Bar

Modern application header:

```tsx
<ApplicationWindow onCloseRequest={quit}>
  <HeaderBar.Root>
    <HeaderBar.TitleWidget>
      <Label.Root label="My App" />
    </HeaderBar.TitleWidget>
    <HeaderBar.Start>
      <Button label="Back" />
    </HeaderBar.Start>
    <HeaderBar.End>
      <MenuButton.Root label="Menu">
        {/* Menu content */}
      </MenuButton.Root>
    </HeaderBar.End>
  </HeaderBar.Root>
  {/* Window content */}
</ApplicationWindow>
```

## Progress Indicators

### ProgressBar

```tsx
const [progress, setProgress] = useState(0);

<ProgressBar fraction={progress} showText />
```

### Spinner

```tsx
const [loading, setLoading] = useState(true);

<Spinner spinning={loading} />
```

### LevelBar

```tsx
<LevelBar value={0.7} />
```

## Common Props

Most widgets support these common properties:

| Prop | Type | Description |
|------|------|-------------|
| `hexpand` | boolean | Expand horizontally |
| `vexpand` | boolean | Expand vertically |
| `halign` | Gtk.Align | Horizontal alignment |
| `valign` | Gtk.Align | Vertical alignment |
| `marginTop` | number | Top margin in pixels |
| `marginBottom` | number | Bottom margin |
| `marginStart` | number | Start margin (left in LTR) |
| `marginEnd` | number | End margin (right in LTR) |
| `cssClasses` | string[] | CSS class names |
| `tooltipText` | string | Tooltip text |
| `sensitive` | boolean | Whether widget is interactive |
| `visible` | boolean | Whether widget is visible |

## Compound Components Pattern

Some widgets use a compound component pattern with `.Root` and slot components:

```tsx
// Widgets with named slots use this pattern
<Widget.Root>
  <Widget.SlotName>
    {/* Slot content */}
  </Widget.SlotName>
  <Widget.Child>
    {/* Main content */}
  </Widget.Child>
</Widget.Root>
```

This maps to GTK's concept of widget properties that accept child widgets (like `HeaderBar`'s title widget).
