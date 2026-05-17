# Golden Standards Report — `packages/native`

## Summary

`packages/native` is the Rust↔Node.js bridge for gtkx: a dynamic FFI marshaling layer (libffi + napi-rs) plus a cross-thread dispatch coordinator between the Node.js thread and the GLib main loop — roughly 8,000 lines of `src/` Rust across 47 files, fronted by ~530 lines of TypeScript (`index.ts`, `types.ts`). It was measured against `gtk-rs/gtk-rs-core` (the canonical Rust GLib marshaler), `napi-rs/napi-rs` (the binding framework it builds on), and `romgrk/node-gtk` (the closest C++ sibling). The architecture is sound and unusually well-documented; the headline gaps are concentrated duplication in the type-codec layer — `FloatKind` shadowing `IntegerKind`, two near-identical JS-reference wrappers, and a per-item-type `match` ladder repeated six times across `array.rs`.

## Reference projects

- **gtk-rs/gtk-rs-core** (~367★, last commit 2026-05-10) — studied `glib/src/value.rs` for how a mature Rust GLib marshaler avoids per-scalar-type duplication: the `numeric!` / `not_zero!` declarative macros generate the full `ValueType`/`FromValue`/`ToValue`/`From` surface for every integer, long, and float in one invocation each.
- **napi-rs/napi-rs** (~7,743★, last commit 2026-05-16) — studied `crates/napi/src/js_values/value_ref.rs`: a single generic, `Send + Sync` `Ref<T>` holds a JS value of *any* type across threads, instead of one hand-written wrapper per JS value kind.
- **romgrk/node-gtk** (~536★, last commit 2026-01-29) — the closest sibling project (Node.js GObject-Introspection bindings). Studied `src/value.cc`/`value.h` for module organization: value conversion is centralized, directional (`V8To*` paired with `*ToV8` and a `CanConvert*` predicate), and container conversions delegate to one scalar core.

## What the target already does well

- **The `FfiCodec` trait family + `enum_dispatch`.** Splitting marshaling into `FfiEncoder`/`FfiDecoder`/`RawPtrCodec`/`GlibValueCodec` and dispatching them over the `Type` enum is a clean, open/closed-friendly seam — a new type is largely a new file plus one arm in `Type::from_js_value`.
- **`with_integer_kinds!`** (`macros.rs`) already applies exactly the gtk-rs `numeric!` philosophy to the eight integer kinds — generating `ffi_type`, `read_ptr`, `read_slice`, `FfiStorage` `From` impls, and CIF dispatch from one table. This is the right instinct; it just stops short (see DRY-1).
- **The `ModuleRequest`/`ModuleResponse` pair** (`module/handler.rs`) gives every `#[napi]` export an identical, minimal shape — a struct, an `execute()`, an `error_context()` — which keeps `call`/`alloc`/`read`/`write`/`register_class` consistent.
- **Documentation discipline.** Module-level docs are accurate and genuinely explanatory (the dispatch re-entrance model, the floating-ref handling in `gobject.rs::decode`, the shutdown `mem::forget` rationale). `unsafe` blocks carry safety reasoning. Public enums are `#[non_exhaustive]`.
- **Ownership is modeled, not implicit** — the `Ownership` enum threads transfer semantics through every codec rather than leaving them to comments.

## Findings

### Pattern Alignment

#### ✅ COMPLETED — [MEDIUM] Numeric marshaling uses the codebase's own macro pattern for only half the scalar types

> **Resolved.** Addressed together with DRY-1 below: the new `impl_numeric_codecs!` macro in `src/types/numeric.rs` generates the full `FfiEncoder`/`FfiDecoder`/`RawPtrCodec`/`GlibValueCodec` surface for both `IntegerKind` and `FloatKind` from one invocation each, exactly mirroring gtk-rs's `numeric!` philosophy. The per-type variation now lives only in inherent methods the generated impls delegate to.

