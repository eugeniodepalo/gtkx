# Implementation Plan: Generic Types Support for GTK Bindings

## Executive Summary

This plan details the implementation of full generic types support across the GTKX stack, enabling proper handling of `GHashTable<K, V>`, `GPtrArray<T>`, and `GArray<T>` with element types. The implementation spans four layers: GIR parsing, type normalization, TypeScript/FFI code generation, and Rust native marshalling.

---

## Phase 1: GIR Parser Layer

### 1.1 Extend RawType to Support Multiple Type Parameters

**File:** `packages/gir/src/internal/raw-types.ts`

Current state:
```typescript
export type RawType = {
    name: string;
    cType?: string;
    isArray?: boolean;
    elementType?: RawType;
    transferOwnership?: "none" | "full" | "container";
    nullable?: boolean;
};
```

Changes needed:
- Add `typeParameters?: RawType[]` to support multiple type arguments (for `GHashTable<K,V>`)
- Add `containerType?: "ghashtable" | "gptrarray" | "garray" | "glist" | "gslist"` to distinguish container kinds
- Keep `elementType` for backward compatibility (derived from first type parameter)

New type:
```typescript
export type RawType = {
    name: string;
    cType?: string;
    isArray?: boolean;
    elementType?: RawType;
    typeParameters?: RawType[];
    containerType?: "ghashtable" | "gptrarray" | "garray" | "glist" | "gslist";
    transferOwnership?: "none" | "full" | "container";
    nullable?: boolean;
};
```

**Dependencies:** None
**Testing:** Unit tests parsing GIR snippets with each container type

---

### 1.2 Update GIR Parser to Extract Type Parameters

**File:** `packages/gir/src/internal/parser.ts`

Current `parseType` method handles `GLib.List` and `GLib.SList` specially. Changes needed:

1. **Detect GHashTable**: When `typeName === "GLib.HashTable"`, extract the two nested `<type>` elements as key and value types
2. **Detect GPtrArray**: When `typeName === "GLib.PtrArray"` or the node is an `<array>` with `name="GLib.PtrArray"`, extract the single nested type
3. **Detect GArray**: When `typeName === "GLib.Array"` or array node, extract element type
4. **Preserve cType information**: The cType (e.g., `GHashTable*`, `GPtrArray*`) is critical for native layer decisions

Changes to `parseType`:
```typescript
private parseType(typeNode: Record<string, unknown> | undefined): RawType {
    if (!typeNode) {
        return { name: "void" };
    }

    const typeName = typeNode["@_name"] ? String(typeNode["@_name"]) : undefined;
    const cType = typeNode["@_c:type"] ? String(typeNode["@_c:type"]) : undefined;

    if (typeName === "GLib.HashTable") {
        const innerTypes = this.extractMultipleTypes(typeNode);
        return {
            name: "GLib.HashTable",
            cType,
            containerType: "ghashtable",
            typeParameters: innerTypes.length >= 2 ? innerTypes : undefined,
        };
    }

    if (typeName === "GLib.PtrArray") {
        const innerType = this.parseInnerType(typeNode);
        return {
            name: "GLib.PtrArray",
            cType,
            containerType: "gptrarray",
            typeParameters: innerType ? [innerType] : undefined,
            elementType: innerType,
        };
    }

    if (typeName === "GLib.Array") {
        const innerType = this.parseInnerType(typeNode);
        return {
            name: "GLib.Array",
            cType,
            containerType: "garray",
            typeParameters: innerType ? [innerType] : undefined,
            elementType: innerType,
        };
    }

    if (typeName === "GLib.List" || typeName === "GLib.SList") {
        const innerType = this.parseInnerType(typeNode);
        return {
            name: "array",
            cType,
            isArray: true,
            containerType: typeName === "GLib.List" ? "glist" : "gslist",
            elementType: innerType,
        };
    }

    // ... rest of existing logic
}

private extractMultipleTypes(typeNode: Record<string, unknown>): RawType[] {
    const types: RawType[] = [];
    const typeChildren = typeNode.type;
    if (Array.isArray(typeChildren)) {
        for (const child of typeChildren) {
            types.push(this.parseType(child as Record<string, unknown>));
        }
    } else if (typeChildren) {
        types.push(this.parseType(typeChildren as Record<string, unknown>));
    }
    return types;
}

private parseInnerType(typeNode: Record<string, unknown>): RawType | undefined {
    const inner = typeNode.type ?? typeNode.array;
    return inner ? this.parseType(inner as Record<string, unknown>) : undefined;
}
```

