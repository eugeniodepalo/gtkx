mod common;

use std::ffi::c_void;

use gtk4::glib;
use gtk4::prelude::StaticType as _;

use native::NativeHandle;
use native::ffi::FfiValue;
use native::types::{
    ArrayKind, ArrayType, BooleanType, FloatKind, HashTableEntryEncoder, HashTableType,
    IntegerKind, Ownership, StringType, StructType, Type, VoidType,
};
use native::types::{FfiDecoder, FfiEncoder, RawPtrCodec};
use native::value::Value;

fn struct_type() -> Type {
    Type::Struct(StructType {
        ownership: Ownership::Borrowed,
        type_name: "TestStruct".to_string(),
        size: Some(size_of::<gtk4::gdk::ffi::GdkRGBA>()),
    })
}

fn gptrarray_type() -> Type {
    Type::Array(ArrayType {
        item_type: Box::new(struct_type()),
        kind: ArrayKind::GPtrArray,
        ownership: Ownership::Borrowed,
        element_size: None,
    })
}

fn boxed_handle() -> NativeHandle {
    let ptr = common::allocate_test_boxed(gtk4::gdk::RGBA::static_type());
    NativeHandle::borrowed(ptr)
}

#[test]
fn encoder_from_type_boolean() {
    let ty = Type::Boolean(BooleanType);
    let encoder = HashTableEntryEncoder::from_type(&ty);
    assert_eq!(encoder, Some(HashTableEntryEncoder::Boolean));
}

#[test]
fn encoder_from_type_float() {
    let ty = Type::Float(FloatKind::F64);
    let encoder = HashTableEntryEncoder::from_type(&ty);
    assert_eq!(encoder, Some(HashTableEntryEncoder::Float));
}

#[test]
fn encoder_from_type_integer() {
    let ty = Type::Integer(IntegerKind::I32);
    let encoder = HashTableEntryEncoder::from_type(&ty);
    assert_eq!(encoder, Some(HashTableEntryEncoder::Integer));
}

#[test]
fn encoder_from_type_string() {
    let ty = Type::String(StringType {
        ownership: Ownership::Borrowed,
        length: None,
    });
    let encoder = HashTableEntryEncoder::from_type(&ty);
    assert_eq!(encoder, Some(HashTableEntryEncoder::String));
}

#[test]
fn boolean_encoder_uses_direct_hash_and_equal() {
    let encoder = HashTableEntryEncoder::Boolean;

    assert!(encoder.hash_func().is_some());
    assert!(encoder.equal_func().is_some());
    assert!(encoder.free_func().is_none());
}

#[test]
fn float_encoder_uses_double_hash_and_equal() {
    let encoder = HashTableEntryEncoder::Float;

    assert!(encoder.hash_func().is_some());
    assert!(encoder.equal_func().is_some());
    assert!(encoder.free_func().is_some());
}

#[test]
fn encode_boolean_true() {
    let encoder = HashTableEntryEncoder::Boolean;
    let value = Value::Boolean(true);

    let ptr = encoder.encode(&value).expect("encoding should succeed");

    assert_eq!(ptr as isize, 1);
}

#[test]
fn encode_boolean_false() {
    let encoder = HashTableEntryEncoder::Boolean;
    let value = Value::Boolean(false);

    let ptr = encoder.encode(&value).expect("encoding should succeed");

    assert_eq!(ptr as isize, 0);
}

#[test]
fn encode_boolean_wrong_type_fails() {
    let encoder = HashTableEntryEncoder::Boolean;
    let value = Value::String("not a boolean".to_string());

    let result = encoder.encode(&value);

    assert!(result.is_err());
}

#[test]
fn encode_float_value() {
    let encoder = HashTableEntryEncoder::Float;
    let value = Value::Number(std::f64::consts::PI);

    let ptr = encoder.encode(&value).expect("encoding should succeed");

    let stored_value = unsafe {
        *ptr.cast::<f64>()
            .as_ref()
            .expect("encoded float pointer should be non-null")
    };
    assert!((stored_value - std::f64::consts::PI).abs() < f64::EPSILON);

    unsafe { glib::ffi::g_free(ptr) };
}

