# Getting Started

This guide walks you through creating your first GTKX application.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 22+** — GTKX requires a modern Node.js runtime
- **GTK4 libraries** — The native GTK4 runtime libraries

## Create a New Project

The fastest way to start is with the GTKX CLI:

```bash
npx @gtkx/cli@latest create my-app
```

The CLI will prompt you for:

- **Project name** — lowercase letters, numbers, and hyphens
- **App ID** — reverse domain notation (e.g., `com.example.myapp`)
- **Package manager** — pnpm (recommended), npm, or yarn
- **Testing** — whether to include Vitest testing setup
- **Claude Skills** — optional helper files for AI code generation

After the prompts, the CLI creates your project and installs dependencies.

## Project Structure

A new GTKX project has this structure:

```
my-app/
├── src/
│ ├── app.tsx # Main application component
│ ├── dev.tsx # Development entry point
│ └── index.tsx # Production entry point
├── tests/
│ └── app.test.tsx # Example test
├── package.json
└── tsconfig.json
```

### Key Files

**`src/app.tsx`** — The default app component (just an example, can be removed or renamed):

```tsx
import { useState } from "react";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkApplicationWindow, GtkBox, GtkButton, GtkLabel, quit } from "@gtkx/react";

export default function App() {
    const [count, setCount] = useState(0);

    return (
        <GtkApplicationWindow title="My App" defaultWidth={400} defaultHeight={300} onClose={quit}>
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={20} marginTop={40} marginStart={40} marginEnd={40}>
                Welcome to GTKX!
                <GtkLabel label={`Count: ${count}`} />
                <GtkButton label="Increment" onClicked={() => setCount((c) => c + 1)} />
            </GtkBox>
        </GtkApplicationWindow>
    );
}
```

**`src/index.tsx`** — Production entry point:

```tsx
import { render } from "@gtkx/react";
import pkg from "../package.json" with { type: "json" };
import App from "./app.js";

render(<App />, pkg.gtkx.appId);
```

**`package.json`** — Contains your app ID in the `gtkx` config:

```json
{
    "gtkx": {
        "appId": "com.example.myapp"
    }
}
```

## Run the Development Server

Start the development server with hot reload:

```bash
npm run dev
```

This starts your application with Hot Module Replacement (HMR). When you edit your components, changes appear instantly without losing application state.

## Build for Production

Bundle your application into a single minified file:

```bash
npm run build
npm start
```

This runs `gtkx build` to produce `dist/bundle.js` via Vite SSR mode, then `node dist/bundle.js` to run it.

## Run Tests

If you enabled testing:

```bash
npm test
```

Tests run in a real GTK environment using the `@gtkx/vitest` plugin, which automatically manages Xvfb displays for headless execution.

## Understanding the Basics

### Intrinsic Elements

Intrinsic elements are imported as constants from `@gtkx/react` and correspond to GTK widgets or event controllers. They accept props that map to GTK properties, signals, and child widgets.

#### Widget Example

```tsx
import { GtkButton, GtkEntry } from "@gtkx/react";

<GtkButton>Click me</GtkButton>
<GtkEntry placeholderText="Type here" />
```

#### Event Controller Example

```tsx
import { GtkBox, GtkLabel, GtkEventControllerMotion, GtkEventControllerKey } from "@gtkx/react";
import { useState } from "react";

const InteractiveBox = () => {
    const [position, setPosition] = useState({ x: 0, y: 0 });

    return (
        <GtkBox focusable>
            <GtkEventControllerMotion
                onEnter={(x, y) => console.log("Entered at", x, y)}
                onMotion={(x, y) => setPosition({ x, y })}
                onLeave={() => console.log("Left")}
            />
            <GtkEventControllerKey
                onKeyPressed={(keyval) => {
                    console.log("Key:", keyval);
                    return false;
                }}
            />
            <GtkLabel label={`Position: ${Math.round(position.x)}, ${Math.round(position.y)}`} />
        </GtkBox>
    );
};
```

## What's Next?

- [FFI Bindings](./ffi-bindings.md) — Using GTK and GLib bindings
- [x.\* Elements](./x-elements.md) — Comprehensive list of available x.\* elements
- [CLI Reference](./cli.md) — All CLI commands and options
- [Styling](./styling.md) — CSS-in-JS for GTK
- [Testing](./testing.md) — Testing your components
- [Deploying](./deploying.md) — Packaging and distributing your app
