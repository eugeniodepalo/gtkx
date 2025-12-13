# GTKX Flatpak Demo

This example demonstrates how to package a GTKX application as a Flatpak using Node.js Single Executable Applications (SEA).

## Architecture

The bundling strategy addresses a key challenge: Node.js SEA cannot embed native `.node` addons directly. The solution:

1. **esbuild** bundles all JavaScript/TypeScript into a single CommonJS file
2. **Node.js SEA** creates a single executable from the bundle
3. The native module (`index.node`) is loaded from the filesystem at runtime, placed next to the executable

The bundle script injects a custom module loader that detects when running as a SEA and loads the native module from `dirname(process.execPath)` instead of from `node_modules`.

## Prerequisites

### For Flatpak Build

- Flatpak and flatpak-builder
- GNOME SDK and Platform with Node.js extension:

```bash
flatpak install flathub org.gnome.Platform//48 org.gnome.Sdk//48
flatpak install flathub org.freedesktop.Sdk.Extension.node22//24.08
```

## Building the Flatpak

The entire build happens inside the Flatpak sandbox using the Node.js SDK extension:

```bash
flatpak-builder --user --install --force-clean build-dir org.gtkx.flatpak.json
```

This will:
1. Install npm dependencies from the registry
2. Compile TypeScript
3. Bundle with esbuild
4. Create the SEA executable
5. Install everything into the Flatpak

## Running

```bash
flatpak run org.gtkx.flatpak
```

## Uninstalling

```bash
flatpak uninstall --user org.gtkx.flatpak
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app.tsx` | The GTKX React application |
| `src/index.tsx` | Application entry point |
| `scripts/bundle.ts` | esbuild configuration with SEA-compatible native module loading |
| `sea-config.json` | Node.js SEA configuration |
| `org.gtkx.flatpak.json` | Flatpak manifest |

## How It Works

### Bundle Script (`scripts/bundle.ts`)

The bundle script uses esbuild with a custom plugin to handle native module loading:

1. Intercepts imports of `@gtkx/native`
2. Replaces them with code that detects SEA context using `require('node:sea').isSea()`
3. If SEA, loads `index.node` from `dirname(process.execPath)`
4. If not SEA, uses normal module resolution

### Flatpak Manifest

The manifest:
- Uses `org.gnome.Platform//48` runtime (provides GTK4)
- Uses `org.freedesktop.Sdk.Extension.node22` for Node.js tooling
- Enables network access during build (`--share=network`)
- Disables stripping to preserve the SEA blob integrity

### Build Steps Inside Flatpak

1. `npm install` - Install dependencies
2. `npm run build` - Compile TypeScript
3. `npm run bundle` - Create esbuild bundle with native loader
4. `node --experimental-sea-config` - Generate SEA blob
5. Copy Node.js binary and inject SEA blob with `postject`
6. Install executable and native module to `/app/bin/`

## Notes

- The build uses network access to fetch npm packages. For fully reproducible builds, you would need to use `flatpak-node-generator` to pre-download all dependencies.
- The `strip: false` option is critical - stripping corrupts the SEA blob.
- The native module must be in the same directory as the executable for the SEA loader to find it.
