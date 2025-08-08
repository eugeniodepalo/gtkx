# @gtkx/bridge

TypeScript bridge to `@gtkx/native`. This package exposes higher-level, ergonomic wrappers for common GTK calls and will be generated from GIR metadata in the future.

## Today

- Thin helpers for application/window usage
- Re-exports of typed functions that internally call `@gtkx/native.call`
- Example of using out-params via refs

## Example

```ts
import { start, stop } from "@gtkx/bridge";
import { ApplicationWindow } from "@gtkx/bridge/gtk";
import { createRef } from "@gtkx/native";

const app = start("com.example");
const win = new ApplicationWindow(app);
win.setTitle("Hello");
win.setDefaultSize(800, 600);

const w = createRef(null);
const h = createRef(null);
win.getDefaultSizeRefs(w, h);
console.log("Default size:", w.value, h.value);

stop();
```

## Roadmap

- Autogenerate the TS surface from GIR
- Rich type mapping for properties, signals, and enums
- Stable public surface for the future React renderer to consume