#[test]
fn encode_float_negative() {
    let encoder = HashTableEntryEncoder::Float;
    let value = Value::Number(-123.456);

    let ptr = encoder.encode(&value).expect("encoding should succeed");

    let stored_value = unsafe {
        *ptr.cast::<f64>()
            .as_ref()
            .expect("encoded float pointer should be non-null")
    };
    assert!((stored_value - (-123.456)).abs() < f64::EPSILON);

    unsafe { glib::ffi::g_free(ptr) };
}

#[test]
fn encode_float_wrong_type_fails() {
    let encoder = HashTableEntryEncoder::Float;
    let value = Value::Boolean(true);

    let result = encoder.encode(&value);

    assert!(result.is_err());
}

#[test]
fn ptr_to_value_boolean_true() {
    let ty = Type::Boolean(BooleanType);
    let ptr = std::ptr::dangling_mut::<c_void>();

    let value = ty
        .ptr_to_value(ptr, "test")
        .expect("decoding should succeed");

    match value {
        Value::Boolean(true) => (),
        other => panic!("Expected Boolean(true), got {other:?}"),
    }
}

#[test]
fn ptr_to_value_boolean_false() {
    let ty = Type::Boolean(BooleanType);
    let ptr = std::ptr::null_mut::<c_void>();

    let value = ty
        .ptr_to_value(ptr, "test")
        .expect("decoding should succeed");

    match value {
        Value::Boolean(false) => (),
        other => panic!("Expected Boolean(false), got {other:?}"),
    }
}

#[test]
fn ptr_to_value_boolean_nonzero_is_true() {
    let ty = Type::Boolean(BooleanType);
    let ptr = 42isize as *mut c_void;

    let value = ty
        .ptr_to_value(ptr, "test")
        .expect("decoding should succeed");

    match value {
        Value::Boolean(true) => (),
        other => panic!("Expected Boolean(true), got {other:?}"),
    }
}

#[test]
fn ptr_to_value_float() {
    let ty = Type::Float(FloatKind::F64);
    let float_val: f64 = std::f64::consts::E;
    let ptr = unsafe {
        let mem = glib::ffi::g_malloc(std::mem::size_of::<f64>()) as *mut f64;
        *mem = float_val;
        mem as *mut c_void
    };

    let value = ty
        .ptr_to_value(ptr, "test")
        .expect("decoding should succeed");

    match value {
        Value::Number(n) => assert!((n - std::f64::consts::E).abs() < f64::EPSILON),
        other => panic!("Expected Number, got {other:?}"),
    }

    unsafe { glib::ffi::g_free(ptr) };
}

#[test]
fn ptr_to_value_struct_null() {
    let ty = Type::Struct(StructType {
        ownership: Ownership::Borrowed,
        type_name: "TestStruct".to_string(),
        size: Some(16),
    });

    let value = ty
        .ptr_to_value(std::ptr::null_mut(), "test")
        .expect("decoding should succeed");

    match value {
        Value::Null => (),
        other => panic!("Expected Null, got {other:?}"),
    }
}

#[test]
fn ptr_to_value_struct_non_null() {
    common::ensure_gtk_init();

    let ty = Type::Struct(StructType {
        ownership: Ownership::Borrowed,
        type_name: "TestStruct".to_string(),
        size: Some(16),
    });

    let ptr = unsafe { glib::ffi::g_malloc0(16) };

    let value = ty
        .ptr_to_value(ptr, "test")
        .expect("decoding should succeed");

    match value {
        Value::Object(_) => (),
        other => panic!("Expected Object, got {other:?}"),
    }

    unsafe { glib::ffi::g_free(ptr) };
}