**Dependencies:** Phase 1.1
**Testing:**
- Parse Gio-2.0.gir GHashTable declarations
- Parse AppStream-1.0.gir GPtrArray declarations
- Parse Atspi-2.0.gir GArray declarations
- Verify key/value types extracted correctly

---

## Phase 2: Type Normalization Layer

### 2.1 Extend NormalizedType for Generics

**File:** `packages/gir/src/types.ts`

Current state:
```typescript
export class NormalizedType {
    readonly name: QualifiedName | string;
    readonly cType?: string;
    readonly isArray: boolean;
    readonly elementType: NormalizedType | null;
    readonly transferOwnership?: "none" | "full" | "container";
    readonly nullable: boolean;
}
```

Changes needed:
- Add `typeParameters: NormalizedType[]` for ordered type arguments
- Add `containerType?: ContainerType` enum
- Add helper methods for working with generics

New additions:
```typescript
export type ContainerType = "ghashtable" | "gptrarray" | "garray" | "glist" | "gslist";

export class NormalizedType {
    readonly name: QualifiedName | string;
    readonly cType?: string;
    readonly isArray: boolean;
    readonly elementType: NormalizedType | null;
    readonly typeParameters: NormalizedType[];
    readonly containerType?: ContainerType;
    readonly transferOwnership?: "none" | "full" | "container";
    readonly nullable: boolean;

    isHashTable(): boolean {
        return this.containerType === "ghashtable";
    }

    isPtrArray(): boolean {
        return this.containerType === "gptrarray";
    }

    isGArray(): boolean {
        return this.containerType === "garray";
    }

    isList(): boolean {
        return this.containerType === "glist" || this.containerType === "gslist";
    }

    isGenericContainer(): boolean {
        return this.containerType !== undefined;
    }

    getKeyType(): NormalizedType | null {
        return this.isHashTable() && this.typeParameters.length >= 1
            ? this.typeParameters[0]
            : null;
    }

    getValueType(): NormalizedType | null {
        return this.isHashTable() && this.typeParameters.length >= 2
            ? this.typeParameters[1]
            : null;
    }
}
```

**Dependencies:** Phase 1.1
**Testing:** Unit tests for helper methods

---

### 2.2 Update Normalizer for Generics

**File:** `packages/gir/src/internal/normalizer.ts`

Update `normalizeType` to handle new container types and type parameters:

```typescript
const normalizeType = (raw: RawType, currentNamespace: string, ctx: NormalizerContext): NormalizedType => {
    if (raw.containerType === "ghashtable") {
        const typeParams = (raw.typeParameters ?? []).map(
            tp => normalizeType(tp, currentNamespace, ctx)
        );
        return new NormalizedType({
            name: "GLib.HashTable" as QualifiedName,
            cType: raw.cType,
            isArray: false,
            elementType: null,
            typeParameters: typeParams,
            containerType: "ghashtable",
            transferOwnership: raw.transferOwnership,
            nullable: raw.nullable ?? false,
        });
    }

    if (raw.containerType === "gptrarray") {
        const typeParams = (raw.typeParameters ?? []).map(
            tp => normalizeType(tp, currentNamespace, ctx)
        );
        return new NormalizedType({
            name: "GLib.PtrArray" as QualifiedName,
            cType: raw.cType,
            isArray: false,
            elementType: typeParams[0] ?? null,
            typeParameters: typeParams,
            containerType: "gptrarray",
            transferOwnership: raw.transferOwnership,
            nullable: raw.nullable ?? false,
        });
    }

    if (raw.containerType === "garray") {
        const typeParams = (raw.typeParameters ?? []).map(
            tp => normalizeType(tp, currentNamespace, ctx)
        );
        return new NormalizedType({
            name: "GLib.Array" as QualifiedName,
            cType: raw.cType,
            isArray: false,
            elementType: typeParams[0] ?? null,
            typeParameters: typeParams,
            containerType: "garray",
            transferOwnership: raw.transferOwnership,
            nullable: raw.nullable ?? false,
        });
    }

    const isArray = raw.isArray === true || raw.name === "array";
    if (isArray && raw.elementType) {
        return new NormalizedType({
            name: "array",
            cType: raw.cType,
            isArray: true,
            elementType: normalizeType(raw.elementType, currentNamespace, ctx),
            typeParameters: [],
            containerType: raw.containerType,
            transferOwnership: raw.transferOwnership,
            nullable: raw.nullable ?? false,
        });
    }

    // ... rest of existing logic, ensuring typeParameters: [] for non-generic types
};
```

