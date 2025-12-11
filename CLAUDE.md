# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GTKX is a React-based framework for building native GTK4 desktop applications on Linux. It uses a custom React reconciler to render React components as native GTK widgets via FFI bindings generated from GObject Introspection (GIR) files.

## Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages (uses Turbo)
pnpm test             # Run all tests (serial due to GTK's single-threaded nature)
pnpm lint             # Run Biome linter
pnpm codegen          # Regenerate FFI/JSX bindings from GIR files
pnpm knip             # Check for unused code

# Single package
cd packages/<package> && pnpm build
cd packages/<package> && pnpm test

# Run specific test file
cd packages/react && pnpm test tests/specific.test.tsx

# Run examples
cd examples/gtk4-demo && pnpm dev
```

## Architecture

### Package Dependency Graph

```
@gtkx/cli ─────────────────┬──────────────────┐
                           │                  │
@gtkx/testing ─────────────┤                  │
                           │                  ▼
@gtkx/css ─────────────────┼───────────> @gtkx/react
                           │                  │
                           │                  ▼
                           └──────────> @gtkx/ffi
                                              │
                                              ▼
                                        @gtkx/native (Rust)
```

- **@gtkx/native**: Rust crate using Neon for Node.js bindings. Provides raw FFI calls to GTK4 via libffi.
- **@gtkx/ffi**: TypeScript FFI bindings auto-generated from GIR files. Wraps native calls with type-safe APIs.
- **@gtkx/react**: Custom React reconciler (`packages/react/src/reconciler.ts`) that maps React elements to GTK widgets.
- **@gtkx/gir**: GIR file parser used during codegen (not published).

### React Reconciler

The reconciler in `packages/react/src/reconciler.ts` implements React's host config interface. Key files:

- `factory.ts`: Node class registry and creation logic
- `nodes/*.ts`: Node implementations for specific GTK widgets
- `generated/jsx.ts`: Auto-generated JSX type definitions

### Adding Widget Support

1. Create a Node class in `packages/react/src/nodes/`
2. Add it to `NODE_CLASSES` in `packages/react/src/factory.ts`
3. Implement: `matches()`, `initialize()`, `appendChild()`, `removeChild()`
4. Run `pnpm codegen` to regenerate JSX types
5. Add tests in `packages/react/tests/`

### Generated Code

Files in `packages/ffi/src/generated/` and `packages/react/src/generated/` are auto-generated. Modify the generators instead:

- FFI generator: `packages/ffi/src/codegen/ffi-generator.ts`
- JSX generator: `packages/react/src/codegen/jsx-generator.ts`

## Testing

Tests require GTK4 and X11. On non-CI environments, tests run via xvfb:

```bash
GDK_BACKEND=x11 xvfb-run -a vitest run
```

Tests run serially (`--concurrency=1`) because GTK is single-threaded.

## Code Style

- Biome for formatting/linting (4-space indent, 120 line width)
- TypeScript strict mode
