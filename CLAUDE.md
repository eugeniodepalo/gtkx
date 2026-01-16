# GTKX Architecture Guide

GTKX is a monorepo enabling native GTK4 desktop application development using React and TypeScript.

## Layered Architecture

```
┌────────────────────────────────────┐
│  React Application Layer           │
│  (TSX/JSX Components)              │
└────────────────┬───────────────────┘
                 │
┌────────────────▼───────────────────┐
│  React Reconciler + Host Config    │
│  (@gtkx/react)                     │
│  - Fiber tree management           │
│  - Signal & event handling         │
│  - Batching & scheduling           │
└────────────────┬───────────────────┘
                 │
┌────────────────▼───────────────────┐
│  Node System                       │
│  - Virtual nodes                   │
│  - Widget-specific reconciliation  │
│  - Model management (lists/trees)  │
└────────────────┬───────────────────┘
                 │
┌────────────────▼───────────────────┐
│  TypeScript FFI Bindings           │
│  (@gtkx/ffi)                       │
│  - Generated GTK/GLib/Adw/etc.     │
│  - Batched call interface          │
│  - Native object management        │
└────────────────┬───────────────────┘
                 │
┌────────────────▼───────────────────┐
│  Native Module (Neon/Rust)         │
│  (@gtkx/native)                    │
│  - Two-thread GTK dispatch         │
│  - LibFFI trampoline calling       │
│  - GObject/Boxed memory management │
└────────────────┬───────────────────┘
                 │
┌────────────────▼───────────────────┐
│  Native Libraries                  │
│  (libgtk-4, libadwaita, libglib)   │
└────────────────────────────────────┘
```

## Package Structure

### Core Packages

| Package         | Purpose                                              |
| --------------- | ---------------------------------------------------- |
| `@gtkx/react`   | React integration layer, reconciler, and node system |
| `@gtkx/ffi`     | Generated TypeScript FFI bindings for GTK/GLib       |
| `@gtkx/native`  | Rust native module (Neon) providing the FFI bridge   |
| `@gtkx/gir`     | GObject Introspection (GIR) file parser              |
| `@gtkx/codegen` | Code generator for TypeScript bindings               |
| `@gtkx/cli`     | CLI for creating new GTKX projects                   |
| `@gtkx/testing` | Testing utilities                                    |
| `@gtkx/css`     | CSS styling support                                  |
| `@gtkx/mcp`     | MCP integration for AI-assisted development          |
| `@gtkx/vitest`  | Vitest integration                                   |

### Package Dependencies

```
@gtkx/react
    └─► @gtkx/ffi
           └─► @gtkx/native

@gtkx/codegen
    └─► @gtkx/gir
```

## Reconciler System

### Host Config (`packages/react/src/host-config.ts`)

The reconciler implements React's HostConfig interface with mutation support:

**Instance Management:**

- `createInstance()` - Creates nodes via `createNode()` factory
- `appendInitialChild()` - Adds child during initial render
- `finalizeInitialChildren()` - Applies initial props

**Updates:**

- `commitUpdate()` - Delegates prop changes to node's `updateProps()`
- `commitMount()` - Calls node's `mount()` lifecycle

**Mutations:**

- `appendChild()`, `removeChild()`, `insertBefore()` - Direct tree manipulation

**Text Handling:**

- `createTextInstance()` - Creates TextSegment nodes in TextBuffer context, GtkLabel otherwise
- `commitTextUpdate()` - Updates text content

**Batching & Scheduling:**

- `prepareForCommit()` - Blocks signals, starts FFI batch
- `resetAfterCommit()` - Flushes after-commit work, unblocks signals

### Node Factory & Registry

The node factory (`packages/react/src/nodes/factory.ts`) uses a priority-based registry where node classes are sorted by priority and the first matching class wins. This enables extensibility without modification.

## Node System

### Base Node Class

```typescript
class Node<T = unknown, P = Props> {
  container: T;
  typeName: string;

  appendChild(child: Node): void;
  removeChild(child: Node): void;
  insertBefore(child: Node, before: Node): void;
  updateProps(oldProps: P, newProps: P): void;
  mount(): void;
  unmount(): void;
}
```

### Node Hierarchy

