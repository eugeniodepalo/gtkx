---
sidebar_position: 2
---

# Getting Started

This guide will help you set up GTKX and create your first GTK4 application with React.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20 or later
- **pnpm** package manager
- **Rust** toolchain (for building the native module)
- **GTK4** development libraries

### Installing GTK4 on Linux

**Fedora:**
```bash
sudo dnf install gtk4-devel gobject-introspection-devel
```

**Ubuntu/Debian:**
```bash
sudo apt install libgtk-4-dev gobject-introspection
```

**Arch Linux:**
```bash
sudo pacman -S gtk4 gobject-introspection
```

## Installation

### Option 1: Clone the Repository

```bash
git clone https://github.com/eugeniodepalo/gtkx.git
cd gtkx
pnpm install
```

### Initial Build

Run the full build to generate FFI bindings and compile the native module:

```bash
# Sync GIR files from your system
cd packages/ffi && pnpm run codegen --sync

# Build all packages
cd ../.. && pnpm build
```

## Creating Your First App

Create a new file `src/index.tsx`:

```tsx
import { ApplicationWindow, Button, Box, Label, quit, render } from "@gtkx/gtkx";
import { useState } from "react";

const App = () => {
  const [count, setCount] = useState(0);

  return (
    <ApplicationWindow
      title="My First GTKX App"
      defaultWidth={400}
      defaultHeight={300}
      onCloseRequest={quit}
    >
      <Box spacing={10} marginTop={20} marginStart={20} marginEnd={20}>
        <Label.Root label={`Count: ${count}`} />
        <Button
          label="Increment"
          onClicked={() => setCount(c => c + 1)}
        />
        <Button
          label="Reset"
          onClicked={() => setCount(0)}
        />
      </Box>
    </ApplicationWindow>
  );
};

render(<App />, "com.example.myapp");
```

## Running Your App

```bash
pnpm build
pnpm start
```

## Project Structure

A typical GTKX project looks like:

```
my-gtkx-app/
├── src/
│   └── index.tsx      # Entry point
├── package.json
└── tsconfig.json
```

### package.json

```json
{
  "name": "my-gtkx-app",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@gtkx/gtkx": "workspace:*",
    "@gtkx/ffi": "workspace:*",
    "react": "^19.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

## Running the Examples

The repository includes example applications:

```bash
# Simple demo
cd examples/demo
pnpm build && pnpm start

# Kitchen sink with all widgets
cd examples/kitchen-sink
pnpm build && pnpm start
```

## Next Steps

- [Components Guide](./guides/components) - Learn about available widgets
- [Event Handling](./guides/events) - Handle user interactions
- [Architecture](./architecture) - Understand how GTKX works internally
