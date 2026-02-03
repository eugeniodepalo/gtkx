# CLI Reference

The GTKX CLI provides commands for creating and developing applications.

## Installation

The CLI is included when you install `@gtkx/cli`:

```bash
npm install -D @gtkx/cli
```

Or use it directly with npx:

```bash
npx @gtkx/cli <command>
```

## Commands

### `gtkx create`

Creates a new GTKX project with all necessary configuration.

```bash
npx @gtkx/cli create [project-name]
```

**Interactive Prompts:**

| Prompt          | Description                     | Validation                               |
| --------------- | ------------------------------- | ---------------------------------------- |
| Project name    | Directory name for your project | Lowercase, numbers, hyphens only         |
| App ID          | Unique application identifier   | Reverse domain (e.g., `com.example.app`) |
| Package manager | Dependency manager              | pnpm, npm, yarn                          |
| Testing         | Include Vitest testing setup    | yes, no                                  |

**Generated Project:**

```
project/
├── src/
│ ├── app.tsx # Main component
│ ├── dev.tsx # Dev entry (imports app, used by dev server)
│ └── index.tsx # Production entry (calls render())
├── tests/
│ └── app.test.tsx # Example test (if testing enabled)
├── package.json
├── tsconfig.json
└── tsconfig.test.json # Test configuration (if testing enabled)
```

**Installed Dependencies:**

Core:

- `@gtkx/react` — React reconciler and components
- `@gtkx/ffi` — FFI bindings
- `@gtkx/css` — Styling utilities
- `react` — React 19

Dev:

- `@gtkx/cli` — CLI and dev server
- `vite` — Build tooling (required for `gtkx build` and `gtkx dev`)
- `typescript` — TypeScript compiler
- `@types/react` — React type definitions

Testing (if enabled):

- `@gtkx/testing` — Testing utilities
- `@gtkx/vitest` — Vitest plugin for display management
- `vitest` — Test runner

### `gtkx dev`

Starts the development server with Hot Module Replacement.

```bash
npx gtkx dev <entry-file>
```

**Example:**

```bash
npx gtkx dev src/dev.tsx
```

**Features:**

- **Hot Module Replacement** — React components update without full reload
- **Fast Refresh** — Preserves component state during updates
- **Error overlay** — Shows compilation errors in the console
- **Vite-powered** — Fast builds with ES modules

The dev server watches for file changes and:

1. If the change is in a React component boundary → Fast Refresh (state preserved)
2. Otherwise → Full module reload

### `gtkx build`

Produces a single minified ESM bundle via Vite SSR mode.

```bash
npx gtkx build [entry]
```

The entry file defaults to `src/index.tsx`. Output is written to `dist/bundle.js` with all dependencies bundled except the native module.

**Features:**

- **Single-file output** — All dependencies inlined into one minified ESM bundle
- **Vite-powered** — Uses Vite SSR mode for Node.js-targeted bundling
- **Native module excluded** — `@gtkx/native` is kept external automatically

Static assets (images, SVGs, etc.) should be handled via Vite imports rather than `path.resolve` / `import.meta.dirname`.

### Generated npm Scripts

After `gtkx create`, your `package.json` includes:

```json
{
  "scripts": {
    "dev": "gtkx dev src/dev.tsx",
    "build": "gtkx build",
    "start": "node dist/bundle.js",
    "test": "vitest"
  }
}
```

| Script          | Description                           |
| --------------- | ------------------------------------- |
| `npm run dev`   | Start development server              |
| `npm run build` | Bundle for production via `gtkx build`|
| `npm start`     | Run production bundle                 |
| `npm test`      | Run tests (if configured)             |

## Programmatic API

You can also use the CLI functions programmatically:

```typescript
import { createApp, createDevServer } from "@gtkx/cli";
import { build } from "@gtkx/cli/builder";

// Create a new project
await createApp({
  name: "my-app",
  appId: "com.example.myapp",
  packageManager: "pnpm",
  testing: "vitest",
});

// Start dev server
const server = await createDevServer({
  entry: "src/dev.tsx",
});

// Production build
await build({ entry: "./src/index.tsx", vite: { root: process.cwd() } });
```
