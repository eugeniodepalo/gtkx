//! Coverage tests for the non-excluded parts of
//! [`native::types::CallbackType`].
//!
//! `CallbackType::encode` and `CallbackType::build_ffi_value` are excluded from
//! coverage, but executing the excluded `encode` with a null optional value
//! still drives the non-excluded `build_null_ffi_value`.

mod common;

use libffi::middle as libffi;

use native::ffi;
use native::types::{CallbackType, FfiEncoder, Type, VoidType};
use native::value::Value;

fn callback_type() -> CallbackType {
    CallbackType {
        arg_types: Vec::new(),
        return_type: Box::new(Type::Void(VoidType)),
    }
}

#[test]
fn encode_null_optional_builds_unit_storage() {
    common::ensure_gtk_init();

    let encoded = callback_type()
        .encode(&Value::Null, true)
        .expect("optional null encode should succeed");
    let ffi::FfiValue::Storage(storage) = encoded else {
        panic!("expected Storage ffi value");
    };
    assert!(storage.ptr().is_null());
    assert!(matches!(storage.kind(), ffi::FfiStorageKind::Unit));
}

#[test]
fn encode_undefined_optional_builds_unit_storage() {
    common::ensure_gtk_init();

    let encoded = callback_type()
        .encode(&Value::Undefined, true)
        .expect("optional undefined encode should succeed");
    assert!(matches!(
        encoded,
        ffi::FfiValue::Storage(s) if s.ptr().is_null()
    ));
}

#[test]
fn encode_rejects_non_callback() {
    common::ensure_gtk_init();

    assert!(callback_type().encode(&Value::Number(1.0), true).is_err());
}

#[test]
fn encode_rejects_null_when_not_optional() {
    common::ensure_gtk_init();

    assert!(callback_type().encode(&Value::Null, false).is_err());
}

#[test]
fn call_cif_rejects_callback_as_return_type() {
    common::ensure_gtk_init();

    let cif = libffi::Cif::new(std::iter::empty(), libffi::Type::void());
    let code_ptr = libffi::CodePtr(std::ptr::null_mut());

    let result = callback_type().call_cif(&cif, code_ptr, &[]);
    assert!(result.is_err());
    assert!(
        result
            .unwrap_err()
            .to_string()
            .contains("Callbacks cannot be return types")
    );
}
