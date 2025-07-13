use std::ffi::{c_char, c_void, CString};

use gtk4::glib;

use crate::cif::Value;

#[derive(Debug)]
pub enum Arg {
    U8(u8),
    I8(i8),
    U32(u32),
    I32(i32),
    U64(u64),
    I64(i64),
    F32(f32),
    F64(f64),
    U8Array(Vec<u8>),
    I8Array(Vec<i8>),
    U32Array(Vec<u32>),
    I32Array(Vec<i32>),
    U64Array(Vec<u64>),
    I64Array(Vec<i64>),
    F32Array(Vec<f32>),
    F64Array(Vec<f64>),
    StringArray(Vec<CString>),
    PointerArray(Vec<*mut c_void>),
    Callback(glib::Closure),
    String(CString),
    Pointer(*mut c_void),
    // For out parameters, we pass a pointer-to-pointer if needed, but we model all refs as Pointer
}

impl From<&Arg> for Value {
    fn from(arg: &Arg) -> Value {
        match arg {
            Arg::U8(value) => Value::U8(*value),
            Arg::I8(value) => Value::I8(*value),
            Arg::U32(value) => Value::U32(*value),
            Arg::I32(value) => Value::I32(*value),
            Arg::U64(value) => Value::U64(*value),
            Arg::I64(value) => Value::I64(*value),
            Arg::F32(value) => Value::F32(*value),
            Arg::F64(value) => Value::F64(*value),
            Arg::String(cstring) => {
                let ptr = cstring.as_ptr();
                Value::Pointer(ptr as *mut c_void)
            }
            Arg::Pointer(ptr) => Value::Pointer(*ptr),
            Arg::U8Array(values) => {
                let ptr = values.as_ptr() as *const c_void;
                Value::Pointer(ptr as *mut c_void)
            }
            Arg::I8Array(values) => {
                let ptr = values.as_ptr() as *const c_void;
                Value::Pointer(ptr as *mut c_void)
            }
            Arg::U32Array(values) => {
                let ptr = values.as_ptr() as *const c_void;
                Value::Pointer(ptr as *mut c_void)
            }
            Arg::I32Array(values) => {
                let ptr = values.as_ptr() as *const c_void;
                Value::Pointer(ptr as *mut c_void)
            }
            Arg::U64Array(values) => {
                let ptr = values.as_ptr() as *const c_void;
                Value::Pointer(ptr as *mut c_void)
            }
            Arg::I64Array(values) => {
                let ptr = values.as_ptr() as *const c_void;
                Value::Pointer(ptr as *mut c_void)
            }
            Arg::F32Array(values) => {
                let ptr = values.as_ptr() as *const c_void;
                Value::Pointer(ptr as *mut c_void)
            }
            Arg::F64Array(values) => {
                let ptr = values.as_ptr() as *const c_void;
                Value::Pointer(ptr as *mut c_void)
            }
            Arg::StringArray(cstrings) => {
                let ptrs: Vec<*const c_char> = cstrings.iter().map(|s| s.as_ptr()).collect();
                let ptr = ptrs.as_ptr();
                Value::Pointer(ptr as *mut c_void)
            }
            Arg::PointerArray(pointers) => {
                let ptrs: Vec<*mut c_void> = pointers.iter().map(|p| *p).collect();
                let ptr = ptrs.as_ptr();
                Value::Pointer(ptr as *mut c_void)
            }
            Arg::Callback(closure) => {
                let ptr = closure.as_ptr() as *mut c_void;
                Value::Pointer(ptr)
            }
        }
    }
}