**Dependencies:** Phase 2.1
**Testing:** Integration tests normalizing full namespaces

---

## Phase 3: FFI Code Generation Layer

### 3.1 Extend FFI Type Descriptors

**File:** `packages/codegen/src/core/type-system/ffi-types.ts`

Add new FFI type descriptors for hash tables:

```typescript
export type FfiTypeDescriptor = {
    type: string;
    size?: number;
    unsigned?: boolean;
    ownership?: "full" | "none";
    innerType?: FfiTypeDescriptor | string;
    lib?: string;
    getTypeFn?: string;
    itemType?: FfiTypeDescriptor;
    keyType?: FfiTypeDescriptor;
    valueType?: FfiTypeDescriptor;
    listType?: "array" | "glist" | "gslist" | "gptrarray" | "garray" | "ghashtable";
    elementSize?: number;
};

export const hashTableType = (
    keyType: FfiTypeDescriptor,
    valueType: FfiTypeDescriptor,
    transferFull: boolean,
): FfiTypeDescriptor => ({
    type: "hashtable",
    keyType,
    valueType,
    listType: "ghashtable",
    ownership: transferFull ? "full" : "none",
});

export const ptrArrayType = (
    itemType: FfiTypeDescriptor,
    transferFull: boolean,
): FfiTypeDescriptor => ({
    type: "array",
    itemType,
    listType: "gptrarray",
    ownership: transferFull ? "full" : "none",
});

export const gArrayType = (
    itemType: FfiTypeDescriptor,
    elementSize: number,
    transferFull: boolean,
): FfiTypeDescriptor => ({
    type: "array",
    itemType,
    listType: "garray",
    elementSize,
    ownership: transferFull ? "full" : "none",
});
```

**Dependencies:** None
**Testing:** Unit tests for factory functions

---

### 3.2 Update FFI Mapper for Generics

**File:** `packages/codegen/src/core/type-system/ffi-mapper.ts`

Update `mapType` method to handle generic containers:

```typescript
mapType(type: NormalizedType, isReturn = false, parentTransferOwnership?: string): MappedType {
    const imports: TypeImport[] = [];

    if (type.isHashTable()) {
        const keyType = type.getKeyType();
        const valueType = type.getValueType();

        if (keyType && valueType) {
            const keyResult = this.mapType(keyType, isReturn, parentTransferOwnership);
            const valueResult = this.mapType(valueType, isReturn, parentTransferOwnership);
            imports.push(...keyResult.imports, ...valueResult.imports);

            return {
                ts: `Map<${keyResult.ts}, ${valueResult.ts}>`,
                ffi: hashTableType(keyResult.ffi, valueResult.ffi, !isReturn),
                imports,
            };
        }

        return {
            ts: "Map<unknown, unknown>",
            ffi: hashTableType(FFI_POINTER, FFI_POINTER, !isReturn),
            imports,
        };
    }

    if (type.isPtrArray()) {
        if (type.elementType) {
            const elementResult = this.mapType(type.elementType, isReturn, parentTransferOwnership);
            imports.push(...elementResult.imports);

            return {
                ts: `${elementResult.ts}[]`,
                ffi: ptrArrayType(elementResult.ffi, !isReturn),
                imports,
            };
        }

        return {
            ts: "unknown[]",
            ffi: ptrArrayType(FFI_POINTER, !isReturn),
            imports,
        };
    }

    if (type.isGArray()) {
        if (type.elementType) {
            const elementResult = this.mapType(type.elementType, isReturn, parentTransferOwnership);
            imports.push(...elementResult.imports);

            const elementSize = this.getElementSize(type.elementType);

            return {
                ts: `${elementResult.ts}[]`,
                ffi: gArrayType(elementResult.ffi, elementSize, !isReturn),
                imports,
            };
        }

        return {
            ts: "unknown[]",
            ffi: gArrayType(FFI_POINTER, 8, !isReturn),
            imports,
        };
    }

    if (type.isArray) {
        const listType = type.containerType === "glist" ? "glist"
            : type.containerType === "gslist" ? "gslist"
            : type.cType?.includes("GSList") ? "gslist"
            : type.cType?.includes("GList") ? "glist"
            : "array";

        // ... existing array mapping logic
    }

    // ... rest of existing implementation
}

private getElementSize(type: NormalizedType): number {
    if (type.isNumeric()) {
        const primitive = PRIMITIVE_TYPE_MAP.get(type.name as string);
        if (primitive?.ffi.size) {
            return primitive.ffi.size / 8;
        }
    }
    return 8;
}
```

