# GTKx - React Renderer for GTK4

A modern React renderer that brings React's declarative UI paradigm to native GTK4 applications. Build desktop applications using familiar React patterns while leveraging the full power of GTK4's native widgets and performance.

## 🚀 Overview

GTKx enables you to write desktop applications using React components that render to native GTK4 widgets. Instead of targeting the DOM, your React components create real GTK4 windows, buttons, and other native UI elements.

```tsx
import { render } from "@gtkx/react";
import { Application, Window, Button } from "@gtkx/gtkx";

function App() {
  return (
    <Application id="com.example.myapp">
      <Window title="Hello GTKx" defaultWidth={400} defaultHeight={300}>
        <Button onClick={() => console.log("Clicked!")}>Hello, GTK4!</Button>
      </Window>
    </Application>
  );
}

render(<App />);
```

## 🏗️ Architecture

The project consists of three main layers:

### 1. **Native Bridge** (`packages/native/`)

A high-performance Rust library built with Neon that provides:

- **Type-safe FFI** - Direct calls to GTK4 C functions with full type safety
- **Object Management** - Automatic memory management for GTK4 objects
- **Thread Safety** - Proper handling of GTK4's main thread requirements
- **Callback Support** - Bidirectional communication between Node.js and GTK4

### 2. **GTK4 Bindings** (`packages/gtkx/`)

TypeScript bindings that provide:

- **Widget Wrappers** - Type-safe interfaces for all GTK4 widgets
- **Event Handling** - React-style event system for GTK4 signals
- **Property Mapping** - Automatic conversion between React props and GTK4 properties
- **Layout System** - Integration with GTK4's layout managers

### 3. **React Renderer** (Coming Soon)

A custom React renderer that:

- **Declarative UI** - Use React components to describe GTK4 widget trees
- **State Management** - Full React state and effects support
- **Hot Reload** - Development-time hot reloading for rapid iteration
- **DevTools** - React DevTools integration for debugging

## 📦 Packages

| Package        | Description              | Status         |
| -------------- | ------------------------ | -------------- |
| `@gtkx/native` | Rust FFI bridge to GTK4  | ✅ Complete    |
| `@gtkx/gtkx`   | TypeScript GTK4 bindings | 🚧 In Progress |
| `@gtkx/react`  | React renderer           | 📋 Planned     |

## 🛠️ Development Setup

### Prerequisites

- **Node.js** 18+ with pnpm
- **Rust** 1.70+ with Cargo
- **GTK4** development libraries
- **Python** 3.8+ (for native module compilation)

### Install GTK4 Development Libraries

**Ubuntu/Debian:**

```bash
sudo apt install libgtk-4-dev build-essential
```

**macOS:**

```bash
brew install gtk4 pkg-config
```

**Fedora:**

```bash
sudo dnf install gtk4-devel gcc
```

### Clone and Install

```bash
git clone https://github.com/your-org/gtkx.git
cd gtkx
pnpm install
```

### Build the Project

```bash
# Build native module and TypeScript packages
pnpm build

# Run the demo application
pnpm demo
```

## 🎯 Project Status

### ✅ Completed

- [x] **FFI Bridge**: Complete Rust-to-GTK4 bridge with type safety
- [x] **Memory Management**: Automatic cleanup of GTK4 objects
- [x] **Thread Safety**: Proper GTK4 main thread handling
- [x] **Basic Bindings**: Core GTK4 widgets wrapped for TypeScript

### 🚧 In Progress

- [ ] **Complete Widget Set**: Full coverage of GTK4 widgets
- [ ] **Event System**: React-style event handling
- [ ] **Layout Integration**: GTK4 layout managers as React components

### 📋 Planned

- [ ] **React Renderer**: Custom React reconciler for GTK4
- [ ] **Hot Reload**: Development-time hot reloading
- [ ] **DevTools**: React DevTools integration
- [ ] **Styling System**: CSS-like styling for GTK4 widgets
- [ ] **Animation**: React-based animations using GTK4
- [ ] **Accessibility**: Full a11y support through GTK4

## 🏁 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build the Native Module

```bash
pnpm build:native
```

### 3. Run the Demo

```bash
pnpm demo
```

This will launch a simple GTK4 application demonstrating the current functionality.

## 📚 Examples

### Basic Window

```typescript
import { call, start, stop } from "@gtkx/native";

// Start GTK4 application
const app = start("com.example.basic");

// Create a window
const window = call("gtk_window_new", [], { type: "gobject", borrowed: false });

// Set window properties
call(
  "gtk_window_set_title",
  [
    { type: { type: "gobject", borrowed: false }, value: window },
    { type: { type: "string" }, value: "My GTK4 App" },
  ],
  { type: "void" }
);

// Show the window
call(
  "gtk_widget_show",
  [{ type: { type: "gobject", borrowed: false }, value: window }],
  { type: "void" }
);
```

### With Type-Safe Bindings

```typescript
import { Application, Window } from "@gtkx/gtkx";

const app = new Application("com.example.typed");
const window = new Window();
window.setTitle("Type-Safe GTK4");
window.show();

app.addWindow(window);
```

## 🔧 Configuration

### TypeScript Configuration

The project uses TypeScript with strict type checking. Configuration is shared across packages via the root `tsconfig.json`.

### Build System

Built with Nx for efficient monorepo management:

- **Native Module**: Built with Cargo and Neon CLI
- **TypeScript**: Built with tsc and Nx
- **Examples**: Built with esbuild for fast iteration

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch
3. **Write** tests for new functionality
4. **Ensure** all tests pass: `pnpm test`
5. **Submit** a pull request

### Code Style

- **Rust**: Follow standard Rust formatting with `cargo fmt`
- **TypeScript**: Use Prettier with our configuration
- **Commits**: Use conventional commit format

## 📄 License

This project is licensed under the [ISC License](LICENSE).

## 🙏 Acknowledgments

- **GTK4 Team** - For the amazing toolkit
- **Neon** - For seamless Rust-Node.js integration
- **React Team** - For the reconciler architecture

## 🔗 Links

- **Documentation**: [docs.gtkx.dev](https://docs.gtkx.dev) (Coming Soon)
- **Examples**: [github.com/gtkx/examples](https://github.com/gtkx/examples) (Coming Soon)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/gtkx/discussions)
- **Issues**: [GitHub Issues](https://github.com/your-org/gtkx/issues)

---

**Note**: This project is under active development. APIs may change before the 1.0 release. Star the repo to stay updated! ⭐
