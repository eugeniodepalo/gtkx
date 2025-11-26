---
sidebar_position: 2
---

# Event Handling

This guide covers how to handle user interactions and events in GTKX applications.

## Signal-Based Events

GTK uses signals for event handling. In GTKX, signals become React props with the `on` prefix:

| GTK Signal | React Prop |
|------------|------------|
| `clicked` | `onClicked` |
| `toggled` | `onToggled` |
| `changed` | `onChanged` |
| `close-request` | `onCloseRequest` |
| `state-set` | `onStateSet` |

## Button Clicks

```tsx
<Button
  label="Click me"
  onClicked={() => {
    console.log("Button clicked!");
  }}
/>
```

## Toggle Events

For toggle buttons, switches, and check buttons:

```tsx
const [active, setActive] = useState(false);

// ToggleButton
<ToggleButton.Root
  label={active ? "ON" : "OFF"}
  active={active}
  onToggled={() => setActive(a => !a)}
/>

// Switch - returns true to indicate the signal was handled
<Switch
  active={active}
  onStateSet={() => {
    setActive(a => !a);
    return true;
  }}
/>

// CheckButton
<CheckButton.Root
  label="Enable"
  active={active}
  onToggled={() => setActive(a => !a)}
/>
```

## Input Events

### Entry (Text Input)

```tsx
const [text, setText] = useState("");

<Entry
  text={text}
  placeholderText="Type here..."
  onChanged={() => {
    // Note: You may need to read the value from the widget
    setText(text);
  }}
  onActivate={() => {
    // Called when Enter is pressed
    console.log("Submitted:", text);
  }}
/>
```

### SearchEntry

```tsx
<SearchEntry
  placeholderText="Search..."
  onSearchChanged={() => {
    console.log("Search query changed");
  }}
/>
```

### Scale (Slider)

```tsx
const [value, setValue] = useState(50);

<Scale
  value={value}
  onValueChanged={() => {
    setValue(value);
  }}
  drawValue
/>
```

### SpinButton

```tsx
<SpinButton
  onValueChanged={() => {
    console.log("Value changed");
  }}
/>
```

## Window Events

### Close Request

Handle window close to clean up resources:

```tsx
import { quit } from "@gtkx/gtkx";

<ApplicationWindow
  onCloseRequest={() => {
    // Perform cleanup
    quit();
    return false; // Return false to allow closing
  }}
>
```

### Returning Values from Handlers

Some handlers expect a return value:

- `onCloseRequest`: Return `false` to allow closing, `true` to prevent
- `onStateSet`: Return `true` to indicate the signal was handled

## Selection Events

### ListBox

```tsx
import * as Gtk from "@gtkx/ffi/gtk";

<ListBox
  selectionMode={Gtk.SelectionMode.SINGLE}
  onRowSelected={() => {
    console.log("Row selected");
  }}
>
  <ListBoxRow>
    <Label.Root label="Item 1" />
  </ListBoxRow>
  <ListBoxRow>
    <Label.Root label="Item 2" />
  </ListBoxRow>
</ListBox>
```

### Calendar

```tsx
<Calendar
  onDaySelected={() => {
    console.log("Date selected");
  }}
/>
```

## Reveal/Expand Events

### Revealer

```tsx
const [revealed, setRevealed] = useState(false);

<Button
  label={revealed ? "Hide" : "Show"}
  onClicked={() => setRevealed(r => !r)}
/>

<Revealer revealChild={revealed}>
  <Label.Root label="Revealed content" />
</Revealer>
```

### Expander

The expander handles its own toggle internally:

```tsx
<Expander.Root label="Click to expand">
  <Expander.Child>
    <Label.Root label="Expanded content" />
  </Expander.Child>
</Expander.Root>
```

## Dialog Events

```tsx
const [showDialog, setShowDialog] = useState(false);

<Button label="Show Dialog" onClicked={() => setShowDialog(true)} />

{showDialog && (
  <AboutDialog
    programName="My App"
    version="1.0.0"
    onCloseRequest={() => {
      setShowDialog(false);
      return false;
    }}
  />
)}
```

## Emoji Picker

```tsx
const [emoji, setEmoji] = useState("😊");

<EmojiChooser
  onEmojiPicked={(selectedEmoji: string) => {
    if (selectedEmoji) {
      setEmoji(selectedEmoji);
    }
  }}
/>
<Label.Root label={`Selected: ${emoji}`} />
```

## Best Practices

### Use React State

Always manage UI state with React's `useState`:

```tsx
const [count, setCount] = useState(0);

<Button
  label={`Count: ${count}`}
  onClicked={() => setCount(c => c + 1)}
/>
```

### Cleanup with useEffect

For side effects and cleanup:

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    setProgress(p => (p >= 1 ? 0 : p + 0.01));
  }, 100);

  return () => clearInterval(interval);
}, []);
```

### Handler Return Values

Be mindful of handler return values:

```tsx
// Wrong - won't prevent default behavior
<Switch onStateSet={() => setActive(a => !a)} />

// Correct - returns true to indicate handling
<Switch
  onStateSet={() => {
    setActive(a => !a);
    return true;
  }}
/>
```

### Event Handler Naming

Follow React conventions for handler props:

```tsx
// Component props
interface MyComponentProps {
  onSave: () => void;
  onCancel: () => void;
}

// Using the handlers
<MyComponent
  onSave={() => save()}
  onCancel={() => cancel()}
/>
```
