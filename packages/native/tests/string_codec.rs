//! Coverage tests for [`native::types::StringType`] codec implementations.

mod common;

use std::ffi::{CStr, CString, c_char, c_void};

use gtk4::glib;

use native::ffi;
use native::types::{FfiDecoder, FfiEncoder, GlibValueCodec, Ownership, RawPtrCodec, StringType};
use native::value::Value;

fn borrowed() -> StringType {
    StringType {
        ownership: Ownership::Borrowed,
        length: None,
    }
}

fn full() -> StringType {
    StringType {
        ownership: Ownership::Full,
        length: None,
    }
}

#[test]
fn encode_borrowed_keeps_string_in_storage() {
    common::run(|| {
        let encoded = borrowed()
            .encode(&Value::String("hello".to_owned()), false)
            .expect("borrowed encode should succeed");
        let ffi::FfiValue::Storage(storage) = encoded else {
            panic!("expected Storage ffi value");
        };
        let read = unsafe { CStr::from_ptr(storage.ptr() as *const c_char) };
        assert_eq!(read.to_str().unwrap(), "hello");
    });
}

#[test]
fn encode_full_duplicates_into_glib_string() {
    common::run(|| {
        let encoded = full()
            .encode(&Value::String("owned".to_owned()), false)
            .expect("full encode should succeed");
        let ffi::FfiValue::Ptr(ptr) = encoded else {
            panic!("expected Ptr ffi value");
        };
        assert!(!ptr.is_null());
        let read = unsafe { CStr::from_ptr(ptr as *const c_char) };
        assert_eq!(read.to_str().unwrap(), "owned");
        unsafe { glib::ffi::g_free(ptr) };
    });
}

#[test]
fn encode_null_yields_null_pointer() {
    common::run(|| {
        let encoded = borrowed()
            .encode(&Value::Null, false)
            .expect("null encode should succeed");
        assert!(matches!(encoded, ffi::FfiValue::Ptr(p) if p.is_null()));

        let encoded = borrowed()
            .encode(&Value::Undefined, false)
            .expect("undefined encode should succeed");
        assert!(matches!(encoded, ffi::FfiValue::Ptr(p) if p.is_null()));
    });
}

#[test]
fn encode_rejects_non_string() {
    common::run(|| {
        assert!(borrowed().encode(&Value::Number(1.0), false).is_err());
    });
}

#[test]
fn decode_borrowed_reads_string() {
    common::run(|| {
        let cstring = CString::new("decoded").unwrap();
        let decoded = borrowed()
            .decode(&ffi::FfiValue::Ptr(cstring.as_ptr() as *mut c_void))
            .expect("borrowed decode should succeed");
        assert!(matches!(decoded, Value::String(s) if s == "decoded"));
    });
}

#[test]
fn decode_full_reads_and_frees() {
    common::run(|| {
        let owned = unsafe { glib::ffi::g_strdup(c"owned-decode".as_ptr()) };
        let decoded = full()
            .decode(&ffi::FfiValue::Ptr(owned as *mut c_void))
            .expect("full decode should succeed");
        assert!(matches!(decoded, Value::String(s) if s == "owned-decode"));
    });
}

#[test]
fn decode_null_yields_null() {
    common::run(|| {
        let decoded = borrowed()
            .decode(&ffi::FfiValue::Ptr(std::ptr::null_mut()))
            .expect("null decode should succeed");
        assert!(matches!(decoded, Value::Null));
    });
}

#[test]
fn ptr_to_value_reads_string() {
    common::run(|| {
        let cstring = CString::new("ptr-value").unwrap();
        let value = borrowed()
            .ptr_to_value(cstring.as_ptr() as *mut c_void, "ctx")
            .expect("ptr_to_value should succeed");
        assert!(matches!(value, Value::String(s) if s == "ptr-value"));
    });
}

#[test]
fn ptr_to_value_null_yields_null() {
    common::run(|| {
        let value = borrowed()
            .ptr_to_value(std::ptr::null_mut(), "ctx")
            .expect("null ptr_to_value should succeed");
        assert!(matches!(value, Value::Null));
    });
}

#[test]
fn read_from_raw_ptr_dereferences_pointer_slot() {
    common::run(|| {
        let cstring = CString::new("slot").unwrap();
        let slot: *mut c_void = cstring.as_ptr() as *mut c_void;
        let value = borrowed()
            .read_from_raw_ptr(&slot as *const *mut c_void as *const c_void, "ctx")
            .expect("read_from_raw_ptr should succeed");
        assert!(matches!(value, Value::String(s) if s == "slot"));
    });
}

