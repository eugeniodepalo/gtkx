# Golden Standards Report — `packages/ffi`

## Summary

This audit covers the **hand-written runtime** of `@gtkx/ffi` (~7,950 lines across 42 files; the gitignored `src/generated/` tree is out of scope, as it is the responsibility of `packages/codegen`). The runtime splits cleanly into a **core layer** (registry, handles, object construction, signals, async, class registration) and **hand-written library bindings** (the 21-file `cairo/` module, `gl/gl.ts`, and the `gobject/` GValue layer). It was measured against the project's own internal golden pattern (`t.fn` in `helpers.ts`), against **GJS** and **node-gtk** (the GObject-introspection binding lineage gtkx explicitly mirrors), and against **koffi** and **Deno FFI** (modern declare-once FFI idioms). The core layer is genuinely well-built; the headline finding is that the `cairo/` module — roughly a third of the package — ignores the bind-once FFI pattern the rest of the codebase uses, costing both performance on the hottest path and ~1,500 lines of boilerplate.

## Reference projects

- **GJS** (gitlab.gnome.org/GNOME/gjs) — GNOME's canonical GObject-introspection JS engine, actively maintained, the reference implementation for GValue marshalling (`gi/value.cpp`). Studied for how JS↔GValue conversion is centralized.
- **koffi** (github.com/Koromix/koffi, ~900★, actively maintained) — popular Node.js C FFI library. Studied for its declare-once function API.
- **Deno FFI** (`Deno.dlopen`, part of the Deno runtime, actively maintained) — studied for the symbol-table pattern where each native function is declared once and reused.
- **node-gtk** (github.com/romgrk/node-gtk) — the GObject-introspection Node binding gtkx's `registerClass` explicitly mirrors. Used as design lineage rather than a maintained golden standard (it is largely dormant).

## What the target already does well

- **The core runtime is cleanly layered.** `registry.ts`, `handles.ts`, `object.ts`, `signals.ts`, `async.ts`, and `register-class.ts` each own one concern, are thoroughly documented, and the deliberate import-cycle management in `runtime.ts` is well-explained — do not disturb it.
- **The identity registry is correct.** `objectRegistry` pairs `WeakRef` with a `FinalizationRegistry` so wrappers round-trip to `===` identity without leaking — a subtle thing done right.
- **`t` (in `helpers.ts`) is a clean, allocation-conscious FFI type DSL**, and `fn` is exactly the right bind-once primitive.
- **`gl/gl.ts` uses `fn` correctly** — every GL symbol is bound once at module load. This is the in-repo proof that the cairo finding below is fixable.
- **`makeErrorDomain` / `ErrorDomain`** using `Symbol.hasInstance` to make `error instanceof Gtk.DialogError` discriminate by GLib error domain is elegant.
- **The author already extracts helpers** — `enum-helpers.ts`, `common.ts`'s `readTextExtents`/`callGetXY`, `region.ts`'s `regionBinaryOp`, `scaled-font.ts`'s `readMatrixVia`. The DRY findings below are about doing this *globally*, not introducing the habit.

## Findings

### Pattern Alignment

#### [HIGH] ✅ COMPLETED — The `cairo/` module ignores the project's own `t.fn` bind-once pattern

