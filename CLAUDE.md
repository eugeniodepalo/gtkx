# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GTKX is a React-driven native GTK4 UI framework that enables building GTK4 applications using React and JSX. The project is a pnpm monorepo with four core packages forming a layered architecture.

## Architecture

The project uses a multi-layer architecture to bridge JavaScript/TypeScript to GTK4:

### 1. @gtkx/native (Rust + Neon)
- Bottom layer: Rust native module using Neon FFI
- Manages GTK4 main thread lifecycle (start/stop)
- Exposes `call()` API that marshals JS arguments into libffi call frames
- Dispatches GTK calls on the GTK main thread via `glib::idle_add_once`
- Converts return values and out-parameters (refs) back to JS values
- Key modules:
  - `src/module/call.rs`: FFI call dispatcher with channel-based sync between Node and GTK threads
  - `src/state.rs`: Thread-local state management for GObject tracking and library loading
  - `src/types/`: Type marshaling (GObject, boxed types, arrays, primitives, refs)
  - `src/arg.rs` and `src/value.rs`: Argument/value conversion between JS and C

### 2. @gtkx/gir (GIR Parsing)
- Shared library for parsing GObject Introspection (GIR) files
- `src/gir-parser.ts`: XML parser for GIR files, produces typed AST
- `src/type-mapper.ts`: Maps GIR types to TypeScript and FFI type descriptors
- Used by both @gtkx/ffi (for FFI bindings) and @gtkx/gtkx (for JSX types)

### 3. @gtkx/ffi (TypeScript)
- Middle layer: TypeScript wrapper around @gtkx/native
- Provides ergonomic, typed API for GTK calls
- **Code generation**: TypeScript bindings are generated from GIR files using @gtkx/gir
  - Generator: `src/codegen/code-generator.ts` produces TypeScript classes/functions
  - Generated code goes to `src/generated/` (one directory per namespace, e.g., `gtk/`, `gio/`)
- Re-exports `call` and `createRef` from @gtkx/native

### 4. @gtkx/gtkx (React Reconciler)
- Top layer: Developer-facing API with React reconciler
- Implements custom React reconciler using `react-reconciler`
- `src/reconciler.ts`: Maps JSX to GTK widgets, handles widget lifecycle, children management, and props
- `src/render.ts`: Entry point for `render(jsx, appOptions)`
- **Code generation**: JSX type definitions are generated from GTK GIR files using @gtkx/gir
  - Generator: `src/codegen/jsx-generator.ts` produces JSX intrinsic element types
  - Generated code: `src/generated/jsx.ts` with React JSX type declarations
- Provides `quit()` helper to stop GTK main loop

### Data Flow

```
React JSX → Reconciler → @gtkx/ffi → @gtkx/native (Neon) → GTK4 main thread
                                                                    ↓
                          JS callbacks ← Channel ← GLib closures ←┘
```

## Common Commands

### Building
```bash
# Build all packages (Turbo handles dependency order)
pnpm build

# Build only native module (Rust → .node binary)
cd packages/native && pnpm run neon-build

# Build individual package
cd packages/ffi && pnpm build
```

### Code Generation
```bash
# Generate TypeScript FFI bindings from GIR files
cd packages/ffi && pnpm run codegen

# Generate JSX type definitions from GTK GIR file
cd packages/gtkx && pnpm run codegen

# Or use turbo from root (generates both)
pnpm turbo codegen
```

### Testing
```bash
# Run tests (currently only Rust tests in @gtkx/native)
pnpm test

# Run Rust tests directly
cd packages/native && cargo test
```

### Linting and Formatting
```bash
# Lint and format with Biome (tab indentation, double quotes)
pnpm biome check --write .
```

### Running Examples
```bash
cd examples/demo
pnpm build
pnpm start
```

## Development Dependencies

The native module requires:
- GTK4 development libraries (`libgtk-4-dev` on Debian/Ubuntu)
- Rust toolchain (for Neon builds)
- GObject Introspection files (`.gir` files, typically in `/usr/share/gir-1.0`)

## Build System

- **Package manager**: pnpm with workspaces
- **Monorepo orchestration**: Turborepo
  - `codegen` task depends on `@gtkx/gir#build` (GIR parser must be built first)
  - `build` task depends on `@gtkx/native#build` and `^codegen` (codegen in dependencies)
  - `start` task depends on `^build` (build in dependencies) and is persistent
- **TypeScript**: Configured per-package with project references
- **Rust**: Cargo builds native module to `.node` binary via `@neon-rs/cli`

## Key Patterns

### Refs (Out-Parameters)
GTK functions with out-parameters use `createRef()`:
```typescript
import { createRef } from "@gtkx/ffi";
const widthRef = createRef();
someGtkFunction(widthRef);
console.log(widthRef.value); // Read the value after the call
```

### GObject Lifecycle
- GObjects are stored in `GtkThreadState.object_map` with numeric IDs
- JS holds object IDs; the Rust side manages actual GObject pointers
- Cleanup happens when objects are removed from the map

### Thread Safety
- All GTK calls execute on the GTK main thread via `glib::idle_add_once`
- Node thread blocks on `mpsc::channel` waiting for results
- Callbacks from GTK are dispatched back to Node thread via Neon channel

### JSX to Widget Mapping
The reconciler dynamically maps JSX element types (e.g., `"Button"`) to GTK widget classes by scanning `@gtkx/ffi/gtk` exports at runtime. Widget properties and children are set via GTK methods like `setChild`, `append`, or `insertChildAfter`.