**Dependencies:** Phases 2.1, 2.2, 3.1
**Testing:**
- Map `GHashTable<string, Widget>` to `Map<string, Widget>`
- Map `GPtrArray<string>` to `string[]`
- Map `GArray<gint32>` to `number[]` with `elementSize: 4`

---

### 3.3 Update TypeScript Type Definitions

**File:** `packages/native/types.ts`

Add new type definitions:

```typescript
type HashTableType = {
    type: "hashtable";
    keyType: Type;
    valueType: Type;
    listType: "ghashtable";
    ownership: Ownership;
};

type ArrayType = {
    type: "array";
    itemType: Type;
    listType: "array" | "glist" | "gslist" | "gptrarray" | "garray";
    ownership: Ownership;
    elementSize?: number;
};

export type Type =
    | IntegerType
    | FloatType
    | BooleanType
    | StringType
    | GObjectType
    | GParamType
    | BoxedType
    | StructType
    | GVariantType
    | ArrayType
    | HashTableType
    | RefType
    | CallbackType
    | NullType
    | UndefinedType;
```

**Dependencies:** None
**Testing:** Type checking during build

---

## Phase 4: Rust Native Layer

### 4.1 Add HashTable Type

**File:** `packages/native/src/types/hashtable.rs` (NEW)

```rust
use libffi::middle as ffi;
use neon::prelude::*;

use crate::types::Type;

#[derive(Debug, Clone)]
pub struct HashTableType {
    pub key_type: Box<Type>,
    pub value_type: Box<Type>,
    pub is_transfer_full: bool,
}

impl HashTableType {
    pub fn new(key_type: Type, value_type: Type, is_transfer_full: bool) -> Self {
        HashTableType {
            key_type: Box::new(key_type),
            value_type: Box::new(value_type),
            is_transfer_full,
        }
    }

    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;

        let key_type_value: Handle<'_, JsValue> = obj.prop(cx, "keyType").get()?;
        let key_type = Type::from_js_value(cx, key_type_value)?;

        let value_type_value: Handle<'_, JsValue> = obj.prop(cx, "valueType").get()?;
        let value_type = Type::from_js_value(cx, value_type_value)?;

        let ownership_prop: Handle<'_, JsValue> = obj.prop(cx, "ownership").get()?;
        let ownership = ownership_prop
            .downcast::<JsString, _>(cx)
            .or_else(|_| cx.throw_type_error("'ownership' required for hashtable"))?
            .value(cx);

        let is_transfer_full = match ownership.as_str() {
            "full" => true,
            "none" => false,
            _ => return cx.throw_type_error("'ownership' must be 'full' or 'none'"),
        };

        Ok(HashTableType {
            key_type: Box::new(key_type),
            value_type: Box::new(value_type),
            is_transfer_full,
        })
    }
}

impl From<&HashTableType> for ffi::Type {
    fn from(_value: &HashTableType) -> Self {
        ffi::Type::pointer()
    }
}
```

**Dependencies:** None
**Testing:** Unit tests for parsing and FFI type conversion

---

### 4.2 Extend ListType Enum

**File:** `packages/native/src/types/array.rs`

Update ListType enum:

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum ListType {
    Array,
    GList,
    GSList,
    GPtrArray,
    GArray,
}

#[derive(Debug, Clone)]
pub struct ArrayType {
    pub item_type: Box<Type>,
    pub list_type: ListType,
    pub is_transfer_full: bool,
    pub element_size: Option<usize>,
}

