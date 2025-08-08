# GTKx

React-driven native GTK4 UI. This monorepo contains:

- `@gtkx/native`: a Rust+Neon FFI layer that starts a GTK4 main thread and exposes a typed `call` API
- `@gtkx/bridge`: a TypeScript wrapper that maps high-level types to `@gtkx/native` (planned to be generated from GIR)
- `@gtkx/gtkx`: the top-level developer API and, eventually, the React reconciler that renders widgets

### High-level architecture

- Node (JS/TS) calls into the Rust native module via Neon.
- The native module marshals arguments into libffi call frames and dispatches them on the GTK main thread.
- Return values and out-params (refs) are converted back into JS values. JS callbacks are invoked on the Node thread via a Neon channel.

### Repo layout

- `packages/native/`: Rust implementation of the FFI layer (libffi + glib/gtk + Neon)
- `packages/bridge/`: TS bridge exposing ergonomic helpers and thin wrappers for common GTK calls
- `packages/gtkx/`: top-level developer-facing package; future home of the React reconciler and JSX components
- `examples/demo/`: small app that exercises the bridge and FFI

## Status

- `@gtkx/native`: core FFI flow, object management, callbacks, arrays. New: ref/out-parameter support through `createRef`.
- `@gtkx/bridge`: minimal typed wrappers; wired to demo. Will be generated from GIR in the future.
- `@gtkx/gtkx`: scaffolded; will export `render` and JSX bindings in later iterations.

## Quick start

Prereqs: Node 18+, pnpm, Rust toolchain, GTK4 dev packages (e.g. Fedora: `sudo dnf install gtk4-devel gcc`).

```bash
pnpm install
pnpm -w build
pnpm -C examples/demo start
```

The demo logs the GTK version, shows a window, and prints default size read via GTK out-params using refs.

## FFI at a glance

From JS you can call any exported C symbol via:

```ts
import { call, start, stop, createRef } from "@gtkx/native";

const app = start("com.example.app");

// Out params via refs
const w = createRef(null);
const h = createRef(null);
call(
  "libgtk-4.so.1",
  "gtk_window_get_default_size",
  [
    { type: { type: "gobject" }, value: someWindow },
    {
      type: {
        type: "ref",
        innerType: { type: "int", size: 32, unsigned: false },
      },
      value: w,
    },
    {
      type: {
        type: "ref",
        innerType: { type: "int", size: 32, unsigned: false },
      },
      value: h,
    },
  ],
  { type: "void" }
);
console.log(w.value, h.value);

stop();
```

`createRef()` returns `{ value: any }`. When used with a `ref` type, the callee can write into it; the native layer converts the C value back into a JS value synchronously before `call` returns.

## Developing

- Native module builds as part of the Nx workspace. If you touch Rust, run `pnpm -w -C packages/native build`.
- Demo app lives in `examples/demo`. Keep it green to sanity-check the FFI.

See individual package READMEs for details.