#[test]
fn write_return_to_raw_ptr_writes_duplicated_string() {
    common::run(|| {
        let mut slot: *mut c_void = std::ptr::null_mut();
        let value: Result<Value, ()> = Ok(Value::String("ret".to_owned()));
        borrowed().write_return_to_raw_ptr(&mut slot as *mut *mut c_void as *mut c_void, &value);

        assert!(!slot.is_null());
        let read = unsafe { CStr::from_ptr(slot as *const c_char) };
        assert_eq!(read.to_str().unwrap(), "ret");
        unsafe { glib::ffi::g_free(slot) };
    });
}

#[test]
fn write_return_to_raw_ptr_non_string_writes_null() {
    common::run(|| {
        let mut slot: *mut c_void = std::ptr::dangling_mut::<c_void>();
        let value: Result<Value, ()> = Ok(Value::Number(1.0));
        borrowed().write_return_to_raw_ptr(&mut slot as *mut *mut c_void as *mut c_void, &value);
        assert!(slot.is_null());
    });
}

#[test]
fn write_value_to_raw_ptr_writes_string() {
    common::run(|| {
        let mut slot: *mut c_char = std::ptr::null_mut();
        borrowed()
            .write_value_to_raw_ptr(
                &mut slot as *mut *mut c_char as *mut c_void,
                &Value::String("field".to_owned()),
            )
            .expect("write_value_to_raw_ptr should succeed");
        assert!(!slot.is_null());
        let read = unsafe { CStr::from_ptr(slot) };
        assert_eq!(read.to_str().unwrap(), "field");
        unsafe { glib::ffi::g_free(slot as *mut c_void) };
    });
}

#[test]
fn write_value_to_raw_ptr_writes_null() {
    common::run(|| {
        let mut slot: *const c_char = std::ptr::dangling::<c_char>();
        borrowed()
            .write_value_to_raw_ptr(&mut slot as *mut *const c_char as *mut c_void, &Value::Null)
            .expect("write null should succeed");
        assert!(slot.is_null());

        let mut slot: *const c_char = std::ptr::dangling::<c_char>();
        borrowed()
            .write_value_to_raw_ptr(
                &mut slot as *mut *const c_char as *mut c_void,
                &Value::Undefined,
            )
            .expect("write undefined should succeed");
        assert!(slot.is_null());
    });
}

#[test]
fn write_value_to_raw_ptr_rejects_non_string() {
    common::run(|| {
        let mut slot: *mut c_char = std::ptr::null_mut();
        let result = borrowed().write_value_to_raw_ptr(
            &mut slot as *mut *mut c_char as *mut c_void,
            &Value::Number(7.0),
        );
        assert!(result.is_err());
    });
}

#[test]
fn to_glib_value_wraps_string() {
    common::run(|| {
        let gvalue = borrowed()
            .to_glib_value(&Value::String("gv".to_owned()))
            .expect("to_glib_value should succeed")
            .expect("expected Some(glib::Value)");
        let extracted: String = gvalue.get().unwrap();
        assert_eq!(extracted, "gv");
    });
}

#[test]
fn to_glib_value_null_yields_none_string() {
    common::run(|| {
        let gvalue = borrowed()
            .to_glib_value(&Value::Null)
            .expect("to_glib_value should succeed")
            .expect("expected Some(glib::Value)");
        assert!(gvalue.get::<Option<String>>().unwrap().is_none());

        let gvalue = borrowed()
            .to_glib_value(&Value::Undefined)
            .expect("to_glib_value should succeed")
            .expect("expected Some(glib::Value)");
        assert!(gvalue.get::<Option<String>>().unwrap().is_none());
    });
}

#[test]
fn to_glib_value_non_string_yields_none() {
    common::run(|| {
        let result = borrowed()
            .to_glib_value(&Value::Number(3.0))
            .expect("to_glib_value should succeed");
        assert!(result.is_none());
    });
}

#[test]
fn from_glib_value_extracts_string() {
    common::run(|| {
        let gvalue = glib::Value::from("from-gv");
        let value = borrowed()
            .from_glib_value(&gvalue)
            .expect("from_glib_value should succeed");
        assert!(matches!(value, Value::String(s) if s == "from-gv"));
    });
}

#[test]
fn from_glib_value_wrong_type_bails() {
    common::run(|| {
        let gvalue = glib::Value::from(42i32);
        assert!(borrowed().from_glib_value(&gvalue).is_err());
    });
}