#[test]
fn hashtable_encode_decode_booleans() {
    common::ensure_gtk_init();

    let key_type = Type::Boolean(BooleanType);
    let value_type = Type::Boolean(BooleanType);
    let ht_type = HashTableType {
        key_type: Box::new(key_type),
        value_type: Box::new(value_type),
        ownership: Ownership::Full,
    };

    let input = Value::Array(vec![
        Value::Array(vec![Value::Boolean(true), Value::Boolean(false)]),
        Value::Array(vec![Value::Boolean(false), Value::Boolean(true)]),
    ]);

    let encoded = ht_type
        .encode(&input, false)
        .expect("encoding should succeed");
    let decoded = ht_type.decode(&encoded).expect("decoding should succeed");

    match decoded {
        Value::Array(pairs) => {
            assert_eq!(pairs.len(), 2);
            for pair in pairs {
                match pair {
                    Value::Array(kv) => {
                        assert_eq!(kv.len(), 2);
                        assert!(matches!(kv[0], Value::Boolean(_)));
                        assert!(matches!(kv[1], Value::Boolean(_)));
                    }
                    _ => panic!("Expected array pair"),
                }
            }
        }
        _ => panic!("Expected array"),
    }
}

#[test]
fn hashtable_encode_decode_floats() {
    common::ensure_gtk_init();

    let key_type = Type::Integer(IntegerKind::I32);
    let value_type = Type::Float(FloatKind::F64);
    let ht_type = HashTableType {
        key_type: Box::new(key_type),
        value_type: Box::new(value_type),
        ownership: Ownership::Full,
    };

    let input = Value::Array(vec![
        Value::Array(vec![
            Value::Number(1.0),
            Value::Number(std::f64::consts::PI),
        ]),
        Value::Array(vec![Value::Number(2.0), Value::Number(std::f64::consts::E)]),
    ]);

    let encoded = ht_type
        .encode(&input, false)
        .expect("encoding should succeed");
    let decoded = ht_type.decode(&encoded).expect("decoding should succeed");

    match decoded {
        Value::Array(pairs) => {
            assert_eq!(pairs.len(), 2);
            for pair in pairs {
                match pair {
                    Value::Array(kv) => {
                        assert_eq!(kv.len(), 2);
                        assert!(matches!(kv[0], Value::Number(_)));
                        assert!(matches!(kv[1], Value::Number(_)));
                    }
                    _ => panic!("Expected array pair"),
                }
            }
        }
        _ => panic!("Expected array"),
    }
}

#[test]
fn hashtable_encode_decode_string_to_boolean() {
    common::ensure_gtk_init();

    let key_type = Type::String(StringType {
        ownership: Ownership::Borrowed,
        length: None,
    });
    let value_type = Type::Boolean(BooleanType);
    let ht_type = HashTableType {
        key_type: Box::new(key_type),
        value_type: Box::new(value_type),
        ownership: Ownership::Full,
    };

    let input = Value::Array(vec![
        Value::Array(vec![
            Value::String("enabled".to_string()),
            Value::Boolean(true),
        ]),
        Value::Array(vec![
            Value::String("disabled".to_string()),
            Value::Boolean(false),
        ]),
    ]);

    let encoded = ht_type
        .encode(&input, false)
        .expect("encoding should succeed");
    let decoded = ht_type.decode(&encoded).expect("decoding should succeed");

    match decoded {
        Value::Array(pairs) => {
            assert_eq!(pairs.len(), 2);
            for pair in pairs {
                match pair {
                    Value::Array(kv) => {
                        assert_eq!(kv.len(), 2);
                        assert!(matches!(kv[0], Value::String(_)));
                        assert!(matches!(kv[1], Value::Boolean(_)));
                    }
                    _ => panic!("Expected array pair"),
                }
            }
        }
        _ => panic!("Expected array"),
    }
}

#[test]
fn hashtable_encode_decode_float_keys() {
    common::ensure_gtk_init();

    let key_type = Type::Float(FloatKind::F64);
    let value_type = Type::Integer(IntegerKind::I32);
    let ht_type = HashTableType {
        key_type: Box::new(key_type),
        value_type: Box::new(value_type),
        ownership: Ownership::Full,
    };

    let input = Value::Array(vec![
        Value::Array(vec![Value::Number(1.5), Value::Number(100.0)]),
        Value::Array(vec![Value::Number(2.5), Value::Number(200.0)]),
    ]);

    let encoded = ht_type
        .encode(&input, false)
        .expect("encoding should succeed");
    let decoded = ht_type.decode(&encoded).expect("decoding should succeed");

    match decoded {
        Value::Array(pairs) => {
            assert_eq!(pairs.len(), 2);
        }
        _ => panic!("Expected array"),
    }
}

