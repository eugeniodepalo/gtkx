# `bigint` Audit

A full inventory of `bigint` / `BigInt` usage across the gtkx codebase,
including the Rust native layer that produces the values. Generated TypeScript
(`src/generated/`) is excluded except where it declares a `bigint`-typed
constant.

## Summary

`bigint` is **not** a pervasive type in this codebase. It exists almost
entirely at one seam: the NAPI boundary between the Rust native addon and
TypeScript. Hand-written TypeScript uses `number` everywhere; `bigint` appears
only to receive 64-bit values from the native module, and is converted to
`number` immediately.

| Scope | Occurrences |
| ----- | ----------- |
| Hand-written TS (`packages/native/index.ts`) | 6 |
| Hand-written TS (`packages/ffi/src/class-struct-pointer.ts`) | 2 |
| Generated TS (`bigint` literal) | 1 (`TYPE_INVALID: 0n`) |
| Rust native (`u64` → `BigInt` marshaling) | see Category C |
| Tests | 0 |

There are **no `bigint` usages in test code** and **none in any other
package** (`ffi`, `react`, `css`, `codegen`, `cli`, `mcp`, `testing`, `e2e`,
examples).

---

## Category A — The NAPI boundary (`packages/native/index.ts`)

**6 occurrences. The only deliberate `bigint` surface in the project.**

The native addon hands 64-bit unsigned values (`gsize`/`GType`) to JavaScript
as `BigInt`. `index.ts` types that raw surface and then converts down to
`number` for every public export:

```ts
// the raw, untyped native binding shape (index.ts:31-43)
const native = nativeBinding as unknown as {
    getInstanceGtype: (external: unknown) => bigint;          // :36
    registerClass: (name: string, parentGtype: bigint, ...) => bigint;  // :40
};
```

```ts
// index.ts:283 — public wrapper converts bigint -> number
export function getInstanceGType(handle: NativeHandle): number {
    return Number(native.getInstanceGtype(handle));
}

// index.ts:346-348 — same, plus BigInt() on the way in
export function registerClass(name: string, parentGtype: number, ...): number {
    return Number(native.registerClass(name, BigInt(parentGtype), nativeOptions));
}

// index.ts:355 — interface gtype round-tripped through BigInt
gtype: BigInt(iface.gtype),
```

Also `index.ts:22` — `readonly gtype: bigint` on a native-options type fed back
into the addon.

**Observation:** every `bigint` here is born at the native call and dies one
line later in a `Number(...)` / `BigInt(...)` conversion. No `bigint` value
ever escapes `index.ts` into the rest of the TypeScript codebase. The public
contract of `@gtkx/native` is entirely `number`-based.

---

## Category B — `class-struct-pointer.ts` accepts `bigint` defensively

**2 occurrences.**

```ts
// packages/ffi/src/class-struct-pointer.ts:32
export type ClassStructTarget = NativeClass | NativeHandle | GType | number | bigint;

// :37
if (typeof target === "number" || typeof target === "bigint") {
    return target as unknown as GType;
}
```

`ClassStructTarget` admits `bigint` in its input union and the runtime guard
handles it. But given Category A, **no caller in the codebase actually passes a
`bigint`** — the native wrappers already downcast to `number`. This branch is
dead in practice.

**Risk:** Low, but misleading. The `bigint` arm of the union and the
`typeof === "bigint"` guard suggest a `bigint`-carrying code path that does not
exist. Either remove `bigint` from the union, or document why the defensive
branch is kept.

(The accompanying `as unknown as GType` casts here are also catalogued in
`UNKNOWN.md`, Category A.)

---

## Category C — Rust native layer: two representations for one 64-bit type

**This is the substantive finding.** The Rust addon marshals 64-bit native
values to JavaScript via **two different and inconsistent paths**:

### Path 1 — dedicated native methods → `BigInt`

`getInstanceGtype` and `registerClass` return through
`impl ModuleResponse for u64` (`src/module/handler.rs:78-92`), which builds a
real JS `BigInt`:

```rust
impl ModuleResponse for u64 {
    fn to_js_response(self, env: &Env) -> napi::Result<Unknown<'_>> {
        let raw = BigInt::to_napi_value(env.raw(),
            BigInt { sign_bit: false, words: vec![self] })?;
        ...
    }
}
```

Lossless: the full 64-bit value reaches JS intact (and is then truncated by the
`Number(...)` wrapper in Category A).

### Path 2 — generic FFI `call(..., t.uint64)` → `f64` (number)

The general FFI marshaller treats `uint64`/`int64` as `f64`
(`src/types/numeric.rs`):

```rust
Self::I64 => (-MAX_SAFE_INTEGER, MAX_SAFE_INTEGER, "i64"),
Self::U64 => (0.0, MAX_SAFE_INTEGER, "u64"),
// check_range: bail!("Value {value} is out of range for {name}")
Self::U64 => ptr as u64 as f64,   // ptr_to_value_raw
```

A `uint64` FFI result is returned as a JS `number` and **range-checked against
`MAX_SAFE_INTEGER` (2^53)** — a real 64-bit value above 2^53 makes the call
`bail!` with an out-of-range error.

### The inconsistency

The same logical type — a 64-bit GObject `GType` / `gsize` — is delivered as a
`BigInt` when it comes from `getInstanceGtype`, but as a range-limited `number`
when it comes from a generic `call(lib, "..._get_type", [], t.uint64)`. The FFI
codebase does the latter constantly (e.g. `gvalue.ts`, `types.ts` all call
`*_get_type` through `call(..., t.uint64)`).

**Consequences:**
- Two code paths can disagree on whether a GType above 2^53 is representable.
  Path 1 keeps it; Path 2 rejects it.
- In practice GObject `GType` values are small registered indices well under
  2^53, so no failure is observed today — but the guarantee is accidental, not
  designed.
- The `Number(...)` downcast in `index.ts` (Category A) silently discards
  Path 1's precision advantage, making the two paths *behave* the same for
  in-range values and masking the divergence.

---

## Category D — Generated constant

`packages/ffi/src/generated/gobject/gobject.d.ts:2696`:

```ts
export let TYPE_INVALID : 0n
```

A single `bigint` literal in generated typings. Inert — not consumed by
hand-written code, which uses `0` / `0 as unknown as GType` sentinels instead
(see `UNKNOWN.md` Category A). Regenerated from GIR; no action.

---

## Cross-reference: `bigint`, `number`, and the `GType` phantom type

The `GType` type is declared as an opaque branded object
(`gobject.d.ts:2688`) and is therefore neither `number` nor `bigint` at the
type level — yet at runtime it is exactly the 64-bit value discussed above.
Every site that bridges `GType` ↔ numeric is listed in `UNKNOWN.md`
Category A (~95 `as unknown as` casts). The `bigint`/`number` ambiguity
documented here is the *runtime* half of that same unresolved question:
**the codebase has never decided whether a GType is a `number`, a `bigint`, or
a branded type, and currently treats it as all three depending on the layer.**

---

## Recommendations

| # | Action | Effort |
| - | ------ | ------ |
| 1 | Pick one wire representation for 64-bit native values. Either marshal `t.uint64` results as `BigInt` too (Path 2 → Path 1), or accept the 2^53 ceiling and have `ModuleResponse for u64` also return `f64`. Do not keep both. | Medium |
| 2 | Decide the public type of a GType once (see `UNKNOWN.md` Cat. A) and make `getInstanceGType` / `registerClass` / FFI `_get_type` calls all return it. | Medium |
| 3 | Remove the dead `bigint` arm from `ClassStructTarget` (Category B), or add a comment explaining the defensive guard. | Small |
| 4 | If the 2^53 ceiling is accepted, document it explicitly at the `t.uint64` marshaller and at `getInstanceGType` so future GType-as-pointer assumptions do not silently break. | Small |

The codebase is in a benign state today only because real GObject `GType`
values stay well below 2^53. The risk is latent, not active — but the two
marshaling paths in Category C should be unified before any 64-bit native
value that genuinely exceeds 2^53 (a raw pointer, a large flag set) is routed
through the generic FFI path.
