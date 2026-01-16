use std::ffi::{CString, c_void};

use anyhow::bail;
use gtk4::glib;
use libffi::middle as libffi;
use neon::prelude::*;

use super::Ownership;
use crate::ffi::{FfiStorage, FfiStorageKind, HashTableData, HashTableStorage};
use crate::types::Type;
use crate::{ffi, value};

trait HashTableEncoder {
    fn hash_func() -> glib::ffi::GHashFunc {
        None
    }

    fn equal_func() -> glib::ffi::GEqualFunc {
        None
    }

    fn free_func() -> glib::ffi::GDestroyNotify;
    fn encode(value: &value::Value) -> anyhow::Result<(*mut c_void, HashTableStorage)>;
}

struct StringEncoder;

impl HashTableEncoder for StringEncoder {
    fn hash_func() -> glib::ffi::GHashFunc {
        Some(glib::ffi::g_str_hash)
    }

    fn equal_func() -> glib::ffi::GEqualFunc {
        Some(glib::ffi::g_str_equal)
    }

    fn free_func() -> glib::ffi::GDestroyNotify {
        Some(glib::ffi::g_free)
    }

    fn encode(val: &value::Value) -> anyhow::Result<(*mut c_void, HashTableStorage)> {
        let s = match val {
            value::Value::String(s) => s,
            _ => bail!("Expected string in GHashTable, got {:?}", val),
        };
        let cstr = CString::new(s.as_bytes())?;
        // SAFETY: g_strdup creates a copy of the C string
        let ptr = unsafe { glib::ffi::g_strdup(cstr.as_ptr()) };
        Ok((ptr as *mut c_void, HashTableStorage::Strings(vec![cstr])))
    }
}

struct IntEncoder;

impl HashTableEncoder for IntEncoder {
    fn hash_func() -> glib::ffi::GHashFunc {
        Some(glib::ffi::g_direct_hash)
    }

    fn equal_func() -> glib::ffi::GEqualFunc {
        Some(glib::ffi::g_direct_equal)
    }

    fn free_func() -> glib::ffi::GDestroyNotify {
        None
    }

    fn encode(val: &value::Value) -> anyhow::Result<(*mut c_void, HashTableStorage)> {
        match val {
            value::Value::Number(n) => Ok((*n as isize as *mut c_void, HashTableStorage::Integers)),
            _ => bail!("Expected number in GHashTable, got {:?}", val),
        }
    }
}

struct NativeHandleEncoder;

impl HashTableEncoder for NativeHandleEncoder {
    fn hash_func() -> glib::ffi::GHashFunc {
        Some(glib::ffi::g_direct_hash)
    }

    fn equal_func() -> glib::ffi::GEqualFunc {
        Some(glib::ffi::g_direct_equal)
    }

    fn free_func() -> glib::ffi::GDestroyNotify {
        None
    }

    fn encode(val: &value::Value) -> anyhow::Result<(*mut c_void, HashTableStorage)> {
        match val {
            value::Value::Object(handle) => {
                let ptr = handle.get_ptr().ok_or_else(|| {
                    anyhow::anyhow!("Native object in GHashTable has been garbage collected")
                })?;
                Ok((ptr, HashTableStorage::NativeHandles))
            }
            value::Value::Null | value::Value::Undefined => {
                Ok((std::ptr::null_mut(), HashTableStorage::NativeHandles))
            }
            _ => bail!("Expected native object in GHashTable, got {:?}", val),
        }
    }
}

#[derive(Debug, Clone)]
pub struct HashTableType {
    pub key_type: Box<Type>,
    pub value_type: Box<Type>,
    pub ownership: Ownership,
}

impl HashTableType {
    pub fn new(key_type: Type, value_type: Type, ownership: Ownership) -> Self {
        HashTableType {
            key_type: Box::new(key_type),
            value_type: Box::new(value_type),
            ownership,
        }
    }

    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;

        let key_type_value: Handle<'_, JsValue> = obj.prop(cx, "keyType").get()?;
        let key_type = Type::from_js_value(cx, key_type_value)?;

        let value_type_value: Handle<'_, JsValue> = obj.prop(cx, "valueType").get()?;
        let value_type = Type::from_js_value(cx, value_type_value)?;

        let ownership = Ownership::from_js_value(cx, obj, "hashtable")?;