impl ArrayType {
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let item_type_value: Handle<'_, JsValue> = obj.prop(cx, "itemType").get()?;
        let item_type = Type::from_js_value(cx, item_type_value)?;

        let list_type_prop: Handle<'_, JsValue> = obj.prop(cx, "listType").get()?;
        let list_type_str = list_type_prop
            .downcast::<JsString, _>(cx)
            .or_else(|_| cx.throw_type_error("'listType' required for array types"))?
            .value(cx);

        let list_type = match list_type_str.as_str() {
            "array" => ListType::Array,
            "glist" => ListType::GList,
            "gslist" => ListType::GSList,
            "gptrarray" => ListType::GPtrArray,
            "garray" => ListType::GArray,
            _ => return cx.throw_type_error(
                "'listType' must be 'array', 'glist', 'gslist', 'gptrarray', or 'garray'"
            ),
        };

        let element_size: Option<usize> = if list_type == ListType::GArray {
            let size_prop: Option<Handle<JsNumber>> = obj.get_opt(cx, "elementSize")?;
            size_prop.map(|n| n.value(cx) as usize)
        } else {
            None
        };

        let ownership_prop: Handle<'_, JsValue> = obj.prop(cx, "ownership").get()?;
        let ownership = ownership_prop
            .downcast::<JsString, _>(cx)
            .or_else(|_| cx.throw_type_error("'ownership' required for array types"))?
            .value(cx);

        let is_transfer_full = match ownership.as_str() {
            "full" => true,
            "none" => false,
            _ => return cx.throw_type_error("'ownership' must be 'full' or 'none'"),
        };

        Ok(ArrayType {
            item_type: Box::new(item_type),
            list_type,
            is_transfer_full,
            element_size,
        })
    }
}
```

**Dependencies:** None
**Testing:** Unit tests for new list types

---

### 4.3 Update Type Enum

**File:** `packages/native/src/types.rs`

Add HashTable variant:

```rust
pub use hashtable::*;

mod hashtable;

#[derive(Debug, Clone)]
pub enum Type {
    Integer(IntegerType),
    Float(FloatType),
    String(StringType),
    Null,
    Undefined,
    Boolean,
    GObject(GObjectType),
    GParam(GParamType),
    Boxed(BoxedType),
    Struct(StructType),
    GVariant(GVariantType),
    Array(ArrayType),
    HashTable(HashTableType),
    Callback(CallbackType),
    Ref(RefType),
}

impl Type {
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let type_value: Handle<'_, JsValue> = obj.prop(cx, "type").get()?;
        let type_ = type_value
            .downcast::<JsString, _>(cx)
            .or_throw(cx)?
            .value(cx);

        match type_.as_str() {
            // ... existing cases ...
            "hashtable" => Ok(Type::HashTable(HashTableType::from_js_value(cx, value)?)),
            _ => cx.throw_type_error(format!("Unknown type: {}", type_)),
        }
    }
}

