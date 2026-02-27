<p align="center">
    <img src="https://raw.githubusercontent.com/eugeniodepalo/gtkx/main/logo.svg" alt="GTKX" width="100" height="100">
</p>

<h1 align="center">GTKX</h1>

<p align="center">
    <strong>Linux application development for the modern age powered by GTK4 and React</strong>
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@gtkx/react"><img src="https://img.shields.io/npm/v/@gtkx/react.svg" alt="npm version"></a>
    <a href="https://github.com/gtkx-org/gtkx/actions"><img src="https://img.shields.io/github/actions/workflow/status/eugeniodepalo/gtkx/ci.yml" alt="CI"></a>
    <a href="https://github.com/gtkx-org/gtkx/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MPL--2.0-blue.svg" alt="License"></a>
    <a href="https://github.com/gtkx-org/gtkx/discussions"><img src="https://img.shields.io/badge/discussions-GitHub-blue" alt="GitHub Discussions"></a>
</p>

---

<p align="center">
    <img src="https://raw.githubusercontent.com/eugeniodepalo/gtkx/main/demo.gif" alt="GTKX Demo" width="100%">
</p>

## Introduction

GTKX is a modern framework for building native Linux applications using React and GTK. It provides access to the full range of GTK4, GLib, and Node.js APIs, allowing you to create rich, performant desktop applications with the tools and libraries you already know.

## Features

- **React 19** — Hooks, concurrent features, and the component model you know
- **Fully native Node.js environment** - Runs on vanilla Node.js, with the help of a Neon native module
- **TypeScript first** — Full type safety with auto-generated bindings
- **Rich GLib support** — Provides bindings for most modern GLib/GObject libraries, including Adwaita
- **HMR** — Fast refresh during development powered by Vite
- **CSS-in-JS styling** — Easy styling with GTK CSS powered by Emotion
- **Testing library** — Testing Library-inspired API for testing components and E2E

## Quick Start

```bash
npx @gtkx/cli create my-app
cd my-app
npm run dev
```

## Hello World

```tsx
import { GtkApplicationWindow, GtkBox, GtkButton, GtkLabel, quit, render } from "@gtkx/react";
import * as Gtk from "@gtkx/ffi/gtk";
import { useState } from "react";

const App = () => {
    const [count, setCount] = useState(0);

    return (
        <GtkApplicationWindow title="Counter" defaultWidth={300} defaultHeight={200} onClose={quit}>
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={20} valign={Gtk.Align.CENTER}>
                {`Count: ${count}`}
                <GtkButton label="Increment" onClicked={() => setCount((c) => c + 1)} />
            </GtkBox>
        </GtkApplicationWindow>
    );
};

render(<App />, "com.gtkx.example");
```

## Examples

Explore complete applications in the [`examples/`](./examples) directory:

- **[hello-world](./examples/hello-world)** — Minimal application showing a counter
- **[gtk-demo](./examples/gtk-demo)** — Full replica of the official GTK demo app
- **[todo](./examples/todo)** — Full-featured todo application with Adwaita components and testing
- **[x-showcase](./examples/x-showcase)** — Showcase of all x.\* virtual components
- **[browser](./examples/browser)** — Simple browser using WebKitWebView
- **[deploying](./examples/deploying)** — Example of packaging and distributing a GTKX app

## Documentation

Visit [https://gtkx.dev](https://gtkx.dev) for the full documentation.

## Contributing

Contributions are welcome! Please see the [contributing guidelines](./CONTRIBUTING.md).

## Community

- [GitHub Discussions](https://github.com/gtkx-org/gtkx/discussions) — Questions, ideas, and general discussion
- [Issue Tracker](https://github.com/gtkx-org/gtkx/issues) — Bug reports and feature requests

## License

[MPL-2.0](./LICENSE)
