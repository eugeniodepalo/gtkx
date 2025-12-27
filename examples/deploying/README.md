# Deploying GTKX Applications

This example demonstrates how to package GTKX applications for distribution on Linux using Flatpak and Snap.

## Overview

GTKX apps are Node.js applications with a native GTK4 binding. To distribute them, we:

1. **Bundle** the JavaScript code with esbuild
2. **Create a SEA** (Single Executable Application) using Node.js
3. **Package** with Flatpak or Snap for distribution

## Prerequisites

### For Development
- Node.js 22+
- pnpm

### For Flatpak
- flatpak-builder
- GNOME SDK: `flatpak install flathub org.gnome.Sdk//48`
- Node SDK extension: `flatpak install flathub org.freedesktop.Sdk.Extension.node22//24.08`

### For Snap
- snapcraft: `sudo snap install snapcraft --classic`
- LXD (for clean builds): `sudo snap install lxd && sudo lxd init --auto`

## Quick Start

```bash
# Install dependencies
pnpm install

# Development
pnpm dev

# Build for distribution
pnpm bundle        # Bundle JS with esbuild
pnpm build:sea     # Create Single Executable Application
```

## Building Flatpak

```bash
# Build the Flatpak
pnpm build:flatpak

# Install locally
flatpak install --user dist/org.gtkx.example.flatpak

# Run
flatpak run org.gtkx.example

# Uninstall
flatpak uninstall org.gtkx.example
```

### Flatpak Files

- `flatpak/org.gtkx.example.yaml` - Flatpak manifest
- `flatpak/org.gtkx.example.desktop` - Desktop entry
- `flatpak/build.sh` - Build script

### Customizing for Your App

1. Change the app ID in `org.gtkx.example.yaml` and `package.json`
2. Update the desktop entry with your app name and icon
3. Add any additional runtime permissions in `finish-args`

## Building Snap

```bash
# Build the Snap
pnpm build:snap

# Install (development mode)
sudo snap install --devmode gtkx-example_*.snap

# Run
gtkx-example

# Uninstall
sudo snap remove gtkx-example
```

### Snap Files

- `snap/snapcraft.yaml` - Snap manifest
- `snap/gtkx-example.desktop` - Desktop entry
- `snap/build.sh` - Build script

### Customizing for Your App

1. Change the name and metadata in `snapcraft.yaml`
2. Update the desktop entry
3. Adjust plugs for required permissions

## SEA Build Process

The Single Executable Application build creates a standalone binary:

```bash
# 1. Bundle with esbuild
pnpm bundle
# Creates: dist/bundle.cjs

# 2. Generate SEA blob
node --experimental-sea-config sea-config.json
# Creates: dist/sea-prep.blob

# 3. Copy and inject into Node binary
cp $(command -v node) dist/app
npx postject dist/app NODE_SEA_BLOB dist/sea-prep.blob \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

# 4. Copy native module alongside
cp ../../packages/native/index.node dist/
```

The result is:
- `dist/app` - Standalone executable (~100MB)
- `dist/index.node` - Native GTK4 bindings

## Project Structure

```
deploying/
├── src/
│   ├── app.tsx           # Application component
│   ├── dev.tsx           # Dev entry point
│   └── index.tsx         # Production entry point
├── flatpak/
│   ├── org.gtkx.example.yaml
│   ├── org.gtkx.example.desktop
│   └── build.sh
├── snap/
│   ├── snapcraft.yaml
│   ├── gtkx-example.desktop
│   └── build.sh
├── scripts/
│   ├── bundle.ts         # esbuild bundler
│   └── build-sea.sh      # SEA builder
├── assets/
│   └── icon.png          # App icon
├── package.json
├── tsconfig.json
└── sea-config.json       # SEA configuration
```

## Troubleshooting

### Flatpak build fails with permission errors
Make sure you have the required SDKs installed:
```bash
flatpak install flathub org.gnome.Sdk//48
flatpak install flathub org.freedesktop.Sdk.Extension.node22//24.08
```

### Snap build fails
Try building in a clean LXD container:
```bash
snapcraft --use-lxd
```

### App crashes on startup
Ensure the native module (`index.node`) is in the same directory as the executable.

### Missing GTK4 libraries
For Flatpak, ensure you're using the GNOME runtime (`org.gnome.Platform`).
For Snap, ensure you're using the `gnome` extension.

## Distribution

### Flathub
To publish on Flathub, submit your manifest to https://github.com/flathub/flathub

### Snap Store
To publish on the Snap Store:
```bash
snapcraft login
snapcraft upload --release=edge gtkx-example_*.snap
```

## Resources

- [Flatpak Documentation](https://docs.flatpak.org/)
- [Snapcraft Documentation](https://snapcraft.io/docs)
- [Node.js SEA Documentation](https://nodejs.org/api/single-executable-applications.html)