#### WidgetNode (priority 3)

Base for all GTK widgets. Handles:

- Event controllers (motion, click, key, scroll, drag, drop, gestures)
- Property/signal routing
- Child attachment/detachment
- Size requests, focus grabbing

Event controller props include: `onEnter`, `onLeave`, `onMotion`, `onPressed`, `onReleased`, `onKeyPressed`, `onKeyReleased`, `onScroll`, `onDragPrepare`, `onDrop`, `onGestureDragBegin`, etc.

#### ApplicationNode (priority 0)

Top-level GTK Application managing window lifecycle and application menu.

#### Specialized Widget Nodes (priority 1)

| Node               | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `ListViewNode`     | Manages ListView/GridView with `renderItem` function |
| `TreeListViewNode` | Manages TreeListView with hierarchical data          |
| `ColumnViewNode`   | Manages ColumnView columns                           |
| `AutowrappedNode`  | Handles ListBox/FlowBox auto-wrapping                |
| `StackNode`        | Manages Stack/ViewStack pages                        |
| `NotebookNode`     | Manages Notebook with tabs                           |
| `TextBufferNode`   | Virtual node managing text formatting                |
| `TextViewNode`     | Text editor widget                                   |

#### Virtual Nodes (priority 1)

Nodes without real GTK containers that manage children logically:

| Node              | Purpose                                                 |
| ----------------- | ------------------------------------------------------- |
| `VirtualNode`     | Base for non-widget nodes                               |
| `SlotNode`        | Positions named children in parent via property setters |
| `TextBufferNode`  | Manages TextBuffer content and tags                     |
| `TextSegmentNode` | Plain text in TextBuffer                                |
| `TextTagNode`     | Formatted text with styling                             |
| `TextAnchorNode`  | Widget anchors in text                                  |
| `AdjustmentNode`  | Manages scroll adjustments                              |

#### Child/Layout Nodes (virtual)

| Node               | Purpose                    |
| ------------------ | -------------------------- |
| `GridChildNode`    | Grid cell positioning      |
| `FixedChildNode`   | Fixed positioning          |
| `PackChildNode`    | Pack container positioning |
| `OverlayChildNode` | Overlay layer positioning  |
| `ToolbarChildNode` | Toolbar item positioning   |

## State Management

### Signal Store (`packages/react/src/nodes/internal/signal-store.ts`)

Centralized GTK signal connection manager that:

- Tracks handler IDs per owner (Node instance)
- Blocks non-lifecycle signals during commit to prevent circular updates
- Never blocks lifecycle signals: `realize`, `unrealize`, `map`, `unmap`, `show`, `hide`, `destroy`, `render`, `setup`, `bind`, `unbind`, `teardown`

### Scheduler (`packages/react/src/scheduler.ts`)

Priority-based after-commit callback queue:

- **HIGH** - Widget removals (unparent before reparent)
- **NORMAL** - Widget additions
- **LOW** - Model sync operations

### Batching System (`packages/ffi/src/batch.ts`)

Queues void-returning FFI calls into a single native round-trip:

- Reduces JS↔Rust boundary crossings
- Methods with return values execute immediately
- Nested batches supported via stack

## GTK Bindings & FFI Layer

### Binding Generation Pipeline

```
GIR files → GIR parser → Codegen → TypeScript types → react package
                               ↓
                        Internal metadata
                        (PROPS, SIGNALS, CONSTRUCTOR_PROPS)
```

### Generated Namespaces (`packages/ffi/src/generated/`)

| Namespace                           | Contents               |
| ----------------------------------- | ---------------------- |
| `gtk/`                              | GTK4 widgets           |
| `adw/`                              | Libadwaita components  |
| `gtksource/`                        | Text editor components |
| `vte/`                              | Terminal emulation     |
| `webkit/`                           | WebKitWebView          |
| `gdk/`, `glib/`, `gobject/`, `gio/` | Core libraries         |

### Generated Metadata (`packages/react/src/generated/internal.ts`)

- `CONSTRUCTOR_PROPS` - Arguments for widget constructors
- `LIST_WIDGET_CLASSES` - ListView/GridView types
- `AUTOWRAP_CLASSES` - Auto-wrapping containers
- `STACK_CLASSES` - Stack widgets
- `PROPS` & `SIGNALS` - Property/signal lookup tables

