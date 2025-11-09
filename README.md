# GTKX

React-driven native GTK4 UI. This monorepo contains:

- `@gtkx/native`: a Rust+Neon FFI layer that starts a GTK4 main thread and exposes a typed `call` API
- `@gtkx/ffi`: a TypeScript wrapper that maps high-level types to `@gtkx/native` (planned to be generated from GIR)
- `@gtkx/gtkx`: the top-level developer API and, eventually, the React reconciler that renders widgets

### High-level architecture

- Node (JS/TS) calls into the Rust native module via Neon.
- The native module marshals arguments into libffi call frames and dispatches them on the GTK main thread.
- Return values and out-params (refs) are converted back into JS values. JS callbacks are invoked on the Node thread via a Neon channel.
