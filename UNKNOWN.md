# `as unknown as` Audit

A full inventory of double-assertion casts (`as unknown as`) in the gtkx
codebase. Each cast bypasses the type checker entirely: the compiler will not
catch a mismatch on either side. Generated files (`src/generated/`) are
excluded — they are regenerated from GIR and not hand-maintained.

## Summary

| Scope | Occurrences |
| ----- | ----------- |
| Source (`src/`, examples) | 148 |
| Tests | 83 |
| **Total** | **231** |

The casts fall into six root causes. Two of them (A and B) account for the
large majority of source casts and share a single fix; the rest are localized.

---

## Category A — `GType` is a phantom type but a number at runtime

**~95 occurrences. Highest impact, single root cause.**

`GType` is declared in the generated GObject typings as an opaque branded
object:

```ts
// packages/ffi/src/generated/gobject/gobject.d.ts:2688
export type GType<T = unknown> = {
    __type__(arg: never): T
    name: string
};
```

At runtime a `GType` is a plain numeric handle (`number` / `bigint`). Every
boundary where a real numeric value meets the `GType` type — or vice versa —
is bridged with `as unknown as GType` or `as unknown as number`. There is no
runtime conversion; the cast is pure type laundering.

Representative sites:

- `packages/ffi/src/gobject/types.ts:43-127` — ~22 casts, every cached
  fundamental type: `typeFromName("void") as unknown as GType`, etc.
- `packages/ffi/src/registry.ts` — 15 casts: `gtype as unknown as number`
  used as a `Map` key, `0 as unknown as GType` sentinels, comparisons
  `(currentGtype as unknown as number) !== 0`.
- `packages/ffi/src/register-class.ts` — 10 casts, same pattern plus
  `0 as unknown as GType` returned as an "invalid" sentinel (line 135).
- `packages/ffi/src/gobject/gvalue.ts` — 5 casts on `getTypeFn` call results.
- `packages/ffi/src/gobject/object.ts:207,233` · `value.ts:211` ·
  `native.ts:33,143` · `class-struct-pointer.ts:38,44` · `object.ts:44`.
- `packages/react/src/metadata.ts:18,19,62` · `factory.ts:22,34,68` ·
  `host-config.ts:48` · `nodes/event-controller.ts:11`
  (`const G_TYPE_INVALID = 0 as unknown as GType`).

**Risk:** Low correctness risk today (the runtime really is a number), but the
phantom type buys nothing because it is discarded everywhere it is used.
Comparisons like `(x as unknown as number) === 0` could silently break if
`GType` ever became a `bigint` at runtime.

**Recommended fix:** Decide what `GType` *is*. Either:
1. Make `GType` a genuine branded numeric type
   (`type GType = number & { readonly __brand: unique symbol }`) with a single
   `toGType(n: number): GType` / `gtypeValue(g: GType): number` helper pair, so
   exactly two casts exist in the whole repo; or
2. Accept that it is a `number` and drop the phantom wrapper.

Either way the ~95 scattered casts collapse to a handful in one module.

---

## Category B — `GObject` prototype augmentation (EventEmitter shim)

**9 occurrences, one file.**

`packages/ffi/src/gobject/object.ts:170-240` patches Node's `EventEmitter`
surface (`on`, `once`, `off`, `emit`) onto the generated `GObject` prototype:

```ts
GObject.prototype.on   = onImpl   as unknown as GObject["on"];
GObject.prototype.once = onceImpl as unknown as GObject["once"];
GObject.prototype.off  = offImpl  as unknown as GObject["off"];
GObject.prototype.emit = emitImpl as unknown as GObject["emit"];
```

Plus `this as unknown as { connect(...) }` and `this as unknown as
NodeJS.EventEmitter` inside the implementations. The impl signatures
deliberately differ from the declared method types, so a single assertion is
not enough.

**Risk:** Medium. The cast hides any drift between `onImpl` and the declared
`GObject["on"]` signature — a real source of bugs if the EventEmitter contract
changes.

**Recommended fix:** Define the augmented surface in one `declare module`
block and type the `*Impl` functions to match it directly, removing the casts
at assignment time. The internal `this as unknown as { connect }` casts can use
a shared `GObjectWithConnect` interface.

---

## Category C — Methods missing from generated typings

**~30 occurrences, all in `examples/gtk-demo` plus 4 in `packages/react`.**

The generated bindings omit certain methods, so call sites assert an inline
shape to reach them:

- **Pango `Layout.setText`** — `examples/.../fontrendering.tsx` (7×),
  `textmask.tsx`, `printing.tsx` (3×):
  `(layout as unknown as { setText(t: string, l: number): void }).setText(...)`.
- **GIR async wrappers** (`*Async` Promise variants) —
  `pickers.tsx`, `clipboard.tsx`, `paintable-svg.tsx`, `listview-words.tsx`,
  `video-player.tsx`: `openAsync`, `launchAsync`, `readTextAsync`,
  `readTextureAsync`, `setValue`.
- **`addCssClass` / `removeCssClass`** — `use-css-editor.ts:108,112`,
  `packages/react/src/nodes/animation.ts:12,14`.

**Risk:** High signal value. These casts are *symptoms of a codegen gap* — the
methods exist on the real GTK objects but the generator did not emit them (or
emitted them on a base class the demo's variable type doesn't see). Per the
project rule that FFI is 100% generated, each of these is a codegen bug to
file, not a cast to keep.

**Recommended fix:** Investigate why `setText`, the `*Async` wrappers, and
`addCssClass`/`removeCssClass` are absent from the emitted `.d.ts`. Fix the
generator; the casts then delete themselves. Track under the codegen
conformance work.

---

## Category D — Structural type bridging

**~20 occurrences.** Casts where two types are structurally related but
nominally incompatible.

