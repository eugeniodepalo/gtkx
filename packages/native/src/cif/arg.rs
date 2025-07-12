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
#[derive(Debug)]
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::ptr;

    #[test]
    fn test_primitive_args() {
        let args = vec![
            Arg::U8(255),
            Arg::I8(-128),
            Arg::U32(4294967295),
            Arg::I32(-2147483648),
            Arg::U64(18446744073709551615),
            Arg::I64(-9223372036854775808),
            Arg::F32(3.14159),
            Arg::F64(2.718281828),
        ];

        for arg in args {
            let value: Value = (&arg).into();

            // Verify conversion works without panicking
            match (&arg, &value) {
                (Arg::U8(a), Value::U8(v)) => assert_eq!(*a, *v),
                (Arg::I8(a), Value::I8(v)) => assert_eq!(*a, *v),
                (Arg::U32(a), Value::U32(v)) => assert_eq!(*a, *v),
                (Arg::I32(a), Value::I32(v)) => assert_eq!(*a, *v),
                (Arg::U64(a), Value::U64(v)) => assert_eq!(*a, *v),
                (Arg::I64(a), Value::I64(v)) => assert_eq!(*a, *v),
                (Arg::F32(a), Value::F32(v)) => assert_eq!(*a, *v),
                (Arg::F64(a), Value::F64(v)) => assert_eq!(*a, *v),
                _ => panic!("Unexpected value type for arg: {:?}", arg),
            }
        }
    }

    #[test]
    fn test_string_arg() {
        let cstring = CString::new("Hello, World!").unwrap();
        let expected_ptr = cstring.as_ptr() as *mut c_void;
        let arg = Arg::String(cstring);

        let value: Value = (&arg).into();

        match value {
            Value::Pointer(ptr) => assert_eq!(ptr, expected_ptr),
            _ => panic!("Expected Pointer value for String arg"),
        }
    }

    #[test]
    fn test_pointer_arg() {
        let test_ptr = 0x12345678 as *mut c_void;
        let arg = Arg::Pointer(test_ptr);

        let value: Value = (&arg).into();

        match value {
            Value::Pointer(ptr) => assert_eq!(ptr, test_ptr),
            _ => panic!("Expected Pointer value for Pointer arg"),
        }
    }

    #[test]
    fn test_null_pointer_arg() {
        let arg = Arg::Pointer(ptr::null_mut());

        let value: Value = (&arg).into();

        match value {
            Value::Pointer(ptr) => assert!(ptr.is_null()),
            _ => panic!("Expected null Pointer value"),
        }
    }

    #[test]
    fn test_integer_arrays() {
        let test_cases = vec![
            (Arg::U8Array(vec![1, 2, 3]), "U8Array"),
            (Arg::I8Array(vec![-1, 0, 1]), "I8Array"),
            (Arg::U32Array(vec![100, 200, 300]), "U32Array"),
            (Arg::I32Array(vec![-100, 0, 100]), "I32Array"),
            (Arg::U64Array(vec![1000, 2000, 3000]), "U64Array"),
            (Arg::I64Array(vec![-1000, 0, 1000]), "I64Array"),
        ];

        for (arg, name) in test_cases {
            let value: Value = (&arg).into();

            match value {
                Value::Pointer(ptr) => {
                    assert!(
                        !ptr.is_null(),
                        "Array pointer should not be null for {}",
                        name
                    );
                }
                _ => panic!("Expected Pointer value for {} arg", name),
            }
        }
    }

    #[test]
    fn test_float_arrays() {
        let f32_array = Arg::F32Array(vec![1.1, 2.2, 3.3]);
        let f64_array = Arg::F64Array(vec![1.11, 2.22, 3.33]);

        let f32_value: Value = (&f32_array).into();
        let f64_value: Value = (&f64_array).into();

        match f32_value {
            Value::Pointer(ptr) => assert!(!ptr.is_null()),
            _ => panic!("Expected Pointer value for F32Array"),
        }

        match f64_value {
            Value::Pointer(ptr) => assert!(!ptr.is_null()),
            _ => panic!("Expected Pointer value for F64Array"),
        }
    }

    #[test]
    fn test_string_array() {
        let strings = vec![
            CString::new("first").unwrap(),
            CString::new("second").unwrap(),
            CString::new("third").unwrap(),
        ];
        let arg = Arg::StringArray(strings);

        let value: Value = (&arg).into();

        match value {
            Value::Pointer(ptr) => assert!(!ptr.is_null()),
            _ => panic!("Expected Pointer value for StringArray"),
        }
    }

    #[test]
    fn test_pointer_array() {
        let pointers = vec![
            0x1000 as *mut c_void,
            0x2000 as *mut c_void,
            ptr::null_mut(),
        ];
        let arg = Arg::PointerArray(pointers);

        let value: Value = (&arg).into();

        match value {
            Value::Pointer(ptr) => assert!(!ptr.is_null()),
            _ => panic!("Expected Pointer value for PointerArray"),
        }
    }

    #[test]
    fn test_empty_arrays() {
        let empty_arrays = vec![
            Arg::U8Array(vec![]),
            Arg::I8Array(vec![]),
            Arg::U32Array(vec![]),
            Arg::I32Array(vec![]),
            Arg::U64Array(vec![]),
            Arg::I64Array(vec![]),
            Arg::F32Array(vec![]),
            Arg::F64Array(vec![]),
            Arg::StringArray(vec![]),
            Arg::PointerArray(vec![]),
        ];

        for arg in empty_arrays {
            let value: Value = (&arg).into();

            // Even empty arrays should produce valid (though potentially dangerous) pointers
            match value {
                Value::Pointer(_) => {} // Expected - even empty vecs have a data pointer
                _ => panic!("Expected Pointer value for empty array: {:?}", arg),
            }
        }
    }

    #[test]
    fn test_callback_arg() {
        // Create a simple closure for testing
        let closure = glib::Closure::new(|_args: &[glib::Value]| None);
        let arg = Arg::Callback(closure);

        let value: Value = (&arg).into();

        match value {
            Value::Pointer(ptr) => assert!(!ptr.is_null()),
            _ => panic!("Expected Pointer value for Callback"),
        }
    }

    #[test]
    fn test_debug_output() {
        let args = vec![
            Arg::U8(42),
            Arg::I32(-123),
            Arg::F64(3.14),
            Arg::String(CString::new("test").unwrap()),
            Arg::Pointer(0x1000 as *mut c_void),
            Arg::U32Array(vec![1, 2, 3]),
            Arg::StringArray(vec![CString::new("debug").unwrap()]),
        ];

        for arg in args {
            let debug_str = format!("{:?}", arg);
            assert!(!debug_str.is_empty());
            assert!(
                debug_str.contains("U8")
                    || debug_str.contains("I32")
                    || debug_str.contains("F64")
                    || debug_str.contains("String")
                    || debug_str.contains("Pointer")
                    || debug_str.contains("Array")
            );
        }
    }

    #[test]
    fn test_owned_conversion() {
        let arg = Arg::U32(42);
        let value: Value = arg.into();

        match value {
            Value::U32(n) => assert_eq!(n, 42),
            _ => panic!("Expected U32 value"),
        }
    }

    #[test]
    fn test_extreme_values() {
        let extreme_args = vec![
            Arg::U8(u8::MIN),
            Arg::U8(u8::MAX),
            Arg::I8(i8::MIN),
            Arg::I8(i8::MAX),
            Arg::U32(u32::MIN),
            Arg::U32(u32::MAX),
            Arg::I32(i32::MIN),
            Arg::I32(i32::MAX),
            Arg::U64(u64::MIN),
            Arg::U64(u64::MAX),
            Arg::I64(i64::MIN),
            Arg::I64(i64::MAX),
            Arg::F32(f32::MIN),
            Arg::F32(f32::MAX),
            Arg::F32(f32::INFINITY),
            Arg::F32(f32::NEG_INFINITY),
            Arg::F32(f32::NAN),
            Arg::F64(f64::MIN),
            Arg::F64(f64::MAX),
            Arg::F64(f64::INFINITY),
            Arg::F64(f64::NEG_INFINITY),
            Arg::F64(f64::NAN),
        ];

        for arg in extreme_args {
            let _value: Value = (&arg).into();
            // Just verify conversion doesn't panic
        }
    }

    #[test]
    fn test_large_arrays() {
        let large_u32_array = Arg::U32Array((0..10000).collect());
        let large_f64_array = Arg::F64Array((0..5000).map(|i| i as f64 * 0.1).collect());

        let u32_value: Value = (&large_u32_array).into();
        let f64_value: Value = (&large_f64_array).into();

        match (u32_value, f64_value) {
            (Value::Pointer(ptr1), Value::Pointer(ptr2)) => {
                assert!(!ptr1.is_null());
                assert!(!ptr2.is_null());
            }
            _ => panic!("Expected Pointer values for large arrays"),
        }
    }
}
