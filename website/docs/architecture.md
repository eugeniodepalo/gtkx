---
sidebar_position: 4
---

# Architecture

This document explains the internal architecture of GTKX and how it bridges React with GTK4.

## Overview

GTKX consists of four main layers:

```
┌─────────────────────────────────────┐
│         React Components            │  @gtkx/gtkx
│    (JSX, hooks, state management)   │
├─────────────────────────────────────┤
│         React Reconciler            │  @gtkx/gtkx
│    (translates React → GTK calls)   │
├─────────────────────────────────────┤
│         FFI Bindings                │  @gtkx/ffi
│    (TypeScript wrappers for GTK)    │
├─────────────────────────────────────┤
│         Native Module               │  @gtkx/native
│    (Rust + libffi → GTK C API)      │
└─────────────────────────────────────┘
```

## Code Generation Pipeline

GTKX uses code generation to create TypeScript bindings from GTK's introspection data:

### 1. GIR Files

GObject Introspection Repository (GIR) files are XML documents that describe GTK's C API. They're located at `/usr/share/gir-1.0/` on Linux systems.

```xml
<class name="Button" parent="Widget">
  <method name="set_label">
    <parameters>
      <parameter name="label" type="utf8"/>
    </parameters>
  </method>
  <property name="label" type="utf8"/>
  <signal name="clicked"/>
</class>
```

### 2. GIR Parser (@gtkx/gir)

The parser reads GIR files and converts them to TypeScript data structures:

```typescript
interface GirClass {
  name: string;
  parent?: string;
  methods: GirMethod[];
  properties: GirProperty[];
  signals: GirSignal[];
}
```

### 3. FFI Generator (@gtkx/ffi)

Generates TypeScript classes with FFI calls:

```typescript
// Generated code
export class Button extends Widget {
  static new(): Button {
    return new Button(call("Gtk", "gtk_button_new", [], "pointer"));
  }

  setLabel(label: string): void {
    call("Gtk", "gtk_button_set_label", [this.ptr, label], "void");
  }

  getLabel(): string {
    return call("Gtk", "gtk_button_get_label", [this.ptr], "utf8");
  }
}
```

### 4. JSX Generator (@gtkx/gtkx)

Generates React component types:

```typescript
// Generated JSX types
export interface ButtonProps {
  label?: string;
  onClicked?: () => void;
  // ... other props
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      Button: ButtonProps;
    }
  }
}
```

## React Reconciler

The reconciler is the heart of GTKX. It implements React's `react-reconciler` API to translate React operations into GTK widget operations.

### Node Types

GTKX uses different node types for different widget categories:

| Node Type | Purpose |
|-----------|---------|
| `WidgetNode` | Standard GTK widgets (Button, Box, Label) - fallback handler |
| `TextNode` | Text nodes wrapped in Label widgets |
| `DialogNode` | Dialog widgets (FileDialog, ColorDialog, FontDialog, AlertDialog, AboutDialog) |
| `SlotNode` | Named child slots (HeaderBar.TitleWidget) |
| `ListViewNode` / `ListItemNode` | List item handling for ListView |
| `DropDownNode` / `DropDownItemNode` | DropDown widget with StringList model |
| `GridNode` / `GridChildNode` | Grid widget with row/column attachment |
| `OverlayNode` | Overlay widget with child/overlay management |
| `ActionBarNode` | ActionBar widget with start/center/end slots |
| `NotebookNode` | Notebook widget with page management |

All nodes implement the `Node` interface and nodes with signal handlers must implement `dispose()` for cleanup.

### Reconciler Operations

```typescript
const reconciler = createReconciler({
  // Create a GTK widget instance
  createInstance(type, props) {
    return createNode(type, props);
  },

  // Update widget properties
  commitUpdate(node, updatePayload, type, oldProps, newProps) {
    node.update(newProps);
  },

  // Append child to parent
  appendChild(parent, child) {
    parent.appendChild(child);
  },

  // Remove child from parent
  removeChild(parent, child) {
    parent.removeChild(child);
  }
});
```

## Native Module (@gtkx/native)

The native module is written in Rust using the Neon framework. It provides:

### call() Function

Dynamically calls C functions using libffi:

```typescript
// TypeScript usage
call("Gtk", "gtk_button_new", [], "pointer");
call("Gtk", "gtk_button_set_label", [ptr, "Hello"], "void");
```

### start() / stop() Functions

Manage the GTK main loop:

```typescript
start("com.example.app"); // Start GTK application
stop();                    // Stop GTK main loop
```

### createRef() Function

Creates references for callback-based APIs:

```typescript
const ref = createRef(value);
// ref can be passed to GTK and retrieved later
```

## Widget Slots

Some GTK widgets have named child slots instead of generic children. GTKX handles these through compound components:

```tsx
// HeaderBar has specific slots for title and actions
<HeaderBar.Root>
  <HeaderBar.TitleWidget>
    <Label.Root label="My App" />
  </HeaderBar.TitleWidget>
  <HeaderBar.Start>
    <Button label="Back" />
  </HeaderBar.Start>
  <HeaderBar.End>
    <Button label="Menu" />
  </HeaderBar.End>
</HeaderBar.Root>
```

The `SlotNode` captures children and assigns them to the correct GTK property.

## Property Mapping

GTK uses snake_case for properties, while React conventions use camelCase:

| GTK Property | React Prop |
|--------------|------------|
| `default_width` | `defaultWidth` |
| `margin_start` | `marginStart` |
| `tooltip_text` | `tooltipText` |

The generator automatically converts between these conventions.

## Signal Handling

GTK signals become React event handlers with the `on` prefix:

| GTK Signal | React Handler |
|------------|---------------|
| `clicked` | `onClicked` |
| `close-request` | `onCloseRequest` |
| `state-set` | `onStateSet` |

Signals are connected when the component mounts and disconnected on unmount.

## Memory Management

- Widget pointers are stored in JavaScript objects
- GTK's reference counting manages native memory
- The reconciler tracks all node instances in a Set for cleanup
- `disposeAllInstances()` ensures all signal handlers are disconnected when the app exits
- Signal handler closures capture Neon Channels, which keep Node.js alive until properly disconnected
- Void-returning FFI calls are async (dispatched via `idle_add_once`); non-void calls are synchronous