#[test]
fn hashtable_empty() {
    common::ensure_gtk_init();

    let key_type = Type::Boolean(BooleanType);
    let value_type = Type::Boolean(BooleanType);
    let ht_type = HashTableType {
        key_type: Box::new(key_type),
        value_type: Box::new(value_type),
        ownership: Ownership::Full,
    };

    let input = Value::Array(vec![]);

    let encoded = ht_type
        .encode(&input, false)
        .expect("encoding should succeed");
    let decoded = ht_type.decode(&encoded).expect("decoding should succeed");

    match decoded {
        Value::Array(pairs) => assert!(pairs.is_empty()),
        _ => panic!("Expected empty array"),
    }
}

#[test]
fn hashtable_null_optional() {
    common::ensure_gtk_init();

    let key_type = Type::Boolean(BooleanType);
    let value_type = Type::Boolean(BooleanType);
    let ht_type = HashTableType {
        key_type: Box::new(key_type),
        value_type: Box::new(value_type),
        ownership: Ownership::Full,
    };

    let encoded = ht_type
        .encode(&Value::Null, true)
        .expect("encoding should succeed");

    match encoded {
        FfiValue::Ptr(ptr) => assert!(ptr.is_null()),
        _ => panic!("Expected null pointer"),
    }
}

#[test]
fn hashtable_borrowed_does_not_free() {
    common::ensure_gtk_init();

    let key_type = Type::Integer(IntegerKind::I32);
    let value_type = Type::Integer(IntegerKind::I32);
    let ht_type = HashTableType {
        key_type: Box::new(key_type),
        value_type: Box::new(value_type),
        ownership: Ownership::Borrowed,
    };

    let hash_table = unsafe {
        glib::ffi::g_hash_table_new_full(
            Some(glib::ffi::g_direct_hash),
            Some(glib::ffi::g_direct_equal),
            None,
            None,
        )
    };

    unsafe {
        glib::ffi::g_hash_table_insert(
            hash_table,
            std::ptr::without_provenance_mut(1),
            std::ptr::without_provenance_mut(100),
        );
        glib::ffi::g_hash_table_insert(
            hash_table,
            std::ptr::without_provenance_mut(2),
            std::ptr::without_provenance_mut(200),
        );
    }

    let ffi_value = FfiValue::Ptr(hash_table as *mut c_void);
    let decoded = ht_type.decode(&ffi_value).expect("decoding should succeed");

    match decoded {
        Value::Array(pairs) => assert_eq!(pairs.len(), 2),
        _ => panic!("Expected array"),
    }

    let size = unsafe { glib::ffi::g_hash_table_size(hash_table) };
    assert_eq!(size, 2);

    unsafe { glib::ffi::g_hash_table_unref(hash_table) };
}

#[test]
fn float_memory_properly_freed_on_drop() {
    common::ensure_gtk_init();

    let key_type = Type::Float(FloatKind::F64);
    let value_type = Type::Float(FloatKind::F64);
    let ht_type = HashTableType {
        key_type: Box::new(key_type),
        value_type: Box::new(value_type),
        ownership: Ownership::Full,
    };

    let input = Value::Array(vec![
        Value::Array(vec![Value::Number(1.1), Value::Number(2.2)]),
        Value::Array(vec![Value::Number(3.3), Value::Number(4.4)]),
        Value::Array(vec![Value::Number(5.5), Value::Number(6.6)]),
    ]);

    let encoded = ht_type
        .encode(&input, false)
        .expect("encoding should succeed");
    let _ = ht_type.decode(&encoded).expect("decoding should succeed");
}

#[test]
fn encoder_from_type_native_handle() {
    assert_eq!(
        HashTableEntryEncoder::from_type(&struct_type()),
        Some(HashTableEntryEncoder::NativeHandle)
    );
}

