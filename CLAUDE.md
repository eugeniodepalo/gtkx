# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages (excludes website)
pnpm test             # Run all tests (serial due to GTK's single-threaded nature)
pnpm lint             # Run Biome linter
pnpm codegen          # Regenerate FFI/JSX bindings from GIR files
pnpm knip             # Check for unused code

# Run a single package
cd packages/<package> && pnpm build
cd packages/<package> && pnpm test

# Run a specific test file
cd packages/react && pnpm test tests/specific.test.tsx

# Run examples
cd examples/gtk4-demo && pnpm dev
```

## Architecture

GTKX is a React renderer for GTK4. It allows building native Linux desktop apps with React and TypeScript.

### Package Dependencies

```
@gtkx/native (Rust/Neon)
    ↓
@gtkx/ffi (TypeScript FFI bindings)
    ↓
@gtkx/react (React reconciler)
    ↓
@gtkx/css, @gtkx/testing, @gtkx/cli
```

### Core Flow

1. **Native Module** (`packages/native/src/`) - Rust crate using Neon and libffi to call GTK4 functions dynamically. Handles FFI calls, GObject lifecycle, signal callbacks, and libuv integration.

2. **FFI Package** (`packages/ffi/src/`) - Auto-generated TypeScript bindings for GTK4 from GIR files. `native.ts` provides `start()`, `stop()`, `getObject()` for application lifecycle.

3. **React Package** (`packages/react/src/`) - Custom React reconciler using react-reconciler. Key files:
   - `reconciler.ts`: Implements React's HostConfig, batches FFI calls in commits
   - `node.ts`: Base `Node` class wrapping GTK widgets with signal/prop management
   - `factory.ts`: Maps JSX types to Node subclasses
   - `nodes/`: Specialized node implementations for complex widgets (menus, lists, column views)

### Generated Code

Files in `packages/ffi/src/generated/` and `packages/react/src/generated/` are auto-generated from GIR files. Modify generators in `packages/*/src/codegen/` and run `pnpm codegen`.

### Node Class Hierarchy

Virtual nodes (no GTK widget): `ColumnViewItemNode`, `ListItemNode`, `MenuItemNode`, etc.
Specialized nodes (custom behavior): `WindowNode`, `ApplicationMenuNode`, `ToggleButtonNode`
Container nodes (child management): `GridNode`, `ListViewNode`, `ColumnViewNode`
Default: `WidgetNode` (generic GTK widget wrapper)

### Adding Widget Support

1. Create a Node class in `packages/react/src/nodes/`
2. Add to appropriate array in `packages/react/src/factory.ts`
3. Implement `matches()`, `initialize()`, `appendChild()`, `removeChild()`
4. Run `pnpm codegen` to regenerate JSX types
5. Add tests in `packages/react/tests/`

## Requirements

- Node.js 20+, pnpm 9+
- Rust toolchain (for native module)
- GTK4 dev libraries: `gtk4-devel` (Fedora) or `libgtk-4-dev` (Ubuntu)
- Tests require X11 (CI uses Xvfb)
