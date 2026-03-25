# 7. Deploying

Your Notes app is complete. Let's package it for distribution as a native Linux application.

## Overview

Distributing a GTKX application involves three steps:

1. **Bundle** the JavaScript code with `gtkx build`
2. **Create a SEA** (Single Executable Application) using Node.js
3. **Package** with Flatpak, Snap, or distro-specific tools

## Bundle with `gtkx build`

Run the production bundler to create a single minified ESM bundle:

```bash
npx gtkx build
```

This produces `dist/bundle.js` with all dependencies inlined except the native module, which is automatically kept external.

## Single Executable Application (SEA)

The native module (`@gtkx/native`) cannot be bundled into JavaScript and must ship alongside the executable.

### SEA Configuration

Create `sea-config.json`:

```json
{
    "main": "dist/bundle.js",
    "output": "dist/sea-prep.blob",
    "disableExperimentalSEAWarning": true,
    "useSnapshot": false,
    "useCodeCache": true
}
```

### Build Script

```bash
#!/bin/bash
set -e

# Generate SEA blob
node --experimental-sea-config sea-config.json

# Copy node binary
cp $(which node) dist/notes-app

# Inject blob into binary
npx postject dist/notes-app NODE_SEA_BLOB dist/sea-prep.blob \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

# Copy native module alongside the binary
cp node_modules/@gtkx/native/index.node dist/
```

The final distribution includes:

- `dist/notes-app` — The executable (~100MB)
- `dist/index.node` — The native GTK4 bindings

## Flatpak Packaging

Flatpak is the recommended format for Linux desktop applications. The key GTKX-specific requirement is including the native module:

```yaml
# flatpak/com.example.notes.yaml
app-id: com.example.notes
runtime: org.gnome.Platform
runtime-version: "48"
sdk: org.gnome.Sdk
sdk-extensions:
    - org.freedesktop.Sdk.Extension.node22
command: notes-app

finish-args:
    - --share=ipc
    - --socket=fallback-x11
    - --socket=wayland
    - --device=dri

modules:
    - name: notes-app
      buildsystem: simple
      build-commands:
          - install -Dm755 notes-app /app/bin/notes-app
          - install -Dm755 index.node /app/bin/index.node
      sources:
          - type: file
            path: ../dist/notes-app
          - type: file
            path: ../dist/index.node
```

For complete Flatpak setup (prerequisites, desktop entry, build commands), see the [Flatpak Documentation](https://docs.flatpak.org/) and the [deploying example](https://github.com/gtkx-org/gtkx/tree/main/examples/deploying).

## Snap Packaging

Snap is an alternative format, popular on Ubuntu:

```yaml
# snap/snapcraft.yaml
name: notes-app
version: "1.0.0"
base: core24
confinement: strict

apps:
    notes-app:
        command: bin/notes-app
        extensions: [gnome]

parts:
    notes-app:
        plugin: dump
        source: dist/
        organize:
            notes-app: bin/notes-app
            index.node: bin/index.node
```

For complete Snap setup, see the [Snapcraft Documentation](https://snapcraft.io/docs).

## Complete Example

For a fully working example with all configuration files, build scripts, and CI setup, see the [deploying example](https://github.com/gtkx-org/gtkx/tree/main/examples/deploying).

## What's Next?

Congratulations! You've built a complete Notes application covering:

- **Compound components** — `AdwToolbarView.AddTopBar`, `AdwHeaderBar.PackStart`, and more
- **Slot props** — `titleWidget`, `popover`, and other widget properties
- **CSS-in-JS styling** — `@gtkx/css` with GTK CSS variables
- **Virtualized lists** — `GtkListView` and `GtkColumnView` with tree support
- **Menus and shortcuts** — `GtkMenuButton.MenuItem` and `GtkShortcutController.Shortcut`
- **Navigation** — `AdwNavigationSplitView`, `AdwNavigationView`, `AdwViewStack`
- **Dialogs** — `AdwAlertDialog` with portals
- **Animations** — `AdwTimedAnimation` and `AdwSpringAnimation`
- **Deployment** — SEA bundling, Flatpak, and Snap packaging

Explore the [API Reference](/api/react/) for the complete API surface, or check out the [CLI Reference](../cli.md) and [MCP Integration](../mcp.md) docs.