#[test]
fn encoder_from_type_ptr_array() {
    let encoder = HashTableEntryEncoder::from_type(&gptrarray_type());
    assert!(matches!(encoder, Some(HashTableEntryEncoder::PtrArray(_))));
}

#[test]
fn encoder_from_type_unsupported_returns_none() {
    assert_eq!(
        HashTableEntryEncoder::from_type(&Type::Void(VoidType)),
        None
    );
    let non_ptr_array = Type::Array(ArrayType {
        item_type: Box::new(Type::Integer(IntegerKind::I32)),
        kind: ArrayKind::Array,
        ownership: Ownership::Full,
        element_size: None,
    });
    assert_eq!(HashTableEntryEncoder::from_type(&non_ptr_array), None);
}

#[test]
fn encoder_partial_eq_compares_by_discriminant() {
    assert_eq!(
        HashTableEntryEncoder::PtrArray(Box::new(Type::Integer(IntegerKind::I32))),
        HashTableEntryEncoder::PtrArray(Box::new(Type::Boolean(BooleanType)))
    );
    assert_ne!(
        HashTableEntryEncoder::String,
        HashTableEntryEncoder::Integer
    );
}

#[test]
fn integer_encoder_hash_equal_and_free() {
    let encoder = HashTableEntryEncoder::Integer;
    assert!(encoder.hash_func().is_some());
    assert!(encoder.equal_func().is_some());
    assert!(encoder.free_func().is_none());
}

#[test]
fn string_encoder_hash_equal_and_free() {
    let encoder = HashTableEntryEncoder::String;
    assert!(encoder.hash_func().is_some());
    assert!(encoder.equal_func().is_some());
    assert!(encoder.free_func().is_some());
}

#[test]
fn native_handle_encoder_hash_equal_and_free() {
    let encoder = HashTableEntryEncoder::NativeHandle;
    assert!(encoder.hash_func().is_some());
    assert!(encoder.equal_func().is_some());
    assert!(encoder.free_func().is_none());
}

#[test]
fn ptr_array_encoder_hash_equal_and_free() {
    let encoder = HashTableEntryEncoder::PtrArray(Box::new(Type::Integer(IntegerKind::I32)));
    assert!(encoder.hash_func().is_some());
    assert!(encoder.equal_func().is_some());
    assert!(encoder.free_func().is_some());
}

#[test]
fn encode_string_value_and_wrong_type() {
    common::ensure_gtk_init();
    let encoder = HashTableEntryEncoder::String;
    let ptr = encoder.encode(&Value::String("hi".to_string())).unwrap();
    assert!(!ptr.is_null());
    unsafe { glib::ffi::g_free(ptr) };

    assert!(encoder.encode(&Value::Number(1.0)).is_err());
}

#[test]
fn encode_integer_value_and_wrong_type() {
    let encoder = HashTableEntryEncoder::Integer;
    let ptr = encoder.encode(&Value::Number(7.0)).unwrap();
    assert_eq!(ptr as isize, 7);

    assert!(encoder.encode(&Value::Boolean(true)).is_err());
}

#[test]
fn encode_native_handle_value_null_and_wrong_type() {
    common::ensure_gtk_init();
    let encoder = HashTableEntryEncoder::NativeHandle;
    let handle = boxed_handle();
    let ptr = encoder.encode(&Value::Object(handle.clone())).unwrap();
    assert_eq!(ptr, handle.ptr());

    assert!(encoder.encode(&Value::Null).unwrap().is_null());
    assert!(encoder.encode(&Value::Undefined).unwrap().is_null());
    assert!(encoder.encode(&Value::Number(1.0)).is_err());
}

#[test]
fn encode_ptr_array_value_with_objects_and_nulls() {
    common::ensure_gtk_init();
    let encoder = HashTableEntryEncoder::PtrArray(Box::new(struct_type()));
    let ptr = encoder
        .encode(&Value::Array(vec![
            Value::Object(boxed_handle()),
            Value::Null,
            Value::Undefined,
        ]))
        .unwrap();
    assert!(!ptr.is_null());
    unsafe { glib::ffi::g_ptr_array_unref(ptr as *mut glib::ffi::GPtrArray) };
}

