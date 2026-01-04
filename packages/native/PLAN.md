# Native Package Refactoring Plan

## 1. DRY Violations → Trait-Based Solutions

### a) `cif/mod.rs` From/TryFrom implementations (lines 145-322)

**Issue:** 10 repetitive `From<T>` and `TryFrom<&Value>` implementations.

**Solution:** These are already using standard traits correctly. The repetition is acceptable here since each primitive type genuinely needs its own conversion logic. No change needed.

---

### b) `IntegerKind` / `FloatKind` repetitive dispatch

**Issue:** 8-way match in `read_ptr`, `write_ptr`, `to_cif`, etc.

**Solution:** Use an associated type pattern with a sealed internal enum. Each variant becomes a unit struct implementing a common trait:

```rust
// In types/integer.rs
mod sealed {
    pub trait IntegerOps: Copy {
        const SIZE: usize;
        fn read_unaligned(ptr: *const u8) -> Self;
        fn write_unaligned(ptr: *mut u8, val: Self);
        fn to_f64(self) -> f64;
        fn from_f64(val: f64) -> Self;
    }
}

impl sealed::IntegerOps for u8 {
    const SIZE: usize = 1;
    fn read_unaligned(ptr: *const u8) -> Self { unsafe { ptr.cast::<Self>().read_unaligned() } }
    fn write_unaligned(ptr: *mut u8, val: Self) { unsafe { ptr.cast::<Self>().write_unaligned(val) } }
    fn to_f64(self) -> f64 { self as f64 }
    fn from_f64(val: f64) -> Self { val as Self }
}
// ... impl for i8, u16, i16, u32, i32, u64, i64
```

Then `IntegerKind` stores a type-erased function table or uses enum dispatch with generated methods via the trait impls. This keeps methods on `IntegerKind` but removes repetition.

---

### c) Ownership-based branching

**Issue:** Repeated pattern in `decode_cif`:
```rust
let obj = if self.ownership.is_full() { ... } else { ... };
```

**Solution:** Add methods to `Ownership` itself:

```rust
impl Ownership {
    pub fn decode_gobject(self, ptr: *mut GObject) -> glib::Object {
        match self {
            Ownership::Full => unsafe { glib::Object::from_glib_full(ptr) },
            Ownership::Borrowed => unsafe { glib::Object::from_glib_none(ptr) },
        }
    }

    pub fn decode_boxed(self, gtype: Option<glib::Type>, ptr: *mut c_void) -> Boxed {
        match self {
            Ownership::Full => Boxed::from_glib_full(gtype, ptr),
            Ownership::Borrowed => Boxed::from_glib_none(gtype, ptr),
        }
    }
}
```

This scopes the branching to `Ownership` where it belongs.

---

### d) `from_js_value` boilerplate

**Issue:** Every type module starts with:
```rust
let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
```

**Solution:** Implement a standard trait on `Handle<JsValue>`:

```rust
// In a prelude or common module
trait JsValueExt<'a> {
    fn as_object(self, cx: &mut impl Context<'a>) -> NeonResult<Handle<'a, JsObject>>;
    fn get_string_prop(self, cx: &mut impl Context<'a>, key: &str) -> NeonResult<String>;
    fn get_optional_string_prop(self, cx: &mut impl Context<'a>, key: &str) -> NeonResult<Option<String>>;
}

impl<'a> JsValueExt<'a> for Handle<'a, JsValue> {
    fn as_object(self, cx: &mut impl Context<'a>) -> NeonResult<Handle<'a, JsObject>> {
        self.downcast::<JsObject, _>(cx).or_throw(cx)
    }
    // ...
}
```

This extends the standard Neon type rather than creating floating utilities.

---

### e) Null pointer check pattern

**Issue:** Repeated `let Some(ptr) = cif_value.non_null_ptr(...)? else { return Ok(Value::Null) };`

**Solution:** This is fine—it's already a method on `cif::Value`. The pattern is idiomatic Rust. Could add:

```rust
impl cif::Value {
    pub fn decode_ptr_or_null<F>(
        &self,
        type_name: &str,
        decoder: F
    ) -> anyhow::Result<value::Value>
    where
        F: FnOnce(*mut c_void) -> anyhow::Result<value::Value>
    {
        match self.non_null_ptr(type_name)? {
            Some(ptr) => decoder(ptr),
            None => Ok(value::Value::Null),
        }
    }
}
```

---

## 2. Non-idiomatic Rust

### a) `ManuallyDrop` for HashMaps (`state.rs:77,80`)

**Issue:** Unexplained `ManuallyDrop` usage.

**Solution:** Either document with a safety comment explaining why drop must be prevented, or remove if unnecessary. If it's for ensuring drop order with `app_hold_guard`, restructure:

```rust
pub struct GtkThreadState {
    pub app_hold_guard: Option<ApplicationHoldGuard>,
    // Fields dropped in declaration order - guard drops last
    pub handle_map: HashMap<usize, NativeValue>,
    pub libraries: HashMap<String, Library>,
    // ...
}
```

---

### b) Error conversion pattern

**Issue:** `cx.throw_type_error::<_, ()>(...).unwrap_err()`

**Solution:** Extend `FunctionContext` via trait:

```rust
trait FunctionContextExt<'a> {
    fn type_error(&mut self, msg: impl Into<String>) -> Throw;
}

impl<'a> FunctionContextExt<'a> for FunctionContext<'a> {
    fn type_error(&mut self, msg: impl Into<String>) -> Throw {
        self.throw_type_error::<_, ()>(msg.into()).unwrap_err()
    }
}
```

Usage: `IntegerKind::from_size_and_sign(...).ok_or_else(|| cx.type_error("Invalid size"))?`

---

### c) Unnecessary clone in `module/call.rs:120`

**Issue:** `args.clone().into_iter()`

**Solution:** Use `iter()` and clone individual items only when needed, or restructure to consume args:

```rust
let (cif_args, args): (Vec<_>, Vec<_>) = args
    .into_iter()
    .map(|arg| {
        let cif = cif::Value::try_from(arg.clone())?;
        Ok((cif, arg))
    })
    .collect::<anyhow::Result<Vec<_>>>()?
    .into_iter()
    .unzip();
```

---

### d) Unused `optional` parameter

**Issue:** `_optional: bool` in several `encode_cif` implementations.

**Solution:** The trait requires it. Either:
1. Use it consistently (all types should handle optional)
2. Split into `CifEncode` and `CifEncodeOptional` traits
3. Accept the unused param as trait contract cost

Option 3 is pragmatic—the trait defines the full contract.

---

### e) Non-exhaustive type dispatch

**Issue:** `_ => bail!(...)` in `module/call.rs:158-179`

**Solution:** Make exhaustive:

```rust
match result_type {
    Type::Undefined => { ... }
    Type::Integer(int_type) => { ... }
    Type::Float(float_type) => { ... }
    Type::String(_) => { ... }
    Type::Boolean => { ... }
    Type::GObject(_) | Type::Boxed(_) | Type::Struct(_) | Type::Fundamental(_) => { ... }
    Type::Array(_) | Type::HashTable(_) => { ... }
    Type::Null => { ... }
    Type::Callback(_) => bail!("Callbacks cannot be return types"),
    Type::Ref(_) => bail!("Ref types cannot be return types"),
}
```

---

## 3. Naming Standardization

### a) Field names: `ty` vs `type_` vs `lib` vs `library`

**Recommendation:**
- `type_name: String` for type name strings
- `gtype: Option<glib::Type>` for GLib type
- `library: String` for library names (use full word)

Apply to:
- `BoxedType`: `ty` → `type_name`, `lib` → `library`
- `StructType`: `ty` → `type_name`
- `Boxed`: `type_` → `gtype`

### b) File naming

Rename for consistency:
- `gobject.rs` → `gobject_type.rs` (matches `ref_type.rs`, `struct_type.rs`)

---

## 4. Module Restructuring

### a) Merge `managed_boxed.rs` + `managed_fundamental.rs` + relevant parts of `object.rs`

Create `managed/` directory:

```
managed/
├── mod.rs           // pub use, NativeValue enum
├── boxed.rs         // Boxed struct
├── fundamental.rs   // Fundamental struct
└── object_id.rs     // NativeHandle, From<NativeValue> for NativeHandle
```

`NativeValue` stays as enum in `mod.rs`:
```rust
pub enum NativeValue {
    GObject(glib::Object),
    Boxed(Boxed),
    Fundamental(Fundamental),
}
```

### b) Inline `cif/traits.rs` into `cif/mod.rs`

19 lines doesn't warrant separate file.

### c) Merge `callback_dispatch.rs` into `js_dispatch.rs`

Both handle JS callback execution. Rename to `js_dispatch.rs` with:
- `JsDispatcher` struct (current)
- `invoke_and_wait` as method on `JsDispatcher`
- `wait_for_result` as method on `JsDispatcher`

```rust
impl JsDispatcher {
    pub fn invoke_and_wait<T, F>(...) -> T { ... }
    fn wait_for_result<T, F>(...) -> T { ... }
}
```

### d) `types/callback.rs` split

```
types/
├── callback/
│   ├── mod.rs        // Callback value struct, CallbackType descriptor
│   └── trampoline.rs // CallbackTrampoline enum, encoding logic
```

---

## 5. Free Functions → Scoped Methods

### a) `gobject_from_gvalue` (`value/from_glib.rs:257`)

Move into `impl Value`:
```rust
impl Value {
    fn from_glib_gobject(gvalue: &glib::Value) -> anyhow::Result<Self> {
        // current gobject_from_gvalue body
    }
}
```

### b) `dispatch_batch` (`gtk_dispatch.rs:197`)

Make private method:
```rust
impl GtkDispatcher {
    fn dispatch_batch_callback() {
        dispatcher().drain_queue();
    }
}

// In schedule():
glib::idle_add_once(Self::dispatch_batch_callback);
```

### c) `callback_data_destroy` (`trampolines.rs:34`)

Make it a static method on `CallbackData`:
```rust
impl CallbackData {
    pub unsafe extern "C" fn release(user_data: *mut c_void) {
        // ...
    }
}
```

---

## 6. Domain Boundary Refinement

### a) `StructType` returning `NativeValue::Boxed`

**Issue:** Blurs struct vs boxed distinction.

**Options:**
1. Add `NativeValue::Struct(Boxed)` variant (wrapper to distinguish semantically)
2. Rename `Boxed` to `ManagedPtr` since it handles both
3. Accept that both are "heap-allocated C data with optional GType"

Option 2 is cleanest—`Boxed` is really a managed pointer with optional GType-based lifecycle:

```rust
pub struct ManagedPtr {
    ptr: *mut c_void,
    gtype: Option<glib::Type>,
    is_owned: bool,
}
```

### b) Type/Value/Cif coupling

Current structure is acceptable. The coupling exists because:
- `Type` describes what a value should be
- `Value` holds the actual data
- `cif::Value` is the FFI representation

The `CifEncode`/`CifDecode` traits on `Type` are appropriate since the type determines how to encode/decode.

---

## 7. Use Standard Traits

### Already using well:
- `From`/`Into` for conversions
- `TryFrom`/`TryInto` for fallible conversions
- `Display` for formatting
- `FromStr` for parsing
- `Clone`, `Copy`, `Debug` appropriately
- `Drop` for cleanup

### Could use more:

**a) `Default` for `Ownership`:**
```rust
impl Default for Ownership {
    fn default() -> Self { Ownership::Borrowed }
}
```

---

## Summary: Priority Actions

1. **Ownership methods** - Add `decode_gobject`, `decode_boxed`, `decode_fundamental` to `Ownership`
2. **Extension traits** - `JsValueExt`, `FunctionContextExt` for Neon types
3. **Module merge** - `managed/` directory, merge `callback_dispatch` into `js_dispatch`
4. **Inline** - `cif/traits.rs` into `cif/mod.rs`
5. **Rename fields** - Standardize `type_name`, `gtype`, `library`
6. **Scope free functions** - Move to relevant `impl` blocks
7. **Exhaustive matching** - Remove `_ =>` catch-all in type dispatch
8. **Document or remove `ManuallyDrop`**