impl From<&Type> for ffi::Type {
    fn from(value: &Type) -> Self {
        match value {
            // ... existing cases ...
            Type::HashTable(type_) => type_.into(),
        }
    }
}
```

**Dependencies:** Phase 4.1
**Testing:** Type parsing tests

---

### 4.4 Update Value Conversion for Hash Tables

**File:** `packages/native/src/value.rs`

Add hash table handling in `from_cif_value`:

```rust
Type::HashTable(hash_type) => {
    let hash_ptr = match cif_value {
        cif::Value::Ptr(ptr) => *ptr,
        _ => bail!("Expected pointer for GHashTable, got {:?}", cif_value),
    };

    if hash_ptr.is_null() {
        return Ok(Value::Null);
    }

    let hash_table = hash_ptr as *mut glib::ffi::GHashTable;
    let mut entries = Vec::new();

    unsafe {
        let mut iter: glib::ffi::GHashTableIter = std::mem::zeroed();
        glib::ffi::g_hash_table_iter_init(&mut iter, hash_table);

        let mut key: *mut c_void = std::ptr::null_mut();
        let mut value: *mut c_void = std::ptr::null_mut();

        while glib::ffi::g_hash_table_iter_next(
            &mut iter,
            &mut key as *mut *mut c_void as *mut glib::ffi::gpointer,
            &mut value as *mut *mut c_void as *mut glib::ffi::gpointer,
        ) != 0 {
            let key_value = convert_hash_entry(key, &hash_type.key_type)?;
            let value_value = convert_hash_entry(value, &hash_type.value_type)?;
            entries.push((key_value, value_value));
        }
    }

    if hash_type.is_transfer_full {
        unsafe {
            glib::ffi::g_hash_table_unref(hash_table);
        }
    }

    Ok(Value::Array(
        entries.into_iter()
            .map(|(k, v)| Value::Array(vec![k, v]))
            .collect()
    ))
}
```

Add GPtrArray handling:

```rust
if array_type.list_type == ListType::GPtrArray {
    let ptr_array_ptr = match cif_value {
        cif::Value::Ptr(ptr) => *ptr,
        _ => bail!("Expected pointer for GPtrArray, got {:?}", cif_value),
    };

    if ptr_array_ptr.is_null() {
        return Ok(Value::Array(vec![]));
    }

    let ptr_array = ptr_array_ptr as *mut glib::ffi::GPtrArray;
    let len = unsafe { (*ptr_array).len } as usize;
    let pdata = unsafe { (*ptr_array).pdata };

    let mut values = Vec::with_capacity(len);
    for i in 0..len {
        let item_ptr = unsafe { *pdata.add(i) };
        let item_value = convert_ptr_array_item(item_ptr, &array_type.item_type)?;
        values.push(item_value);
    }

    if array_type.is_transfer_full {
        unsafe {
            glib::ffi::g_ptr_array_unref(ptr_array);
        }
    }

    return Ok(Value::Array(values));
}
```

Add GArray handling:

```rust
if array_type.list_type == ListType::GArray {
    let g_array_ptr = match cif_value {
        cif::Value::Ptr(ptr) => *ptr,
        _ => bail!("Expected pointer for GArray, got {:?}", cif_value),
    };

    if g_array_ptr.is_null() {
        return Ok(Value::Array(vec![]));
    }

    let g_array = g_array_ptr as *mut glib::ffi::GArray;
    let len = unsafe { (*g_array).len } as usize;
    let data = unsafe { (*g_array).data };
    let element_size = array_type.element_size.unwrap_or(
        get_element_size(&array_type.item_type)
    );

    let mut values = Vec::with_capacity(len);
    for i in 0..len {
        let item_ptr = unsafe { data.add(i * element_size) };
        let item_value = convert_garray_item(item_ptr, element_size, &array_type.item_type)?;
        values.push(item_value);
    }

    if array_type.is_transfer_full {
        unsafe {
            glib::ffi::g_array_unref(g_array);
        }
    }

    return Ok(Value::Array(values));
}
```

**Dependencies:** Phases 4.1, 4.2, 4.3
**Testing:**
- Test `GHashTable<string, string>` round-trip
- Test `GPtrArray<Widget>` conversion
- Test `GArray<gint32>` conversion

---

### 4.5 Update Value to CIF Conversion

Add hash table input handling for function arguments:

```rust
fn value_to_cif_hashtable(
    value: &Value,
    hash_type: &HashTableType,
) -> anyhow::Result<*mut c_void> {
    let entries = match value {
        Value::Array(arr) => arr,
        _ => bail!("Expected array of [key, value] pairs for hash table"),
    };

    let (hash_func, equal_func) = get_hash_funcs(&hash_type.key_type);
    let hash_table = unsafe {
        glib::ffi::g_hash_table_new(hash_func, equal_func)
    };

    for entry in entries {
        if let Value::Array(pair) = entry {
            if pair.len() >= 2 {
                let key_ptr = value_to_ptr(&pair[0], &hash_type.key_type)?;
                let value_ptr = value_to_ptr(&pair[1], &hash_type.value_type)?;
                unsafe {
                    glib::ffi::g_hash_table_insert(hash_table, key_ptr, value_ptr);
                }
            }
        }
    }

    Ok(hash_table as *mut c_void)
}

