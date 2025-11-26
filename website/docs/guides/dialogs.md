---
sidebar_position: 3
---

# Working with Dialogs

This guide covers how to display dialogs and modal windows in GTKX applications.

## Dialog Types

GTKX supports several types of dialogs:

- **AboutDialog** - Application information
- **FileDialog** - File selection (open/save)
- **AlertDialog** - Alerts and confirmations
- **ColorDialogButton** - Color picker
- **FontDialogButton** - Font picker

## AboutDialog

Display information about your application:

```tsx
const [showAbout, setShowAbout] = useState(false);

<Button label="About" onClicked={() => setShowAbout(true)} />

{showAbout && (
  <AboutDialog
    programName="My Application"
    version="1.0.0"
    comments="A great application built with GTKX"
    copyright="Copyright 2024"
    authors={["Developer Name"]}
    website="https://example.com"
    license="MIT License"
    onCloseRequest={() => {
      setShowAbout(false);
      return false;
    }}
  />
)}
```

### AboutDialog Props

| Prop | Type | Description |
|------|------|-------------|
| `programName` | string | Application name |
| `version` | string | Version string |
| `comments` | string | Short description |
| `copyright` | string | Copyright notice |
| `authors` | string[] | List of authors |
| `website` | string | Application website |
| `license` | string | License text |
| `logo` | string | Path to logo image |

## Color Dialog

Use the built-in color dialog button:

```tsx
<Box spacing={10}>
  <Label.Root label="Choose a color:" />
  <ColorDialogButton />
</Box>
```

The `ColorDialogButton` opens a color chooser dialog when clicked.

## Font Dialog

Use the built-in font dialog button:

```tsx
<Box spacing={10}>
  <Label.Root label="Choose a font:" />
  <FontDialogButton />
</Box>
```

The `FontDialogButton` opens a font chooser dialog when clicked.

## Popover (Lightweight Dialog)

For lightweight modal content, use popovers:

```tsx
<Popover.Root autohide>
  <Popover.Child>
    <Box spacing={10} marginTop={10} marginBottom={10} marginStart={10} marginEnd={10}>
      <Label.Root label="Popover Content" />
      <Button label="Action 1" onClicked={() => {}} />
      <Button label="Action 2" onClicked={() => {}} />
    </Box>
  </Popover.Child>
  <Button label="Open Popover" />
</Popover.Root>
```

### Popover Props

| Prop | Type | Description |
|------|------|-------------|
| `autohide` | boolean | Close when clicking outside |
| `hasArrow` | boolean | Show pointing arrow |
| `position` | Gtk.PositionType | Where to show the popover |

## MenuButton with Popover

Combine a button with a popover menu:

```tsx
<MenuButton.Root label="Menu">
  <MenuButton.Popover>
    <Popover.Root>
      <Popover.Child>
        <Box spacing={5} marginTop={10} marginBottom={10} marginStart={10} marginEnd={10}>
          <Button label="New" onClicked={() => {}} />
          <Button label="Open" onClicked={() => {}} />
          <Separator />
          <Button label="Save" onClicked={() => {}} />
          <Button label="Save As..." onClicked={() => {}} />
        </Box>
      </Popover.Child>
    </Popover.Root>
  </MenuButton.Popover>
</MenuButton.Root>
```

## Custom Dialog Patterns

### Confirmation Dialog

Build custom confirmation dialogs using state:

```tsx
const [showConfirm, setShowConfirm] = useState(false);
const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

const confirmAction = (action: () => void) => {
  setPendingAction(() => action);
  setShowConfirm(true);
};

const handleConfirm = () => {
  pendingAction?.();
  setShowConfirm(false);
  setPendingAction(null);
};

const handleCancel = () => {
  setShowConfirm(false);
  setPendingAction(null);
};

// Usage
<Button
  label="Delete"
  onClicked={() => confirmAction(() => deleteItem())}
/>

{showConfirm && (
  <Box cssClasses={["dialog-overlay"]}>
    <Frame.Root>
      <Frame.Child>
        <Box spacing={10} marginTop={20} marginBottom={20} marginStart={20} marginEnd={20}>
          <Label.Root label="Are you sure?" />
          <Box spacing={10}>
            <Button label="Cancel" onClicked={handleCancel} />
            <Button label="Confirm" onClicked={handleConfirm} />
          </Box>
        </Box>
      </Frame.Child>
    </Frame.Root>
  </Box>
)}
```

### Modal State Management

For complex applications, manage dialog state centrally:

```tsx
type DialogType = "about" | "settings" | "confirm" | null;

const [activeDialog, setActiveDialog] = useState<DialogType>(null);

const openDialog = (type: DialogType) => setActiveDialog(type);
const closeDialog = () => setActiveDialog(null);

// Render active dialog
{activeDialog === "about" && (
  <AboutDialog onCloseRequest={() => { closeDialog(); return false; }} />
)}

{activeDialog === "settings" && (
  <SettingsDialog onClose={closeDialog} />
)}
```

## Best Practices

### Always Handle Close

Always provide a way to close dialogs:

```tsx
<AboutDialog
  onCloseRequest={() => {
    setShowDialog(false);
    return false; // Allow closing
  }}
/>
```

### Conditional Rendering

Use conditional rendering for dialogs:

```tsx
// Good - only mounts when needed
{showDialog && <MyDialog />}

// Avoid - always mounted, just hidden
<MyDialog visible={showDialog} />
```

### Focus Management

Dialogs should grab focus when opened. GTK handles this automatically for most dialog types.

### Escape Key

Most GTK dialogs support closing with the Escape key by default.