- **Where:** `src/types/numeric.rs` — `FloatKind` impls at `371-462` mirror `IntegerKind` impls at `170-286`; `macros.rs:1-14` (`with_integer_kinds!` covers integers only).
- **Standard:** `gtk-rs/gtk-rs-core`, `glib/src/value.rs`: the `numeric!` macro is invoked once per scalar and covers `i8…u64`, the platform `long` newtypes, *and* `f32`/`f64` in the same family — `numeric!(i8, …); numeric!(u32, …); numeric!(f64, gobject_ffi::g_value_get_double, gobject_ffi::g_value_set_double);`. The per-type variation (which `g_value_get_*` to call) is a macro argument, so there is no hand-written parallel impl.
- **Why it matters:** gtkx already owns the equivalent tool (`with_integer_kinds!`) but applies it only to integers, so `FloatKind` is a hand-maintained twin. The two have already begun to diverge in subtle ways (integer range-checks against `MAX_SAFE_INTEGER`, float against `f32::MAX`) while their `FfiDecoder`/`RawPtrCodec` arms remain byte-identical — exactly the state where the next reader can't tell intentional difference from drift.
- **Suggested change:** Generalize `with_integer_kinds!` into a numeric-kinds table (or add float arms) so `FloatKind`'s `FfiDecoder`, `RawPtrCodec`, and `GlibValueCodec` impls are generated, leaving only the genuinely type-specific range-check logic hand-written. This converges with DRY-1 below.

### DRY

#### ✅ COMPLETED — [HIGH] `FloatKind` duplicates the four trait impls of `IntegerKind`

> **Resolved.** A local `impl_numeric_codecs!($kind, $label)` macro generates the `FfiEncoder`/`FfiDecoder`/`RawPtrCodec`/`GlibValueCodec` impls for both `IntegerKind` and `FloatKind`; the hand-written parallel impls are deleted. Genuinely type-specific logic stays as inherent methods the generated impls delegate to (`checked_to_ffi_value`, `ffi_type`, `read_ptr`, `write_ptr`, `call_cif_raw`, `ptr_to_value_raw`, `number_to_glib_value`, `number_from_glib_value`). jscpd now reports **0 clones** in `numeric.rs`. The `FfiEncoder::encode` body was fully unified — `FloatKind` now also accepts a `Value::Object` handle as a pointer-sized number, matching `IntegerKind` (a path codegen never reaches for floats, so no observable behavior change).

- **Where:** `src/types/numeric.rs`. jscpd reports clones across these spans within the file: `376-395`≈`176-195`, `410-431`≈`203-224`, `395-401`≈`195-201`, `438-444`≈`231-237`, `445-452`≈`244-251`.
- **Standard:** Measurable defect — ~5 distinct clone spans, ~70 duplicated lines, and the surrounding method bodies (`FfiDecoder::decode` → `Value::Number(ffi_value.to_number()?)`; `RawPtrCodec::read_from_raw_ptr`/`write_return_to_raw_ptr`/`write_value_to_raw_ptr`) are identical apart from the `Self::` enum name. Contrast `glib/src/value.rs`, where one `numeric!` invocation covers a scalar with zero hand-written parallel code.
- **Why it matters:** Every change to scalar marshaling (a new error message, a new trait method, a tweak to `write_value_to_raw_ptr`) must be made twice and kept in sync by inspection. The bodies are far enough apart in the file (`~170` vs `~370`) that drift is invisible without a deliberate diff.
- **Suggested change:** Drive the `FfiEncoder`/`FfiDecoder`/`RawPtrCodec`/`GlibValueCodec` impls for both `IntegerKind` and `FloatKind` from the numeric-kinds macro; keep only `check_range` / `checked_to_ffi_value` hand-written, since those genuinely differ.

#### [HIGH] The per-item-type `match` ladder is repeated six times in `array.rs`

