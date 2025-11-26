---
sidebar_position: 5
---

# Contributing

Thank you for your interest in contributing to GTKX! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm package manager
- Rust toolchain
- GTK4 development libraries

### Clone and Build

```bash
git clone https://github.com/eugeniodepalo/gtkx.git
cd gtkx
pnpm install

# Sync GIR files from your system
cd packages/ffi && pnpm run codegen --sync

# Build all packages
cd ../.. && pnpm build
```

## Project Structure

```
gtkx/
├── packages/
│   ├── native/     # Rust FFI module
│   ├── gir/        # GIR parser
│   ├── ffi/        # Generated FFI bindings
│   └── gtkx/       # React integration
├── examples/
│   ├── demo/       # Simple example
│   └── kitchen-sink/  # Full widget showcase
└── website/        # Documentation site
```

## Code Style

### Functional Programming

- Prefer functional programming over imperative/OOP
- Use pure functions and immutable data
- Only use classes when encapsulation is necessary

```typescript
// Good
const processItems = (items: Item[]) => items.map(transform);

// Avoid
class ItemProcessor {
  process(items: Item[]) { ... }
}
```

### Modern TypeScript

- Use `const` arrow functions for exports
- Prefer nullish coalescing (`??`) over logical OR (`||`)
- Use optional chaining (`?.`) where appropriate
- Avoid type casts (`as`) - use type guards instead

```typescript
// Good
const getValue = (obj?: { value?: string }) => obj?.value ?? "default";

// Avoid
const getValue = (obj: any) => (obj as SomeType).value || "default";
```

### No Comments

- Code should be self-documenting
- Use TSDoc only for public APIs
- Prefer descriptive names over comments

```typescript
// Good
const calculateMonthlyPayment = (principal: number, rate: number, months: number) => ...

// Avoid
// Calculate monthly payment using amortization formula
const calc = (p: number, r: number, m: number) => ...
```

### File Naming

- Use kebab-case for all files: `my-component.ts`
- Exception: generated files

## Making Changes

### Modifying Generators

Never edit files in `src/generated/` directories. Instead:

1. Edit the generator source:
   - `packages/ffi/src/codegen/ffi-generator.ts` for FFI bindings
   - `packages/gtkx/src/codegen/jsx-generator.ts` for JSX types

2. Run codegen to see changes:
   ```bash
   cd packages/ffi && pnpm run codegen
   cd ../gtkx && pnpm run codegen
   ```

### Adding a New Widget

1. Ensure the widget is defined in the GIR files
2. Check if it needs special handling in the reconciler
3. Add tests and examples

### Running Code Quality Checks

```bash
# Find unused code
pnpm knip

# Auto-fix some issues
pnpm knip:fix
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run the full build: `pnpm build`
5. Run code quality checks: `pnpm knip`
6. Commit with a clear message
7. Push and open a pull request

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add ColorDialog component support
fix: resolve memory leak in list reconciliation
docs: update getting started guide
refactor: simplify property mapping logic
```

## Reporting Issues

When reporting bugs, please include:

- GTKX version
- Node.js version
- GTK4 version
- Linux distribution
- Minimal reproduction code
- Expected vs actual behavior

## Getting Help

- Check existing issues and discussions
- Read the [Architecture](./architecture) documentation
- Review the [examples](https://github.com/eugeniodepalo/gtkx/tree/main/examples)

## License

GTKX is licensed under MPL-2.0. By contributing, you agree that your contributions will be licensed under the same license.
