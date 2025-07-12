//! CIF Value Representation
//!
//! This module provides the `Value` enum for representing values in a format
//! that can be directly passed to libffi for C function calls. It serves as
//! the lowest level of the type conversion system.

use std::ffi::c_void;

use libffi::middle as ffi;

/// Represents a value in C-compatible format for libffi.
///
/// This enum provides the final representation of values that can be passed
/// directly to libffi for C function calls. Each variant corresponds exactly
/// to a C type that libffi understands and can marshal correctly.
pub enum Value {
    /// Unsigned 8-bit integer value
    U8(u8),
    /// Signed 8-bit integer value
    I8(i8),
    /// Unsigned 32-bit integer value
    U32(u32),
    /// Signed 32-bit integer value
    I32(i32),
    /// Unsigned 64-bit integer value
    U64(u64),
    /// Signed 64-bit integer value
    I64(i64),
    /// 32-bit floating-point value
    F32(f32),
    /// 64-bit floating-point value
    F64(f64),
    /// Generic pointer value (void*)
    Pointer(*mut c_void),
}

impl Into<ffi::Arg> for &Value {
    /// Converts the value to a libffi argument.
    ///
    /// This method performs the final conversion from the CIF value
    /// representation to libffi's internal argument format. This is
    /// the last step in the type conversion pipeline before the actual
    /// FFI call is made.
    ///
    /// # Safety
    ///
    /// The conversion is safe because all values are already in their
    /// final C-compatible format. The libffi::arg function handles the
    /// proper marshalling of each type.
    fn into(self) -> ffi::Arg {
        match self {
            Value::U8(value) => ffi::arg(value),
            Value::I8(value) => ffi::arg(value),
            Value::U32(value) => ffi::arg(value),
            Value::I32(value) => ffi::arg(value),
            Value::U64(value) => ffi::arg(value),
            Value::I64(value) => ffi::arg(value),
            Value::F32(value) => ffi::arg(value),
            Value::F64(value) => ffi::arg(value),
            Value::Pointer(ptr) => ffi::arg(ptr),
        }
    }
}

impl Into<ffi::Arg> for Value {
    fn into(self) -> ffi::Arg {
        (&self).into()
    }
}
