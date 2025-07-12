//! CIF Argument Conversion
//!
//! This module provides the `Arg` enum for representing function arguments
//! in a format suitable for libffi calls. It handles the conversion from
//! high-level Rust types to the low-level C types that libffi expects.

use std::ffi::{c_char, c_void, CString};

use gtk4::glib;

use crate::cif::Value;

/// Represents a function argument in C-compatible format for libffi.
///
/// This enum provides a low-level representation of function arguments that
/// can be passed directly to libffi for C function calls. Each variant
/// corresponds to a specific C type and handles the appropriate conversion
/// to libffi's value system.
pub enum Arg {
    /// Unsigned 8-bit integer argument
    U8(u8),
    /// Signed 8-bit integer argument
    I8(i8),
    /// Unsigned 32-bit integer argument
    U32(u32),
    /// Signed 32-bit integer argument
    I32(i32),
    /// Unsigned 64-bit integer argument
    U64(u64),
    /// Signed 64-bit integer argument
    I64(i64),
    /// 32-bit floating-point argument
    F32(f32),
    /// 64-bit floating-point argument
    F64(f64),
    /// Array of unsigned 8-bit integers
    U8Array(Vec<u8>),
    /// Array of signed 8-bit integers
    I8Array(Vec<i8>),
    /// Array of unsigned 32-bit integers
    U32Array(Vec<u32>),
    /// Array of signed 32-bit integers
    I32Array(Vec<i32>),
    /// Array of unsigned 64-bit integers
    U64Array(Vec<u64>),
    /// Array of signed 64-bit integers
    I64Array(Vec<i64>),
    /// Array of 32-bit floating-point values
    F32Array(Vec<f32>),
    /// Array of 64-bit floating-point values
    F64Array(Vec<f64>),
    /// Array of C strings (null-terminated)
    StringArray(Vec<CString>),
    /// Array of void pointers
    PointerArray(Vec<*mut c_void>),
    /// GLib closure (callback function)
    Callback(glib::Closure),
    /// C string (null-terminated)
    String(CString),
    /// Generic pointer argument
    Pointer(*mut c_void),
}

impl Into<Value> for &Arg {
    /// Converts the argument to a CIF value for libffi.
    ///
    /// This method transforms the high-level argument representation into
    /// the low-level value format that libffi expects. It handles proper
    /// pointer management for arrays and complex types.
    ///
    /// # Note
    ///
    /// For array types, this method returns a pointer to the array data.
    /// The caller must ensure that the original array remains valid for
    /// the duration of the FFI call.
    fn into(self) -> Value {
        match self {
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

impl Into<Value> for Arg {
    fn into(self) -> Value {
        (&self).into()
    }
}