#[test]
fn ptr_array_value_freed_when_hashtable_storage_drops() {
    common::ensure_gtk_init();
    let ht_type = HashTableType {
        key_type: Box::new(Type::Integer(IntegerKind::I32)),
        value_type: Box::new(gptrarray_type()),
        ownership: Ownership::Borrowed,
    };
    let input = Value::Array(vec![Value::Array(vec![
        Value::Number(1.0),
        Value::Array(vec![Value::Object(boxed_handle())]),
    ])]);
    {
        let _encoded = ht_type.encode(&input, false).unwrap();
    }
}

#[test]
fn encode_ptr_array_rejects_non_array() {
    let encoder = HashTableEntryEncoder::PtrArray(Box::new(struct_type()));
    assert!(encoder.encode(&Value::Number(1.0)).is_err());
}

#[test]
fn encode_ptr_array_rejects_non_object_item() {
    let encoder = HashTableEntryEncoder::PtrArray(Box::new(struct_type()));
    assert!(
        encoder
            .encode(&Value::Array(vec![Value::Number(1.0)]))
            .is_err()
    );
}

#[test]
fn encoder_debug_and_clone() {
    let encoder = HashTableEntryEncoder::PtrArray(Box::new(Type::Integer(IntegerKind::I32)));
    let cloned = Clone::clone(&encoder);
    assert!(format!("{cloned:?}").contains("PtrArray"));
}

#[test]
fn hashtable_encode_rejects_non_array() {
    let ht_type = HashTableType {
        key_type: Box::new(Type::Boolean(BooleanType)),
        value_type: Box::new(Type::Boolean(BooleanType)),
        ownership: Ownership::Full,
    };
    assert!(ht_type.encode(&Value::Number(1.0), false).is_err());
}

#[test]
fn hashtable_encode_rejects_unsupported_key_type() {
    let ht_type = HashTableType {
        key_type: Box::new(Type::Void(VoidType)),
        value_type: Box::new(Type::Boolean(BooleanType)),
        ownership: Ownership::Full,
    };
    assert!(ht_type.encode(&Value::Array(vec![]), false).is_err());
}

#[test]
fn hashtable_encode_rejects_unsupported_value_type() {
    let ht_type = HashTableType {
        key_type: Box::new(Type::Boolean(BooleanType)),
        value_type: Box::new(Type::Void(VoidType)),
        ownership: Ownership::Full,
    };
    assert!(ht_type.encode(&Value::Array(vec![]), false).is_err());
}

#[test]
fn hashtable_encode_rejects_non_tuple_entry() {
    common::ensure_gtk_init();
    let ht_type = HashTableType {
        key_type: Box::new(Type::Boolean(BooleanType)),
        value_type: Box::new(Type::Boolean(BooleanType)),
        ownership: Ownership::Full,
    };
    let input = Value::Array(vec![Value::Array(vec![Value::Boolean(true)])]);
    assert!(ht_type.encode(&input, false).is_err());
}

#[test]
fn hashtable_encode_propagates_key_encoder_error() {
    common::ensure_gtk_init();
    let ht_type = HashTableType {
        key_type: Box::new(Type::Boolean(BooleanType)),
        value_type: Box::new(Type::Boolean(BooleanType)),
        ownership: Ownership::Full,
    };
    let input = Value::Array(vec![Value::Array(vec![
        Value::Number(1.0),
        Value::Boolean(true),
    ])]);
    assert!(ht_type.encode(&input, false).is_err());
}

#[test]
fn hashtable_decode_null_yields_empty_array() {
    let ht_type = HashTableType {
        key_type: Box::new(Type::Boolean(BooleanType)),
        value_type: Box::new(Type::Boolean(BooleanType)),
        ownership: Ownership::Full,
    };
    let decoded = ht_type
        .decode(&FfiValue::Ptr(std::ptr::null_mut()))
        .unwrap();
    assert!(matches!(decoded, Value::Array(items) if items.is_empty()));
}

