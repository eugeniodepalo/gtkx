# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GTKX is a framework for building native GTK4 desktop applications using React and TypeScript. It uses a custom React reconciler to render React components as native GTK4 widgets through FFI bindings.

## Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages (excludes website)
pnpm test             # Run all tests (requires X11/Xvfb)
pnpm lint             # Run Biome linter and turbo lint
pnpm codegen          # Regenerate FFI/JSX bindings from GIR files
pnpm knip             # Check for unused code

# Single package
cd packages/<pkg> && pnpm build
cd packages/<pkg> && pnpm test

# Single test file
cd packages/<pkg> && pnpm test tests/specific.test.tsx

# Examples
cd examples/gtk4-demo && pnpm dev
```

Tests run serially (GTK is single-threaded) and require Xvfb outside CI.

## Architecture

### Package Structure

- **@gtkx/native** — Rust module using Neon that bridges Node.js to GTK via libffi. Contains the low-level FFI call machinery.
- **@gtkx/ffi** — Auto-generated TypeScript bindings for GTK4/GLib/Adwaita libraries. Exports namespaces like `@gtkx/ffi/gtk`, `@gtkx/ffi/glib`, etc.
- **@gtkx/react** — React reconciler and JSX components. Contains the custom host config that maps React operations to GTK widget manipulation.
- **@gtkx/css** — CSS-in-JS styling using template literals that compile to GTK CSS classes.
- **@gtkx/testing** — Testing utilities with Testing Library-style API (`screen`, `userEvent`, queries).
- **@gtkx/gir** — GObject Introspection parser for reading `.gir` files.
- **@gtkx/cli** — CLI with Vite-based dev server for HMR.

### React Reconciler Node System

Node classes in `packages/react/src/nodes/` are categorized in `factory.ts`:

- **VIRTUAL_NODES** — Nodes without direct GTK widgets (list items, menu items, slots, grid children)
- **SPECIALIZED_NODES** — Nodes with custom behavior beyond simple widget mapping (windows, dialogs, toggle buttons)
- **CONTAINER_NODES** — Nodes that manage children specially (grids, lists, stacks, notebooks)
- **WidgetNode** — Default fallback for standard widgets

### Code Generation

Generated files (never edit directly):
- `packages/ffi/src/generated/` — FFI bindings from GIR
- `packages/react/src/generated/jsx.ts` — JSX type definitions

To modify generated code:
1. Edit generators in `packages/ffi/src/codegen/` or `packages/react/src/codegen/`
2. Run `pnpm codegen`

### Adding Widget Support

1. Create a Node class in `packages/react/src/nodes/`
2. Add to the appropriate array in `packages/react/src/factory.ts`
3. Implement: `matches()`, `initialize()`, `appendChild()`/`removeChild()`
4. Run `pnpm codegen` to regenerate JSX types
5. Add tests in `packages/react/tests/`

## Code Style

- Biome for formatting/linting (4-space indent, 120 line width)
- TypeScript strict mode enabled
- Run `pnpm lint` before committing