fn get_hash_funcs(key_type: &Type) -> (
    Option<unsafe extern "C" fn(*const c_void) -> u32>,
    Option<unsafe extern "C" fn(*const c_void, *const c_void) -> i32>,
) {
    match key_type {
        Type::String(_) => (
            Some(glib::ffi::g_str_hash as _),
            Some(glib::ffi::g_str_equal as _),
        ),
        Type::Integer(_) => (
            Some(glib::ffi::g_direct_hash as _),
            Some(glib::ffi::g_direct_equal as _),
        ),
        _ => (None, None),
    }
}
```

**Dependencies:** Phase 4.4
**Testing:** Test passing Map to GTK functions

---

## Phase 5: Integration and Testing

### 5.1 End-to-End Tests

**File:** `packages/native/tests/call/hashtable.test.ts` (NEW)

```typescript
describe("GHashTable FFI calls", () => {
    it("should receive GHashTable<string, string> as Map", async () => {
        // Test with a GTK function returning hash table
    });

    it("should pass Map<string, GObject> as GHashTable", async () => {
        // Test passing hash table to GTK function
    });
});
```

**File:** `packages/native/tests/call/gptrarray.test.ts` (NEW)

```typescript
describe("GPtrArray FFI calls", () => {
    it("should receive GPtrArray<Widget> as Widget[]", async () => {
        // Test receiving pointer array
    });
});
```

**File:** `packages/native/tests/call/garray.test.ts` (NEW)

```typescript
describe("GArray FFI calls", () => {
    it("should receive GArray<gint32> as number[]", async () => {
        // Test receiving typed array
    });
});
```

### 5.2 Code Generation Tests

Add tests in codegen package to verify generated bindings:

- Verify `Map<K, V>` types generated for hash table parameters
- Verify array types for GPtrArray/GArray
- Verify FFI descriptors have correct structure

---

## Dependency Graph

```
Phase 1.1 ────→ Phase 1.2
    │              │
    ↓              ↓
Phase 2.1 ────→ Phase 2.2
    │              │
    ↓              ↓
Phase 3.1 ────→ Phase 3.2 ────→ Phase 3.3
    │              │
    ↓              ↓
Phase 4.1 ────→ Phase 4.2 ────→ Phase 4.3 ────→ Phase 4.4 ────→ Phase 4.5
                                                    │
                                                    ↓
                                              Phase 5 (Tests)
```

---

## DRY Analysis

### Existing Code to Reuse

1. **`arrayType` factory function** in ffi-types.ts - extend rather than duplicate
2. **ListType enum** in Rust - extend rather than create new enum
3. **Value conversion patterns** in value.rs - follow established patterns
4. **GListGuard RAII pattern** - adapt for GPtrArray/GArray

### New Abstractions Needed

1. **ContainerType** union in NormalizedType
2. **HashTableType** in Rust types
3. **Hash function selector** utility for different key types

### Potential Duplication Risks

- GList/GSList/GPtrArray/GArray iteration patterns are similar - consider extracting common iterator wrapper
- Key/value conversion logic similar to array element conversion - share via helper functions

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| JS type for GHashTable | `Map<K, V>` | Supports non-string keys, maintains insertion order |
| Hash table return format | `[[k,v], ...]` pairs | Easy Map construction in JS |
| Separate HashTableType vs extending ArrayType | Separate type | Fundamentally different structure (key+value vs single element) |
| Element size handling | Optional field + runtime derivation | Flexibility for GIR gaps |

---

## Edge Cases and Error Handling

1. **Empty containers**: Return empty Map/array, not null
2. **Null container pointer**: Return null (nullable) or empty (non-nullable)
3. **Missing type parameters**: Fall back to `unknown` types with warnings in debug mode
4. **Unsupported key types**: Throw descriptive error at code generation time
5. **Memory ownership on error**: Use RAII guards for all container pointers
6. **Nested containers**: `GHashTable<string, GList<Widget>>` - recursively apply type mapping

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| GIR files inconsistent | Medium | Medium | Extensive parsing tests across multiple GIR files |
| Memory leaks in hash tables | Medium | High | RAII guards, comprehensive ownership tests |
| Performance regression | Low | Medium | Benchmark common operations before/after |
| Breaking existing code | Low | High | All changes additive, existing array handling preserved |

---

## Success Criteria

1. `pnpm codegen` generates `Map<K, V>` types for all GHashTable parameters/returns
2. All existing tests pass without modification
3. New hash table round-trip tests pass
4. GPtrArray and GArray work with element types
5. No memory leaks in hash table/array conversion (verified via Valgrind)
6. TypeScript compiler accepts generated bindings without errors
