---
sidebar_position: 3
---

# CLI

The `@gtkx/cli` package provides the `gtkx` command for creating and developing GTKX applications.

## Quick Start

The recommended way to use the CLI is with `npx` (or `pnpx` for pnpm users):

```bash
npx @gtkx/cli@latest create
```

This downloads and runs the CLI without installing it globally. After creating a project, the CLI is installed as a local dependency, so you can use `npm run dev` directly.

## Commands

### `gtkx create`

Scaffolds a new GTKX application with an interactive wizard.

```bash
gtkx create
```

The wizard prompts for:

- **Project name** — lowercase letters, numbers, and hyphens (e.g., `my-app`)
- **App ID** — reverse domain notation (e.g., `com.example.myapp`)
- **Package manager** — pnpm, npm, yarn, or bun
- **Testing framework** — Vitest, Jest, Node.js Test Runner, or none
- **Claude Code skills** — optional AI assistance files for Claude Code

You can also pass options directly to skip prompts:

```bash
gtkx create my-app --app-id com.example.myapp --pm pnpm --testing vitest
```

#### Options

| Option      | Description                                            |
| ----------- | ------------------------------------------------------ |
| `--app-id`  | GTK application ID in reverse domain notation          |
| `--pm`      | Package manager: `pnpm`, `npm`, `yarn`, or `bun`       |
| `--testing` | Testing framework: `vitest`, `jest`, `node`, or `none` |

#### Testing Setup

When you choose a testing framework, the CLI sets up:

- **Vitest** — `vitest.config.ts` and example test in `tests/app.test.tsx`
- **Jest** — `jest.config.js` with ts-jest and example test
- **Node.js Test Runner** — Example test using `node:test` and `tsx`

All options install `@gtkx/testing` which provides Testing Library-style utilities for querying GTK widgets.

### `gtkx dev`

Starts the development server with HMR (Hot Module Replacement).

```bash
gtkx dev src/app.tsx
```

This launches your application and watches for file changes. When you edit your code, the app updates instantly without restarting — just like web development with Vite.

#### How HMR Works

1. Your app renders normally on first load
2. The dev server watches for file changes
3. When a file changes, it hot-reloads the module
4. The React tree re-renders with the new code
5. Component state is preserved when possible

#### Example Workflow

```bash
# Terminal 1: Start dev server
cd my-app
npm run dev

# Terminal 2: Edit code and watch it update
# Changes to src/app.tsx will appear instantly
```

## Project Scripts

When you create a new project, these scripts are set up in `package.json`:

```json
{
  "scripts": {
    "dev": "gtkx dev src/app.tsx",
    "build": "tsc -b",
    "start": "node dist/index.js",
    "test": "GDK_BACKEND=x11 GSK_RENDERER=cairo LIBGL_ALWAYS_SOFTWARE=1 xvfb-run -a vitest"
  }
}
```

The test script includes environment variables and a virtual framebuffer wrapper:

- `GDK_BACKEND=x11` — Forces the X11 backend (required for xvfb)
- `GSK_RENDERER=cairo` — Uses the Cairo software renderer
- `LIBGL_ALWAYS_SOFTWARE=1` — Forces Mesa to use software rendering, avoiding EGL/DRI3 warnings
- `xvfb-run -a` — Runs the tests in a virtual framebuffer (required for GTK4 widgets)

### `npm run dev`

Starts the development server with HMR. Use this during development.

### `npm run build`

Compiles TypeScript to JavaScript in the `dist/` directory.

### `npm start`

Runs the compiled application without HMR (no hot reloading). Use this for production or testing the built app.

### `npm test`

Runs the test suite. The test script varies based on your chosen framework (all include the environment variables and xvfb wrapper):

- **Vitest**: `GDK_BACKEND=x11 GSK_RENDERER=cairo LIBGL_ALWAYS_SOFTWARE=1 xvfb-run -a vitest`
- **Jest**: `GDK_BACKEND=x11 GSK_RENDERER=cairo LIBGL_ALWAYS_SOFTWARE=1 xvfb-run -a jest`
- **Node.js**: `GDK_BACKEND=x11 GSK_RENDERER=cairo LIBGL_ALWAYS_SOFTWARE=1 xvfb-run -a node --import tsx --test tests/**/*.test.ts`

## App ID

GTK applications require a unique identifier in reverse domain notation (e.g., `com.example.myapp`). The CLI suggests `org.gtkx.<projectname>` as a default, but you should use your own domain for published apps (e.g., `io.github.username.appname`).

## Using with npx/pnpx

You don't need to install the CLI globally. Use your package manager's runner:

```bash
# npm users
npx @gtkx/cli@latest create

# pnpm users
pnpx @gtkx/cli@latest create

# With options
npx @gtkx/cli@latest create my-app --app-id com.example.myapp --pm pnpm
```

After creating a project, the CLI is installed as a local dependency, so `npm run dev` (or `pnpm dev`) works directly.