        Ok(HashTableType {
            key_type: Box::new(key_type),
            value_type: Box::new(value_type),
            ownership,
        })
    }

    fn tuple(value: &value::Value) -> anyhow::Result<(&value::Value, &value::Value)> {
        match value {
            value::Value::Array(arr) if arr.len() == 2 => Ok((&arr[0], &arr[1])),
            _ => bail!("Expected [key, value] tuple in GHashTable, got {:?}", value),
        }
    }

    fn encode_hashtable<K, V>(tuples: &[value::Value]) -> anyhow::Result<ffi::FfiValue>
    where
        K: HashTableEncoder,
        V: HashTableEncoder,
    {
        // SAFETY: Creating a new GHashTable with proper hash/equal/free functions
        let hash_table = unsafe {
            glib::ffi::g_hash_table_new_full(
                K::hash_func(),
                K::equal_func(),
                K::free_func(),
                V::free_func(),
            )
        };

        let mut key_storage = HashTableStorage::Integers;
        let mut val_storage = HashTableStorage::Integers;

        for tuple in tuples {
            let (key, val) = Self::tuple(tuple)?;
            let (key_ptr, ks) = K::encode(key)?;
            let (val_ptr, vs) = V::encode(val)?;
            key_storage = ks;
            val_storage = vs;

            unsafe {
                glib::ffi::g_hash_table_insert(hash_table, key_ptr, val_ptr);
            }
        }

        Ok(ffi::FfiValue::Storage(FfiStorage::new(
            hash_table as *mut c_void,
            FfiStorageKind::HashTable(HashTableData {
                handle: hash_table,
                keys: key_storage,
                values: val_storage,
            }),
        )))
    }
}

impl From<&HashTableType> for libffi::Type {
    fn from(_value: &HashTableType) -> Self {
        libffi::Type::pointer()
    }
}

impl ffi::FfiEncode for HashTableType {
    fn encode(&self, val: &value::Value, optional: bool) -> anyhow::Result<ffi::FfiValue> {
        let tuples = match val {
            value::Value::Array(arr) => arr,
            value::Value::Null | value::Value::Undefined if optional => {
                return Ok(ffi::FfiValue::Ptr(std::ptr::null_mut()));
            }
            _ => bail!(
                "Expected an Array of tuples for GHashTable type, got {:?}",
                val
            ),
        };

        match (&*self.key_type, &*self.value_type) {
            (Type::String(_), Type::String(_)) => {
                Self::encode_hashtable::<StringEncoder, StringEncoder>(tuples)
            }
            (Type::Integer(_), Type::Integer(_)) => {
                Self::encode_hashtable::<IntEncoder, IntEncoder>(tuples)
            }
            (Type::String(_), Type::Integer(_)) => {
                Self::encode_hashtable::<StringEncoder, IntEncoder>(tuples)
            }
            (Type::Integer(_), Type::String(_)) => {
                Self::encode_hashtable::<IntEncoder, StringEncoder>(tuples)
            }
            (
                Type::String(_),
                Type::GObject(_) | Type::Boxed(_) | Type::Struct(_) | Type::Fundamental(_),
            ) => Self::encode_hashtable::<StringEncoder, NativeHandleEncoder>(tuples),
            (
                Type::Integer(_),
                Type::GObject(_) | Type::Boxed(_) | Type::Struct(_) | Type::Fundamental(_),
            ) => Self::encode_hashtable::<IntEncoder, NativeHandleEncoder>(tuples),
            _ => bail!(
                "Unsupported GHashTable key/value types: {:?}/{:?}",
                self.key_type,
                self.value_type
            ),
        }
    }
}

impl ffi::FfiDecode for HashTableType {
    fn decode(&self, ffi_value: &ffi::FfiValue) -> anyhow::Result<value::Value> {
        let Some(hash_ptr) = ffi_value.as_non_null_ptr("GHashTable")? else {
            return Ok(value::Value::Array(vec![]));
        };

        let mut pairs: Vec<value::Value> = Vec::new();

        unsafe {
            let mut iter = std::mem::MaybeUninit::<glib::ffi::GHashTableIter>::uninit();
            glib::ffi::g_hash_table_iter_init(
                iter.as_mut_ptr(),
                hash_ptr as *mut glib::ffi::GHashTable,
            );

            let mut key_ptr: *mut c_void = std::ptr::null_mut();
            let mut value_ptr: *mut c_void = std::ptr::null_mut();

            while glib::ffi::g_hash_table_iter_next(
                iter.as_mut_ptr(),
                &mut key_ptr as *mut _,
                &mut value_ptr as *mut _,
            ) != 0
            {
                let key_value = self.key_type.ptr_to_value(key_ptr, "hash table key")?;
                let val_value = self
                    .value_type
                    .ptr_to_value(value_ptr, "hash table value")?;
                pairs.push(value::Value::Array(vec![key_value, val_value]));
            }
        }

        if self.ownership.is_full() {
            unsafe { glib::ffi::g_hash_table_unref(hash_ptr as *mut glib::ffi::GHashTable) };
        }

        Ok(value::Value::Array(pairs))
    }
}