- **Where:** every method in `src/cairo/context.ts` (99 `call()` sites), `pattern.ts`, `surface.ts`, `region.ts`, `font-options.ts`, `device.ts`, `matrix.ts`, `scaled-font.ts`, `image-surface.ts`, and the pdf/ps/svg/tee/script/recording surface files — **278 `call()` invocations and ~236 inline `{ type: SELF_T, value: getHandle(this) }` arguments across the directory**.
- **Standard:** The project's own `helpers.ts` documents `fn` as binding "the library, symbol, and a pre-built `Arg` array in a closure so the descriptor objects are allocated once at module load … making calls allocation-free on the hot path." `gl/gl.ts` follows this exactly: `const glClear = fn(LIB, "glClear", [{ type: U32 }], VOID)`. The same idiom is the norm in modern FFI libraries — koffi's `const atoi = lib.func('atoi', 'int', ['str'])` returns a reusable callable, and Deno's `Deno.dlopen(path, symbols)` declares each function once. The cairo module instead calls `call(LIB, "cairo_move_to", [{type, value}, …], ret)` directly inside each method body, rebuilding the entire `Arg` descriptor array on **every invocation**.
- **Why it matters:** Two concrete costs. (1) **Performance on the hottest path.** `Context` methods — `moveTo`, `lineTo`, `setSourceRgb`, `paint` — are called dozens to hundreds of times per draw callback, per frame. Each call now allocates a fresh array of fresh descriptor objects that the GC must then collect, inside the render loop. (2) **~1,500 lines of boilerplate** that all has to be read and maintained, and the type of the result is hand-cast (`as Status`, `as number` — 180 such casts) at every site instead of once at the binding.
- **Suggested change:** Bind each cairo symbol once at module scope, mirroring `gl/gl.ts`. Either directly:
  ```ts
  const cairo_move_to = t.fn(LIB, "cairo_move_to",
      [{ type: CAIRO_T }, { type: DOUBLE_TYPE }, { type: DOUBLE_TYPE }], t.void);
  Context.prototype.moveTo = function (x, y) { cairo_move_to(getHandle(this), x, y); };
  ```
  or via a thin `cairoMethod(selfType, name, argTypes, ret)` helper that wraps `t.fn` and prepends `getHandle(this)`. The handful of methods with genuinely dynamic descriptors (`image-surface.ts` `getData`'s size-dependent `t.struct`, dynamic boxed type names) stay as direct `call()` — that is the legitimate residue.

#### [MEDIUM] ✅ COMPLETED — Two divergent code paths build the same `g_object_new_with_properties` call

- **Where:** `src/object.ts:51-81` (`constructGObject`) and `src/gobject/object.ts:117-136` (`Object.newWithProperties`).
- **Standard:** GJS routes all object construction through one path; node-gtk likewise has a single `g_object_new*` entry point. A native operation as intricate as `g_object_new_with_properties` — with its four-element descriptor array (`uint64` gtype, `uint32` count, sized string array, sized `GValue` array with `elementSize`/`sizeParamIndex`) — should have exactly one home.
- **Why it matters:** Both functions independently encode the identical, fiddly argument layout. A correctness fix to that layout (an ABI change, an ownership tweak) must be made in two places, and the two already differ subtly — `constructGObject` returns a raw handle for the caller to register, `newWithProperties` calls `getNativeObject`. The next person editing one will not know the other exists.
- **Suggested change:** Have `constructGObject` delegate to a single private `objectNewWithProperties(gtype, names, values)` helper, with `Object.newWithProperties` as a thin public wrapper over it.

### DRY

#### [MEDIUM] ✅ COMPLETED — The borrowed-`GValue` FFI descriptor, its size, and the libgobject library name are redefined repeatedly

- **Where:** the descriptor `t.boxed("GValue", "borrowed", "libgobject-2.0.so.0", "g_value_get_type")` is defined **four times** — `object.ts:8` (`GVALUE_BORROWED`), `gobject/gvalue.ts:11` (`GVALUE_ARG`), `gobject/value.ts:32` (`GVALUE_ARG`), `gobject/object.ts:108` (`GVALUE_BORROWED_TYPE`). `GVALUE_SIZE = 24` is defined in both `object.ts:9` and `gobject/object.ts:106`. The string `"libgobject-2.0.so.0"` appears as a literal **16 times** across non-generated files (sometimes as a local `LIB` const, sometimes inlined).
- **Standard:** This is a measurable defect — the same piece of ABI knowledge (the GValue struct is 24 bytes; the boxed descriptor is exactly this) living in four to sixteen places.
- **Why it matters:** `GVALUE_SIZE` is a hard ABI fact; if it ever has to change (or someone questions it), two definitions must stay in lockstep with no compiler help. The four descriptor constants already drift in naming, which obscures that they are the same thing.
- **Suggested change:** Export `LIBGOBJECT`, `GVALUE_SIZE`, and a single `GVALUE_BORROWED` descriptor from one module (a `gobject/constants.ts`, or extend the existing `gtype.ts`) and import them everywhere.

#### [MEDIUM] ✅ COMPLETED — `gobject/types.ts` is 22 hand-rolled lazy getters

- **Where:** `src/gobject/types.ts:4-130` — 22 module-scope `let xxxType` cache variables paired with 22 getters on `Type`, each body identical except for the type-name string: `get INT() { intType ??= typeFromName("gint"); return intType; }`.
- **Standard:** A measurable defect: one piece of knowledge (the name→GType map) expanded into ~110 lines of mechanical repetition. Note also `INVALID` and `NONE` both resolve `typeFromName("void")` with two separate cache variables.
- **Why it matters:** Adding a fundamental, or changing the caching strategy, means editing 22 parallel sites. The repetition also hides the `INVALID`/`NONE` aliasing.
- **Suggested change:** Drive `Type` from a single `{ INT: "gint", UINT: "guint", … }` table with one memoizing getter factory (a `Proxy` or a generated record). ~110 lines collapse to ~30, and the table becomes the single source of truth — which dovetails with finding S1 below.

#### [LOW] cairo file-surface subclasses share a boilerplate skeleton

- **Where:** `src/cairo/pdf-surface.ts`, `ps-surface.ts`, `svg-surface.ts` — jscpd flags an 8-line identical import header between `pdf-surface.ts:1-8` and `ps-surface.ts:1-8`, and all three repeat the `static create()` → `createFileSurface()` → `wrapHandle()` shape.
- **Standard:** Minor textual clone, reported by jscpd.
- **Why it matters:** Low — these are small files and the shared `createFileSurface` helper already does the real work. Worth folding into the finding-PA1 cairo pass rather than as separate effort.
- **Suggested change:** When the cairo module is reworked for PA1, a shared `FileSurface` base (or a `defineFileSurface(libCreateFn)` factory) absorbs the `static create` skeleton.

### Dead Code

The non-generated source is **essentially free of dead code** — `knip`-style analysis is unreliable here because 21 generated files consume the runtime exports through the `runtime.ts` barrel, but a manual cross-reference of each public export found them all reachable (`freeze`/`unfreeze`/`getNativeId` are used by generated bindings; `registerClass`, `findNativeClass`, `getClassGType`, `getParentClass`, `CONSTRUCTION_META` are consumed by `packages/react`). One item to **confirm rather than remove**: `getNativeInterface` (`native.ts:170`, re-exported from `index.ts`) is referenced only by its own tests. It is documented public library API, so it is most likely an intentional consumer-facing surface — verify that intent rather than treating it as dead.

✅ CONFIRMED — `getNativeInterface` is intentional consumer-facing API: it is exported from the package `index.ts` and carries a full doc comment with a usage `@example`. Kept as-is.

### SOLID

#### [MEDIUM] ✅ COMPLETED — Open/Closed: the GLib-fundamental ↔ JS-value mapping is scattered across three dispatch structures

- **Where:** `src/gobject/gvalue.ts:168` (`newFrom` — a `switch` over `ffiType.type`), `src/gobject/gvalue.ts:273` (`valueFromFundamentalFactory` — an `if`-ladder over `typeFundamental`), and `src/gobject/value.ts:251` (`getFundamentalGetters` — a `Map` keyed by fundamental, the read direction).
- **Standard:** GJS centralizes this in `gi/value.cpp`: `gjs_value_to_g_value_internal()` and `gjs_value_from_g_value_internal()` are one dispatcher per direction. Adding a type means touching exactly one switch per direction.
- **Why it matters:** In gtkx, the *write* direction alone is split between `newFrom` and `valueFromFundamentalFactory`, and the *read* direction is a third table. Supporting a new fundamental, or fixing how (say) `INT64` is marshalled, requires edits to three parallel structures in two files — and the parallelism is implicit, so one will be missed. The `newFrom`/`fromJS` split itself is *deliberate and correct* (one keys off a codegen-time FFI descriptor, the other off a runtime `GType` — the doc comments explain this well, and they should stay separate). The defect is that the *fundamental-keyed* dispatch is duplicated rather than shared.
- **Suggested change:** Define one fundamental-keyed table — `{ [Type.INT]: { to: newFromInt, from: v => v.getInt() }, … }` — and have `valueFromFundamentalFactory` and `getFundamentalGetters` both read from it. `newFrom`'s FFI-type switch then delegates its numeric cases into the same table. This pairs naturally with the D2 rework of `types.ts`.

## Prioritized roadmap

1. ✅ **D1 — consolidate the GValue descriptor, `GVALUE_SIZE`, and library name.** Completed. `LIBGOBJECT`, `GVALUE_SIZE`, and a single `GVALUE_BORROWED` descriptor are exported from `gtype.ts` and imported everywhere; the four descriptor copies, two size copies, and sixteen string literals are gone (the literal now appears exactly once).
2. ✅ **PA2 — unify the two `g_object_new_with_properties` paths.** Completed. Both `constructGObject` and `Object.newWithProperties` route through one `objectNewWithProperties` helper in `object.ts`. This also corrected `newWithProperties`, which declared a `borrowed` return where `g_object_new_with_properties` transfers `full` ownership.
3. ✅ **D2 — collapse `gobject/types.ts`** from 22 getters to a table-driven factory. Completed. One `{ INVALID: "void", … }` name table drives memoizing getters built in a loop; `INVALID`/`NONE` now share a single cache entry. 130 lines → 67.
4. ✅ **S1 — centralize the fundamental ↔ JS mapping.** Completed. One fundamental-keyed `{ to, from }` table in `gvalue.ts` is consumed by both the `fromJS` write path and the `Value.prototype.toJS` read path; the `valueFromFundamentalFactory` if-ladder and the `getFundamentalGetters` map are gone, and the `newCharValue`/PARAM special cases fold into the table.
5. ✅ **PA1 — rebind the `cairo/` module on `t.fn`.** Completed. Every cairo C symbol is bound once at module load, mirroring `gl/gl.ts`; hot-path per-call descriptor allocation is eliminated. The one genuinely dynamic call (`ImageSurface.getData`, runtime struct size) remains as `call()`.
6. ✅ **D3 — fold the cairo file-surface boilerplate** into a shared factory. Completed as part of the PA1 pass via `fileSurfaceCreate` in `common.ts`.