- **Where:** `src/types/array.rs` — the `match &*self.item_type { Type::Integer | Type::Float | Type::Boolean | Type::GObject|Boxed|Struct|Fundamental | Type::String | Type::Tagged | <rest ⇒ unsupported> }` ladder recurs at `item_element_size` (`418-437`), `encode` (`466-515`), `append_items_to_garray` (`616-662`), `decode_garray` (`797-855`), `decode_storage` (`959-1012`), and `decode_sized_array` (`1018-1039`).
- **Standard:** Measurable defect — six parallel switches over the same case set, in the package's largest file (1,203 lines). `romgrk/node-gtk` layers its container conversions (`GListToV8`, `GHashToV8`, `ArrayToV8` in `value.cc`) on a single scalar core (`GIArgumentToV8`) rather than re-enumerating element types per container.
- **Why it matters:** Adding an array element type (or changing how, say, `Tagged` elements are laid out) means finding and editing all six ladders. Miss one and the result is either a silent wrong decode or a runtime `bail!("Unsupported … item type")` — the compiler cannot catch the omission because each ladder's `_`/explicit-rest arm absorbs it.
- **Suggested change:** Introduce one `ItemCodec` abstraction keyed off `item_type` that exposes `element_size()`, `encode_contiguous()`, `decode_contiguous(ptr, len)`. Each `ArrayKind` path (`encode_garray`, `decode_storage`, `decode_sized_array`, …) then asks the `ItemCodec` once instead of re-matching the type. New element types become one `ItemCodec` arm.

#### [MEDIUM] `JsCallbackRef` and `JsObjectRefValue` are the same struct written twice

- **Where:** `src/value.rs` — `JsCallbackRef` (`33-87`) and `JsObjectRefValue` (`94-148`). jscpd: `56-63`≈`117-124`, `73-81`≈`134-142`.
- **Standard:** `napi-rs`, `crates/napi/src/js_values/value_ref.rs`: a single `Ref<T>` carries `raw_ref: sys::napi_ref` + `PhantomData<T>`, is `unsafe impl<T> Send/Sync`, and recovers type-specific behavior from `T`'s `FromNapiValue`/`JsValue` impls. One generic type serves functions, objects, and arrays.
- **Why it matters:** The two gtkx structs are identical — `{ raw, env }`, the `unsafe impl Send/Sync`, the `Debug`, the `Drop` with `napi_delete_reference` + `debug_assert_eq!`, the `from_js_*` and `get_value` bodies — differing only in `JsFunction` vs `JsObject`. Any fix to ref lifecycle (e.g. handling a non-`napi_ok` delete status) must land in both, and they can silently diverge. The crate doc in `lib.rs:40-48` correctly explains why `napi::Ref<T>` itself can't be used (it isn't `Send + Sync` on the typed surface) — so the fix is not "adopt `napi::Ref`" but to collapse the two into one in-house generic that *mirrors* its shape.
- **Suggested change:** Define one `JsRef<T>` generic over the napi JS type (`T: NapiRaw + ...`), with a `PhantomData<T>` like napi-rs's `Ref<T>`; let `Callback` and `Ref` hold `JsRef<JsFunction>` / `JsRef<JsObject>`.

#### ✅ COMPLETED — [MEDIUM] Pointer-typed codecs duplicate their `RawPtrCodec` boilerplate

> **Resolved.** A new private module `src/types/raw_ptr.rs` holds three shared primitives — `write_object_ptr` (the four byte-identical `write_value_to_raw_ptr` bodies), `write_return_object_ptr` (the `result_to_ptr`/null-check/write shell, with the per-type ownership transfer kept as a closure argument), and `null_guarded` (the null-short-circuit prologue of `ptr_to_value`). `GObjectType`, `BoxedType`, `StructType` and `FundamentalType` delegate all three; `StringType` adopts `null_guarded`. The genuinely type-specific parts — `g_boxed_copy`, the GObject ref, the fundamental `ref_fn`, struct's no-op transfer — stay at each call site as the closure body. jscpd reports the `write_value_to_raw_ptr`, `ptr_to_value` null-prologue and `write_return_to_raw_ptr` clones gone; the now-redundant `#[allow(clippy::not_unsafe_ptr_arg_deref)]` on `FundamentalType::ptr_to_value` was removed too.