## Native Module (Rust/Neon)

### Two-Thread Architecture

- **JS Thread** - Handles React reconciliation, calls FFI, manages callbacks
- **GTK Thread** - Runs GTK main loop, executes all widget operations

### Key Components (`packages/native/src/`)

| Module            | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `gtk_dispatch.rs` | Schedules tasks from JS thread to GTK thread         |
| `js_dispatch.rs`  | Queues callbacks from GTK to JS thread               |
| `trampoline.rs`   | LibFFI call mechanism for native function invocation |
| `types.rs`        | FFI type system with struct packing/unpacking        |
| `value.rs`        | JS ↔ Native value conversion                         |
| `managed/`        | GObject, Boxed, and Fundamental type management      |

### Exported Functions

```rust
start(appId, flags)       // Initialize GTK, spawn thread
stop()                    // Shutdown GTK thread
call(lib, symbol, args)   // Single FFI call
batchCall(descriptors)    // Multiple calls in one round-trip
alloc(size)               // Allocate boxed memory
read(handle, offset)      // Read struct field
write(handle, offset, val)// Write struct field
getNativeId(handle)       // Get object identity
poll()                    // Dispatch pending callbacks
```

## List & Tree Models

### List Models (`packages/react/src/nodes/models/list.ts`)

- Manages `Gtk.ListStore` internally
- Selection model (NoSelection, SingleSelection, MultiSelection)
- Stores data keyed by item ID
- Fires `selection-changed` signals

### Tree Models (`packages/react/src/nodes/models/tree-list.ts`)

- Hierarchical tree structure with parent-child relationships
- Manages `Gtk.TreeStore`
- Supports tree expansion/collapse

### Item Rendering

`ListItemRenderer` and `TreeListItemRenderer` use factory + setup signal handlers to call user-provided `renderItem` functions for each item's widget.

## Key Design Patterns

### Node Registry Pattern

Plugins register node classes with priority. Factory matches first priority-matching class, enabling extensibility.

### Virtual Node Pattern

Nodes without GTK containers (TextBuffer, Slot, etc.) manage children logically without rendering themselves.

### Slot Pattern

Maps JSX children to widget property setters via `<Slot id="child">`, resolving to camelCase property names.

### Model Pattern

Separates list/tree data management from rendering. Models own GTK Store objects, Nodes own Models.

### Signal Blocking Pattern

Blocks non-lifecycle signals during commit to prevent feedback loops. Lifecycle signals are never blocked.

## Build System

### Turbo Tasks

| Task             | Purpose                                      |
| ---------------- | -------------------------------------------- |
| `//#codegen:run` | Primary code generation from GIR files       |
| `build`          | TypeScript build + native module compilation |
| `native-build`   | Rust compilation via `scripts/build.js`      |
| `test`           | Vitest unit/integration tests                |
| `lint`           | Biome linter                                 |

### Code Generation Workflow

```
GIR files → @gtkx/gir → @gtkx/codegen → packages/ffi/src/generated/
                                      → packages/react/src/generated/
```

## Render Flow

### Application Start

```typescript
render(element, appId, flags)
  ↓
ffi.start(appId, flags)              // Initialize GTK, spawn thread
  ↓
reconciler.createContainer(app)      // Create root fiber
  ↓
reconciler.updateContainer(element)  // Begin reconciliation
```

### Reconciliation Cycle

1. React creates work/commit phases
2. Host config creates/updates nodes
3. Nodes manage widget creation/property binding
4. Commit phase triggers `resetAfterCommit()`:
   - Ends FFI batch → executes all queued calls
   - Flushes after-commit callbacks (priority-ordered)
   - Unblocks GTK signals

### Shutdown

```typescript
reconciler.updateContainer(null); // Unmount tree
ffi.stop(); // Join GTK thread
```

## Development Guidelines

### Code Style

- No inline comments; only JSDoc annotations are acceptable
- Proper solutions only; no shortcuts or temporary workarounds
- Fix all issues encountered, including pre-existing ones

### Git Rules

- Never stash, checkout, or reset
- No co-author attribution in commits