#[test]
fn hashtable_ptr_to_value_null_and_populated() {
    common::ensure_gtk_init();
    let ht_type = HashTableType {
        key_type: Box::new(Type::Integer(IntegerKind::I32)),
        value_type: Box::new(Type::Integer(IntegerKind::I32)),
        ownership: Ownership::Borrowed,
    };

    let empty = ht_type.ptr_to_value(std::ptr::null_mut(), "ctx").unwrap();
    assert!(matches!(empty, Value::Array(items) if items.is_empty()));

    let hash_table = unsafe {
        glib::ffi::g_hash_table_new_full(
            Some(glib::ffi::g_direct_hash),
            Some(glib::ffi::g_direct_equal),
            None,
            None,
        )
    };
    unsafe {
        glib::ffi::g_hash_table_insert(
            hash_table,
            std::ptr::without_provenance_mut(1),
            std::ptr::without_provenance_mut(10),
        );
    }
    let decoded = ht_type
        .ptr_to_value(hash_table as *mut c_void, "ctx")
        .unwrap();
    assert!(matches!(decoded, Value::Array(items) if items.len() == 1));
    unsafe { glib::ffi::g_hash_table_unref(hash_table) };
}

#[test]
fn hashtable_decode_full_ownership_from_raw_ptr_unrefs() {
    common::ensure_gtk_init();
    let ht_type = HashTableType {
        key_type: Box::new(Type::Integer(IntegerKind::I32)),
        value_type: Box::new(Type::Integer(IntegerKind::I32)),
        ownership: Ownership::Full,
    };
    let hash_table = unsafe {
        glib::ffi::g_hash_table_new_full(
            Some(glib::ffi::g_direct_hash),
            Some(glib::ffi::g_direct_equal),
            None,
            None,
        )
    };
    unsafe {
        glib::ffi::g_hash_table_insert(
            hash_table,
            std::ptr::without_provenance_mut(3),
            std::ptr::without_provenance_mut(30),
        );
        glib::ffi::g_hash_table_ref(hash_table);
    }

    let decoded = ht_type
        .decode(&FfiValue::Ptr(hash_table as *mut c_void))
        .unwrap();
    assert!(matches!(decoded, Value::Array(items) if items.len() == 1));

    let size = unsafe { glib::ffi::g_hash_table_size(hash_table) };
    assert_eq!(size, 1);

    unsafe { glib::ffi::g_hash_table_unref(hash_table) };
}

#[test]
fn hashtable_encode_native_handle_keys_roundtrips() {
    common::ensure_gtk_init();
    let ht_type = HashTableType {
        key_type: Box::new(struct_type()),
        value_type: Box::new(Type::Integer(IntegerKind::I32)),
        ownership: Ownership::Full,
    };
    let input = Value::Array(vec![Value::Array(vec![
        Value::Object(boxed_handle()),
        Value::Number(5.0),
    ])]);
    let encoded = ht_type.encode(&input, false).unwrap();
    let decoded = ht_type.decode(&encoded).unwrap();
    assert!(matches!(decoded, Value::Array(items) if items.len() == 1));
}

#[test]
fn boolean_roundtrip_preserves_values() {
    common::ensure_gtk_init();

    let key_type = Type::Integer(IntegerKind::I32);
    let value_type = Type::Boolean(BooleanType);
    let ht_type = HashTableType {
        key_type: Box::new(key_type),
        value_type: Box::new(value_type),
        ownership: Ownership::Full,
    };

    let input = Value::Array(vec![
        Value::Array(vec![Value::Number(0.0), Value::Boolean(true)]),
        Value::Array(vec![Value::Number(1.0), Value::Boolean(false)]),
    ]);

    let encoded = ht_type
        .encode(&input, false)
        .expect("encoding should succeed");
    let decoded = ht_type.decode(&encoded).expect("decoding should succeed");

    let Value::Array(pairs) = decoded else {
        panic!("Expected array")
    };

    let mut found_true = false;
    let mut found_false = false;

    for pair in pairs {
        let Value::Array(kv) = pair else {
            panic!("Expected array pair")
        };
        match &kv[1] {
            Value::Boolean(true) => found_true = true,
            Value::Boolean(false) => found_false = true,
            _ => panic!("Expected boolean"),
        }
    }

    assert!(found_true && found_false);
}