- **Where:** `write_value_to_raw_ptr` is effectively byte-identical (only the error label changes) across `src/types/gobject.rs:116-120`, `boxed.rs:165-169`, `boxed.rs:297-301` (`StructType`), `fundamental.rs:154-158`. jscpd also flags the shared `ptr_to_value` null-prologue (`gobject.rs:90-95`≈`boxed.rs:143-148`≈`boxed.rs:283-288`≈`string.rs:71-76`) and the `write_return_to_raw_ptr` shape (`boxed.rs:150-155`≈`gobject.rs:101-106`, `boxed.rs:161-166`≈`fundamental.rs:150-155`).
- **Standard:** Measurable defect — four identical method bodies plus several 6-line clones. The methodology's "same logic in several places" smell.
- **Why it matters:** These are pointer-write primitives in `unsafe` code; a correctness fix (e.g. switching `write_unaligned` semantics, or null-handling) must be replicated across four files and risks being applied unevenly.
- **Suggested change:** A free helper `write_object_ptr(ptr, value, label)` for the identical `write_value_to_raw_ptr` body, and a `null_guarded` helper (or a default trait method) for the shared `ptr_to_value` null prologue. Keep the genuinely type-specific parts (`g_boxed_copy` in `BoxedType::write_return_to_raw_ptr`, the `ref_fn` in `FundamentalType`).

#### [MEDIUM] `ref_type.rs` re-implements decoding that already exists on the inner types

- **Where:** `src/types/ref_type.rs` — `decode_gobject_inner` (`146-160`), `decode_boxed_inner` (`162-177`), `decode_fundamental_inner` (`179-196`), `decode_struct_inner` (`198-220`). jscpd: `163-170`≈`180-187`≈`199-206`.
- **Standard:** Measurable defect — the four functions share the `let actual_ptr = unsafe { *(storage.ptr() as *const *mut c_void) }; if actual_ptr.is_null() { return Null }` prologue, and each then re-derives the `ownership.is_full()` → `from_glib_full` / else `from_glib_none` branch that already lives in `GObjectType`/`BoxedType`/`FundamentalType`/`StructType`'s own `FfiDecoder::decode`.
- **Why it matters:** The transfer-ownership rules for these four types now live in two places each. If `GObjectType::decode`'s floating-reference handling (`gobject.rs:57-87`) needs another fix, `decode_gobject_inner` will not get it — yet both run for the same `gobject`-typed value depending only on whether it was wrapped in a `Ref`.
- **Suggested change:** Have `RefType::decode` dereference the pointer-to-pointer once, then delegate to the inner type's existing decoder (it already does exactly this for scalars, and `RefType::read_from_raw_ptr` at `271-283` already shows the deref-then-delegate pattern). Where the `Ref` ownership semantics genuinely differ from a plain return value, make that difference an explicit argument to the shared decoder rather than a forked copy.

#### [LOW] JS-array iteration is open-coded at five call sites

- **Where:** the `for i in 0..len { let item = arr.get(i)?.ok_or_else(|| napi::Error::new(…, "… missing")) }` loop appears in `value.rs:371-381`, `types.rs:62-71`, `module/gobject.rs:399-410` and `488-499`, `arg.rs:42-50`. Separately, `module/gobject.rs::parse_js_array` (`386-411`) is a near-subset of `parse_array_property` (`465-500`) — jscpd `395-405`≈`484-494`.
- **Standard:** Measurable defect — five hand-rolled copies of the same fallible map-over-`Array`.
- **Why it matters:** Low individually, but it is the most-repeated idiom in the JS-parsing layer; each copy reinvents the missing-element error.
- **Suggested change:** One generic `map_js_array<T>(env, arr, |env, item| …) -> napi::Result<Vec<T>>` helper; collapse `parse_js_array` into `parse_array_property`'s tail.