- `packages/native/index.ts:31` — `nativeBinding as unknown as { ... }`: the
  NAPI binding is untyped; the cast declares its shape. Acceptable as the one
  typed boundary to the native module, but should be a named `interface
  NativeBinding` rather than an inline literal.
- `packages/react/src/portal.ts:36` — object literal `as unknown as
  ReactPortal`: constructs a React internal type by hand.
- `packages/react/src/host-config.ts:199` — `context as unknown as
  ReactReconciler.ReactContext<number>`.
- `packages/react/src/nodes/internal/list-factory.ts:25,33,40,46` —
  `obj as unknown as T`: generic downcast of a `GObject` to the caller's `T`.
- `packages/react/src/nodes/list.ts:245-619` — `obj as unknown as
  Gtk.ListItem`, `sectionStore as unknown as Gio.ListModel`,
  `sectionModel as unknown as GObject.Object`: interface/model bridging where
  the generated class does not declare the interface it actually implements.
- `packages/react/src/use-setting.ts:34,39` — `settings as unknown as
  Record<string, SettingAccessor>`.
- `packages/react/src/nodes/text-segment.ts:39` — `node as unknown as
  TextContentParent`.
- `packages/css/src/cache.ts:16` — `sheet as unknown as typeof
  gtkCache.sheet`.
- `packages/ffi/src/cairo/scaled-font.ts:71` — assigning a factory function to
  a generated static slot.
- `packages/ffi/src/gobject/gvalue.ts:128` — `value as unknown as
  Parameters<Value["setVariant"]>[0]`.
- `packages/codegen/src/ffi/generators/class/constructor-builder.ts:219` —
  `this.imports as unknown as { descriptors: DescriptorRegistry }`: reaches a
  private/undeclared field on the imports object.

**Risk:** Mixed. The `list.ts` GObject-implements-interface casts (D) overlap
with Category C — they likely indicate the generator should declare
`implements Gio.ListModel` on the relevant classes. `constructor-builder.ts:219`
is the worst offender: it reaches into an object's undeclared internals and
should instead expose `descriptors` on the proper type.

**Recommended fix:** Replace inline shapes with named interfaces; for the
interface-implementation casts, fix codegen to emit the `implements` clause so
`FlattenListModel({ model })` type-checks without a cast.

---

## Category E — Test mocks cast to production interfaces

**~70 occurrences, tests only.** Partial mock objects asserted to a full
interface so they can be passed into the unit under test:

- `repo as unknown as GirRepository` — `packages/codegen/tests/**`: ~45×
  (`ffi-generator.test.ts` alone has 23, `class-generator.test.ts` 8,
  `class-meta-builder.test.ts` 5, plus `default-value.test.ts`,
  `record-filter.test.ts`, `codegen-orchestrator.test.ts`,
  `widget-detection.test.ts`).
- `server as unknown as ViteDevServer` — `packages/cli/tests/dev-runner.test.ts`
  (8×).
- `server as unknown as SocketServer` — `packages/mcp/tests/connection-manager`.
- `child as unknown as ChildProcess`, `*.run as unknown as CommandRun<...>` —
  `packages/cli/tests/cli.test.ts` (~10×).
- `paintable as unknown as Gdk.Paintable`, `transform as unknown as
  TransformFn`, `{...} as unknown as GError`, etc.

**Risk:** Low individually, but the volume hides real interface drift: a mock
missing a newly-required method still type-checks. The `GirRepository` mock in
particular is rebuilt ad hoc in many files.

**Recommended fix:** Provide one shared mock factory per heavy interface
(`createMockRepository(): GirRepository`, `createMockViteServer()`), typed to
return the real interface so a single cast lives inside the factory and adding
a method to the interface forces the mock to update.

---

## Category F — Deliberate invalid-input casts in tests

**~13 occurrences, tests only, intentional.** Feeding wrong-typed values to
assert runtime validation:

- `packages/cli/tests/config.test.ts:22,55,60` — `"Gtk-4.0" as unknown as
  string[]`, `123 as unknown as string` to test `defineConfig` validation.
- `packages/codegen/tests/core/utils/widget-detection.test.ts:82` —
  `123 as unknown as string`.
- `packages/codegen/tests/core/writers/ffi-type-expression.test.ts:296` —
  `{ type: "mystery" } as unknown as FfiTypeDescriptor`.
- `packages/ffi/tests/register-class.test.ts:46` — `NotANativeObject as
  unknown as Parameters<typeof registerClass>[0]`.
- `packages/ffi/tests/gobject/object.test.ts:120` — emitting a bogus signal.
- `packages/native/tests/.../error-handling.test.ts:54` — invalid type
  descriptor.

**Risk:** None — this is the legitimate use of the construct. Casting to an
invalid value to exercise a guard is correct and should stay.

**Recommendation:** Keep. Optionally add a `// test: intentionally invalid`
JSDoc-free marker convention, or a tiny `invalid<T>(v: unknown): T` helper to
make intent explicit and greppable.

---

## Priorities

| # | Action | Removes | Effort |
| - | ------ | ------- | ------ |
| 1 | Fix `GType` representation (Category A) | ~95 | Medium |
| 2 | File codegen bugs for missing methods (Category C) | ~30 | Medium |
| 3 | Type `GObject` EventEmitter augmentation properly (B) | 9 | Small |
| 4 | Shared typed mock factories (Category E) | ~70 | Small |
| 5 | Named interfaces for D; fix `implements` in codegen | ~20 | Small |
| 6 | Leave Category F as-is | 0 | — |

Categories A, B and the `list.ts`/codegen parts of C/D are the ones that
currently hide real bugs. Categories E and F are lower priority — E for hygiene,
F is correct as written.
