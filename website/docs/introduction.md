---
sidebar_position: 1
slug: /
---

# Introduction

GTKX is a framework for building GTK4 desktop applications using React and TypeScript. It bridges the GTK4 C library with React's component model through FFI (Foreign Function Interface), enabling developers to write native Linux desktop applications using familiar React patterns.

## Why GTKX?

- **React Patterns**: Use hooks, state management, and component composition you already know
- **Type Safety**: Full TypeScript support with auto-generated types from GTK's GObject Introspection
- **Native Performance**: Direct FFI calls to GTK4 - no Electron, no WebView
- **Modern GTK4**: Access the latest GTK4 widgets and features

## Quick Example

```tsx
import { ApplicationWindow, Button, quit, render } from "@gtkx/gtkx";

render(
  <ApplicationWindow
    title="Hello, GTKX!"
    defaultWidth={400}
    defaultHeight={300}
    onCloseRequest={quit}
  >
    <Button
      label="Click me!"
      onClicked={() => console.log("Clicked!")}
    />
  </ApplicationWindow>,
  "com.example.app"
);
```

## Package Structure

GTKX is organized as a monorepo with the following packages:

| Package | Description |
|---------|-------------|
| `@gtkx/gtkx` | React integration layer with JSX components |
| `@gtkx/ffi` | Generated TypeScript FFI bindings for GTK libraries |
| `@gtkx/gir` | GIR file parser for code generation |
| `@gtkx/native` | Rust-based Neon module for FFI calls |
| `@gtkx/css` | Emotion-style CSS-in-JS for styling GTK widgets |

## How It Works

1. **GIR Parsing**: GTK's GObject Introspection files describe the C API
2. **Code Generation**: TypeScript bindings are generated from GIR files
3. **React Reconciler**: A custom reconciler translates React elements to GTK widgets
4. **FFI Bridge**: Rust + libffi enables dynamic calls to GTK's C functions

## Requirements

- Node.js 20+
- GTK4 runtime libraries
- Linux (GTK4 is primarily a Linux toolkit)

For development from source, you also need:
- pnpm 10+
- Rust toolchain
- GTK4 development headers

## Next Steps

- [Getting Started](/docs/getting-started) - Install and create your first app
- [Components Guide](/docs/guides/components) - Core API and component patterns
- [Styling Guide](/docs/guides/styling) - CSS-in-JS styling with @gtkx/css
- [API Reference](/docs/api) - Generated API documentation
- [Architecture](/docs/architecture) - Deep dive into how GTKX works
