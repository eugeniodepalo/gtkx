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

#[cfg(test)]
mod tests {
    use super::*;
    use std::ptr;

    #[test]
    fn test_u8_value() {
        let value = Value::U8(42);

        // Test that conversion works without panicking
        let _: ffi::Arg = (&value).into();
        let _: ffi::Arg = value.into();
    }

    #[test]
    fn test_i8_value() {
        let positive = Value::I8(100);
        let negative = Value::I8(-50);
        let zero = Value::I8(0);

        let _: ffi::Arg = (&positive).into();
        let _: ffi::Arg = (&negative).into();
        let _: ffi::Arg = (&zero).into();
    }

    #[test]
    fn test_u32_value() {
        let value = Value::U32(u32::MAX);
        let zero = Value::U32(0);

        let _: ffi::Arg = (&value).into();
        let _: ffi::Arg = (&zero).into();
    }

    #[test]
    fn test_i32_value() {
        let positive = Value::I32(i32::MAX);
        let negative = Value::I32(i32::MIN);
        let zero = Value::I32(0);

        let _: ffi::Arg = (&positive).into();
        let _: ffi::Arg = (&negative).into();
        let _: ffi::Arg = (&zero).into();
    }

    #[test]
    fn test_u64_value() {
        let value = Value::U64(u64::MAX);
        let zero = Value::U64(0);

        let _: ffi::Arg = (&value).into();
        let _: ffi::Arg = (&zero).into();
    }

    #[test]
    fn test_i64_value() {
        let positive = Value::I64(i64::MAX);
        let negative = Value::I64(i64::MIN);
        let zero = Value::I64(0);

        let _: ffi::Arg = (&positive).into();
        let _: ffi::Arg = (&negative).into();
        let _: ffi::Arg = (&zero).into();
    }

    #[test]
    fn test_f32_value() {
        let positive = Value::F32(3.14159);
        let negative = Value::F32(-2.718);
        let zero = Value::F32(0.0);
        let infinity = Value::F32(f32::INFINITY);

        let _: ffi::Arg = (&positive).into();
        let _: ffi::Arg = (&negative).into();
        let _: ffi::Arg = (&zero).into();
        let _: ffi::Arg = (&infinity).into();
    }

    #[test]
    fn test_f64_value() {
        let positive = Value::F64(std::f64::consts::PI);
        let negative = Value::F64(-std::f64::consts::E);
        let zero = Value::F64(0.0);
        let infinity = Value::F64(f64::INFINITY);

        let _: ffi::Arg = (&positive).into();
        let _: ffi::Arg = (&negative).into();
        let _: ffi::Arg = (&zero).into();
        let _: ffi::Arg = (&infinity).into();
    }

    #[test]
    fn test_pointer_value() {
        let null_ptr = Value::Pointer(ptr::null_mut());
        let some_ptr = Value::Pointer(0x12345678 as *mut c_void);

        let _: ffi::Arg = (&null_ptr).into();
        let _: ffi::Arg = (&some_ptr).into();
    }

    #[test]
    fn test_owned_conversion() {
        let values = vec![
            Value::U8(255),
            Value::I8(-128),
            Value::U32(4294967295),
            Value::I32(-2147483648),
            Value::U64(18446744073709551615),
            Value::I64(-9223372036854775808),
            Value::F32(1.0),
            Value::F64(2.0),
            Value::Pointer(ptr::null_mut()),
        ];

        for value in values {
            let _: ffi::Arg = value.into();
        }
    }

    #[test]
    fn test_reference_conversion() {
        let values = vec![
            Value::U8(128),
            Value::I8(64),
            Value::U32(2147483647),
            Value::I32(1073741823),
            Value::U64(9223372036854775807),
            Value::I64(4611686018427387903),
            Value::F32(0.5),
            Value::F64(0.25),
            Value::Pointer(0x1000 as *mut c_void),
        ];

        for value in &values {
            let _: ffi::Arg = value.into();
        }
    }

    #[test]
    fn test_extreme_values() {
        let extreme_values = vec![
            Value::U8(u8::MIN),
            Value::U8(u8::MAX),
            Value::I8(i8::MIN),
            Value::I8(i8::MAX),
            Value::U32(u32::MIN),
            Value::U32(u32::MAX),
            Value::I32(i32::MIN),
            Value::I32(i32::MAX),
            Value::U64(u64::MIN),
            Value::U64(u64::MAX),
            Value::I64(i64::MIN),
            Value::I64(i64::MAX),
            Value::F32(f32::MIN),
            Value::F32(f32::MAX),
            Value::F32(f32::NEG_INFINITY),
            Value::F32(f32::INFINITY),
            Value::F64(f64::MIN),
            Value::F64(f64::MAX),
            Value::F64(f64::NEG_INFINITY),
            Value::F64(f64::INFINITY),
        ];

        for value in extreme_values {
            let _: ffi::Arg = (&value).into();
        }
    }

    #[test]
    fn test_nan_values() {
        let nan_f32 = Value::F32(f32::NAN);
        let nan_f64 = Value::F64(f64::NAN);

        // NaN values should still convert without panicking
        let _: ffi::Arg = (&nan_f32).into();
        let _: ffi::Arg = (&nan_f64).into();
    }
}
