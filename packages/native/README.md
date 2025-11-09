# @gtkx/native

Rust + Neon native module providing a typed FFI layer to GTK4 with:

- GTK thread management (start/stop)
- Typed arguments and return values via a compact Type schema
- Arrays, strings, booleans, numerics, GObjects/boxed
- Callbacks (GLib closures) bridging back into JS
- Out-parameters via refs (`createRef`) with synchronous read-back
