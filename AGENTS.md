# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

GTKX is a React-driven native GTK4 UI framework that bridges JavaScript/TypeScript to GTK4 through a typed FFI layer. It's a monorepo with three main packages:

- `@gtkx/native`: Rust+Neon FFI layer that manages GTK4 thread and exposes typed `call` API
- `@gtkx/ffi`: TypeScript wrapper mapping high-level types to native module
- `@gtkx/gtkx`: Top-level developer API (minimal currently, planned React reconciler)

## Development Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Build all packages
pnpm build

# Run tests (not yet implemented)
pnpm test

# Run the demo application
cd examples/demo && pnpm start
```

## Build System

- **Package Manager**: pnpm with workspaces
- **Build Orchestrator**: Turbo
- **Native Build**: Cargo + Neon (builds automatically via pnpm build)

## Architecture

### Threading Model

- GTK runs on separate thread from Node.js
- Communication via Neon channels
- FFI calls dispatched via `glib::idle_add_once`
- Callbacks invoked back to JS thread

### Type System

Compact discriminated union supporting:

- Primitives: int (8/32/64-bit), float, boolean, string
- Complex: GObjects, boxed types, arrays, callbacks, refs (out-params)
- Special: null, undefined

### Object Management

- GObjects tracked via numeric IDs in thread-local state
- Reference counting via GLib
- Out-parameters handled via `createRef<T>()` pattern

### Key Files

- `packages/native/src/lib.rs` - Native module entry point
- `packages/native/src/module/call.rs` - FFI invocation with libffi
- `packages/native/src/types.rs` - Type system definitions
- `packages/ffi/src/gtk/` - GTK-specific bindings (ApplicationWindow, etc.)

### Module Exports

Packages use conditional exports:

```json
"exports": {
  "development": "./index.ts",
  "default": "./dist/index.js"
}
```

This allows TypeScript to use source files directly during development.

## Testing

Currently no tests implemented. When adding tests:

- Rust tests: `cargo test` in packages/native
- TypeScript tests: Add to respective package.json scripts
- Integration tests: Test against the demo application

## Common Tasks

### Adding a new GTK binding

1. Add TypeScript wrapper in `packages/ffi/src/gtk/`
2. Export from `packages/ffi/src/gtk/index.ts`
3. Use native `call` function with appropriate type descriptors

### Debugging native module

1. Build debug version: `cd packages/native && cargo build`
2. Check Rust logs and panics
3. Use `RUST_BACKTRACE=1` for stack traces

### Working with refs (out-parameters)

```typescript
import { createRef } from "@gtkx/ffi";

const widthRef = createRef<number>(0);
const heightRef = createRef<number>(0);
window.getDefaultSize(widthRef, heightRef);
console.log(widthRef.value, heightRef.value);
```