### Dead Code

#### ✅ COMPLETED — [LOW] Two unused public functions, kept invisible by a blanket `allow(dead_code)`

> **Resolved.** `Value::from_glib_values` and `FfiValue::storage()` deleted. `Value::from_ffi_value` deleted and its 25 `tests/value.rs` callers migrated to the production decode path (`ty.decode`). The crate-wide `#![cfg_attr(test, allow(dead_code))]` was removed and replaced with per-item `#[cfg_attr(test, allow(dead_code))]` on the 44 `#[napi]`-export false positives (all confined to `src/module/`). Note: the original premise here is inaccurate — because `packages/native` is also an `rlib`, rustc treats every `pub` item as public API and never flags it dead even under `--force-warn dead_code`; the blanket `allow` was not what hid these (grep is the only way to find dead `pub` items). The narrowing still pays off: genuine dead *private* code outside `src/module/` now surfaces in the lib-test build.

- **Where:** `src/value.rs:443` — `Value::from_glib_values` has zero call sites in `src/` or `tests/`. `src/ffi/value.rs:170-177` — `FfiValue::storage()` has zero call sites. (Verified by repository-wide grep; `packages/native` is a standalone crate with no external Rust consumers, so unused non-`#[napi]` `pub` items are genuinely unreachable.)
- **Standard:** Measurable defect — 0 references. Note the enabling mechanism: `lib.rs:50` carries `#![cfg_attr(test, allow(dead_code))]`, so the one build that compiles the whole crate (`cargo test`) is also the one told not to report dead code — which is why these slipped through.
- **Why it matters:** Both look like deliberate API (`from_glib_values` mirrors the live `from_glib_value`; `storage()` mirrors the live accessors on `FfiValue`), so a reader reasonably assumes they are load-bearing. Small, but pure noise on the audit surface.
- **Suggested change:** Delete both. Separately, consider scoping the `allow(dead_code)` to the specific items that legitimately need it (items used only by a subset of integration tests) rather than the whole crate, so future rot is caught. Also note `Value::from_ffi_value` (`value.rs:255`) has no production caller — it is exercised only by `tests/value.rs` (25×); either keep it as a documented test-only convenience or have those tests call the production path (`from_ffi_value_with_args` / `ty.decode`).

### SOLID

#### [MEDIUM] `module/gobject.rs` mixes trivial helpers with the entire class-registration subsystem (SRP)

- **Where:** `src/module/gobject.rs` (611 lines — the largest file in `module/`). It contains two ~90-line runtime helpers (`find_object_property`, `get_instance_gtype`, `23-111`) and, unrelated to them, the whole dynamic `GType` registration feature (`113-537`): vfunc parsing, libffi trampoline construction, `class_init` patching, and inherited-interface vtable overwriting.
- **Standard:** `romgrk/node-gtk` keeps object-lifecycle concerns (`gobject.cc`) separate from value conversion (`value.cc`); each file changes for one reason. Here the module doc (`gobject.rs:1-5`) describes *only* the helpers ("GObject runtime helpers… so JavaScript does not need to traverse the `GTypeInstance` chain") and never mentions registration.
- **Why it matters:** Git history shows `register_class` reworked across at least five commits (`c9399695`, `7ac6ca5d`, `7e25012c`, `39ff22e3`, `43d556ca`) — it is a high-churn subsystem, and every one of those edits also touched the file that owns the unrelated property/gtype helpers. The file's name and doc actively mislead about what the bulk of it does.
- **Suggested change:** Move `register_class` and its `RawVfunc`/`PreparedVfunc`/`RawInterface`/`PreparedInterface` machinery into `module/register_class.rs`; leave `gobject.rs` as the small runtime-helpers module its doc already describes.

