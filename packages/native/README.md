# @gtkx/native

Rust + Neon native module providing a typed FFI layer to GTK4 with:

- GTK thread management (start/stop)
- Typed arguments and return values via a compact Type schema
- Arrays, strings, booleans, numerics, GObjects/boxed
- Callbacks (GLib closures) bridging back into JS
- Out-parameters via refs (`createRef`) with synchronous read-back

## API

- `start(appId: string): unknown`
- `stop(): void`
- `call(library: string, symbol: string, args: Arg[], resultType: Type): any`
- `createRef(initial: any): { value: any }`

Where `Arg` is `{ type: Type; value: any }` and `Type` can be:

- `{ type: 'int', size: 8|32|64, unsigned: boolean }`
- `{ type: 'float', size: 32|64 }`
- `{ type: 'string' }`
- `{ type: 'boolean' }`
- `{ type: 'null' }`
- `{ type: 'gobject', borrowed?: boolean }`
- `{ type: 'boxed', type: string, borrowed?: boolean }`
- `{ type: 'array', itemType: Type }`
- `{ type: 'callback' }`
- `{ type: 'ref', innerType: Type }`

Refs are passed as `{ value: any }` created via `createRef`. When a `ref` is used, the callee writes to native memory and the value is converted back and assigned to `ref.value` before `call` returns.

## Example

```ts
import { start, stop, call, createRef } from "@gtkx/native";

const app = start("com.example");

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

## Notes

- All GTK calls execute on the GTK main thread.
- Callbacks are invoked on the Node thread via Neon channel.
- For pointers to strings/objects written by the callee, use a `ref` with `innerType` of `string` or `gobject/boxed`.
