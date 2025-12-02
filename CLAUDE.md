# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GTKX is a framework for building native GTK4 desktop applications using React and TypeScript. It bridges React's component model with GTK4's native widget system via a custom React Reconciler and Rust-based FFI bindings using libffi.

## Tech Stack

- **TypeScript** - Main programming language for all packages
- **React** - UI library for building component-based interfaces
- **Rust** - Native module for FFI bridge and performance-critical code
- **GObject Introspection (GIR)** - XML metadata for generating FFI bindings
- **pnpm** - Monorepo package manager
- **Biome** - Linter and code formatter
- **Knip** - Dead code detection
- **Vitest** - Testing framework
- **Turborepo** - Monorepo build system

## Package-specific Commands

```bash
turbo build                # Build package
turbo test                 # Run tests
turbo start                # Start example app
turbo codegen              # Run code generation from GIR files
```

## Root-level Commands

```bash
pnpm lint                 # Lint with Biome
pnpm lint --write         # Auto-fix lint issues
pnpm knip                 # Check for unused code
```

## Architecture

### Package Structure

- **@gtkx/react** (`packages/react`) - React reconciler and JSX components
- **@gtkx/ffi** (`packages/ffi`) - Generated TypeScript FFI bindings for GTK4
- **@gtkx/native** (`packages/native`) - Rust native module providing FFI bridge via libffi
- **@gtkx/css** (`packages/css`) - Emotion-style CSS-in-JS for GTK widgets
- **@gtkx/gir** (`packages/gir`) - GObject Introspection XML parser for code generation
- **@gtkx/testing** (`packages/testing`) - Testing Library-inspired utilities for testing GTKX components

### Examples

- **counter-example** (`examples/counter`) - Simple counter app demonstrating state and testing
- **gtk4-demo** (`examples/gtk4-demo`) - Comprehensive GTK4 widget showcase app, based on the official GTK4 demo

## Coding Guidelines

### Monorepo Practices

- Dev-only dependencies should go in the root level `devDependencies`
- Package-specific dependencies should go in each package's `dependencies` or `devDependencies`
- Use workspace protocol (`"workspace:*"`) for inter-package dependencies
- Install packages with `pnpm add <package> -w` to add to root `devDependencies`, or `pnpm add <package>` for package-specific dependencies

### Functional Programming

- Prefer functional programming over imperative/OOP
- Only use classes when encapsulation is necessary

### Modern TypeScript

- Use latest ESNext/NodeNext features as much as possible
- Avoid `any` - for unknown types, use `unknown` instead, then narrow the type
- Avoid type casts (especially `as unknown as T`) - refactor to use proper types
- Absolutely avoid non-null assertions (`!`) - use proper null checks or type narrowing
- Use project references: each package should have a main `tsconfig.json` that references a `tsconfig.{app,lib}.json` + an optional `tsconfig.test.json`. The test config should then reference the app/lib config. `app` is for examples, `lib` for packages. And they should both extend from `tsconfig.base.json` at the root.

### Comments

- Code should be self-documenting
- Never add inline comments - if code needs explanation, refactor it
- Use TSDoc only for public APIs
- Prefer descriptive names over comments
- Never edit generated files in `src/generated/` directories

### Naming

- Use kebab-case for all files: `my-component.ts`
- Names should be clear but not overly specific, and they should be consistent across the codebase
- Prefer generic reusable names: `setup` over `setupTestsForGtk`
- Use named exports only - never use default exports. Export names should be unique withint a package.

### Code Reuse

- DRY (Don't Repeat Yourself) is top priority
- If code is copied more than once, extract it
- Never create a `utils` or `helpers` file - instead, prefer domain-named modules, e.g. `auth.ts`, `formatting.ts`, etc.
- Never compromise on quality to save time - refactor properly, ensure the original goal is met

### Dead Code

- Always check for and eliminate dead code after refactors
- Run `pnpm knip` to detect unused exports
- Remove unused imports, variables, and functions immediately
- Never leave commented-out code in the codebase

### Testing

- All packages must have tests covering core functionality, in `tests/` directories at the package root
- The tests should mirror the naming inside the `src/` directory
- There should be one test file per source file, e.g. `src/button.ts` -> `tests/button.test.ts`
- For the most part, the focus should be on unit testing. Integration tests should be reserved for cases where the testable outcome is not the result of a single unit (function/method). For example, React Reconciler behavior should be tested with integration tests.
- If needed, a `tests/setup.ts` file can be created for shared test setup code (`beforeEach`, mocks, etc.) for each package.
- Other necessary functions (such as shared utilities, e.g. `render`) can be placed in a `tests/utils.ts` file.
- Tests should be thorough, exercising all possible permutations of the function/method arguments.
- Tests should assert/expect specific outcomes, not just that no errors are thrown (unless that is the specific behavior being tested).
- Only mock external dependencies when absolutely necessary. Prefer testing with real instances where possible.