#### [MEDIUM] Every `Type` variant must implement codec methods half of them only `bail!` (ISP / Liskov)

- **Where:** `src/types.rs:178-269` — the `FfiCodec` super-trait requires all four codec traits on all 16 `Type` variants, with `bail!` defaults (`decode` "cannot be decoded", `to_glib_value` `Ok(None)`, `RawPtrCodec` "cannot be read from pointer"). Concretely: `CallbackType::call_cif` and `TrampolineType::call_cif` bail "cannot be return types" (`callback.rs:186-193`, `trampoline.rs:92-100`); `RefType::call_cif` bails (`ref_type.rs:135-142`); `StructType::from_glib_value` bails (`boxed.rs:304-309`); `CallbackType`/`TrampolineType` inherit the `bail!` `FfiDecoder`/`RawPtrCodec` defaults wholesale.
- **Standard:** `romgrk/node-gtk` pairs each `V8ToGIArgument` with a `CanConvertV8ToGIArgument` predicate (`value.h`), so a call site can check capability *before* committing to a conversion that would otherwise fail deep inside.
- **Why it matters:** `Type::call_cif`, `Type::decode`, `Type::to_glib_value` are statically callable on any variant but are runtime errors for a large subset. A codegen bug that emits, say, a `callback` as a function's return type is not unrepresentable — it surfaces as a `bail!` deep inside `CallRequest::execute` rather than at the parse boundary. This is a deliberate tradeoff (the concrete type is only known at runtime from a JS descriptor, and `enum_dispatch` needs uniform trait coverage), so a full static split is not the recommendation.
- **Suggested change:** Add a cheap capability check at the boundary — e.g. `Type::can_be_return_type()` consulted in `CallRequest`/`Type::from_js_value` for the return slot — so illegal shapes are rejected with a precise message where the JS descriptor is parsed, instead of relying on `call_cif` bailing later. At minimum, document per-variant which codec traits are real vs. defaulted.

## Prioritized roadmap

1. ✅ **COMPLETED — Delete the dead code** (`Value::from_glib_values`, `FfiValue::storage()`) and tighten the `allow(dead_code)` scope — Dead Code finding. Minutes of effort, removes misleading API surface immediately.
2. ✅ **COMPLETED — Generate `IntegerKind` + `FloatKind` codec impls from the numeric-kinds macro** — DRY-1 / Pattern Alignment. The `impl_numeric_codecs!` macro now generates all four codec trait impls for both kinds; `numeric.rs` reports 0 clones.
3. ✅ **COMPLETED — Extract the shared pointer-codec helpers** (`write_object_ptr`, `write_return_object_ptr`, `null_guarded` in `src/types/raw_ptr.rs`) — DRY-4. The four pointer-typed codecs delegate their `RawPtrCodec` boilerplate to one reviewed module.
4. **Collapse `JsCallbackRef`/`JsObjectRefValue` into one generic `JsRef<T>`** — DRY-2. Self-contained change in `value.rs`, modeled on napi-rs's `Ref<T>`.
5. **Unify `RefType`'s `decode_*_inner` with the inner types' own decoders** — DRY-5. Removes a genuine correctness hazard (ownership rules duplicated per type).
6. **Split `register_class` out of `module/gobject.rs`** — SRP finding. Mechanical move; best done the next time that subsystem is touched.
7. **Introduce an `ItemCodec` abstraction for `array.rs`** — DRY-3. Highest structural payoff but the largest effort; sequence it after the cheaper wins so the file is calmer when restructured.
8. **Add the `map_js_array` helper and merge the `parse_js_array`/`parse_array_property` pair** — DRY-6. Batch alongside item 6 or 7.
9. **Add a return-type capability check at the parse boundary** — SOLID ISP finding. Design-level; defer until the marshaling layer is otherwise stable.
