//! Integer Type Definitions
//!
//! This module provides type definitions for integer types used in GTK4 FFI calls.
//! It supports different integer sizes and signedness configurations, allowing
//! for precise type mapping between JavaScript and C integer types.

use libffi::middle as ffi;
use neon::prelude::*;

/// Represents the size of an integer type in bits.
///
/// This enum defines the supported integer sizes for GTK4 FFI calls.
/// Each size corresponds to a specific C integer type.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IntegerSize {
    /// 8-bit integer (char/int8_t)
    _8,
    /// 32-bit integer (int/int32_t)
    _32,
    /// 64-bit integer (long/int64_t)
    _64,
}

impl IntegerSize {
    /// Creates an IntegerSize from a JavaScript numeric value.
    ///
    /// # Arguments
    ///
    /// * `cx` - Neon function context
    /// * `value` - JavaScript number representing the integer size in bits
    ///
    /// # Returns
    ///
    /// Returns the corresponding IntegerSize enum value.
    ///
    /// # Errors
    ///
    /// Returns a JavaScript error if the size is not supported (must be 8, 32, or 64).
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let size = value.downcast::<JsNumber, _>(cx).or_throw(cx)?;

        match size.value(cx) as u64 {
            8 => Ok(IntegerSize::_8),
            32 => Ok(IntegerSize::_32),
            64 => Ok(IntegerSize::_64),
            _ => cx.throw_type_error("Invalid integer size"),
        }
    }
}

/// Represents the signedness of an integer type.
///
/// This enum defines whether an integer type is signed or unsigned,
/// affecting the range of values it can represent.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IntegerSign {
    /// Unsigned integer (only positive values)
    Unsigned,
    /// Signed integer (positive and negative values)
    Signed,
}

impl IntegerSign {
    /// Creates an IntegerSign from a JavaScript boolean value.
    ///
    /// # Arguments
    ///
    /// * `cx` - Neon function context
    /// * `value` - JavaScript boolean indicating if the integer is signed
    ///
    /// # Returns
    ///
    /// Returns the corresponding IntegerSign enum value.
    /// `true` indicates signed, `false` indicates unsigned.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let is_signed = value
            .downcast::<JsBoolean, _>(cx)
            .map(|b| b.value(cx))
            .unwrap_or(false);

        Ok(if is_signed {
            IntegerSign::Signed
        } else {
            IntegerSign::Unsigned
        })
    }
}

/// Represents a complete integer type specification.
///
/// This struct combines size and signedness information to fully specify
/// an integer type for use in GTK4 FFI calls. It provides conversion
/// methods to libffi types for actual function calls.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct IntegerType {
    /// The size of the integer in bits
    pub size: IntegerSize,
    /// The signedness of the integer
    pub sign: IntegerSign,
}

impl IntegerType {
    /// Creates a new IntegerType with the specified size and signedness.
    ///
    /// # Arguments
    ///
    /// * `size` - The size of the integer in bits
    /// * `sign` - The signedness of the integer
    ///
    /// # Returns
    ///
    /// Returns a new IntegerType with the specified configuration.
    pub fn new(size: IntegerSize, sign: IntegerSign) -> Self {
        IntegerType { size, sign }
    }

    /// Creates an IntegerType from a JavaScript type description object.
    ///
    /// # Arguments
    ///
    /// * `cx` - Neon function context
    /// * `value` - JavaScript object with 'size' and 'signed' properties
    ///
    /// # Returns
    ///
    /// Returns an IntegerType representing the JavaScript type description.
    ///
    /// # Errors
    ///
    /// Returns a JavaScript error if the type description is invalid.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let size_prop = obj.prop(cx, "size").get()?;
        let sign_prop = obj.prop(cx, "signed").get()?;
        let size = IntegerSize::from_js_value(cx, size_prop)?;
        let sign = IntegerSign::from_js_value(cx, sign_prop)?;

        Ok(Self::new(size, sign))
    }
}

impl Into<ffi::Type> for &IntegerType {
    /// Converts the IntegerType to a libffi type.
    ///
    /// This method maps the size and signedness combination to the
    /// appropriate libffi type for use in FFI calls.
    fn into(self) -> ffi::Type {
        match (self.size, self.sign) {
            (IntegerSize::_8, IntegerSign::Unsigned) => ffi::Type::u8(),
            (IntegerSize::_8, IntegerSign::Signed) => ffi::Type::i8(),
            (IntegerSize::_32, IntegerSign::Unsigned) => ffi::Type::u32(),
            (IntegerSize::_32, IntegerSign::Signed) => ffi::Type::i32(),
            (IntegerSize::_64, IntegerSign::Unsigned) => ffi::Type::u64(),
            (IntegerSize::_64, IntegerSign::Signed) => ffi::Type::i64(),
        }
    }
}

impl Into<ffi::Type> for IntegerType {
    fn into(self) -> ffi::Type {
        (&self).into()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_integer_size_creation() {
        assert_eq!(IntegerSize::_8, IntegerSize::_8);
        assert_eq!(IntegerSize::_32, IntegerSize::_32);
        assert_eq!(IntegerSize::_64, IntegerSize::_64);
    }

    #[test]
    fn test_integer_sign_creation() {
        assert_eq!(IntegerSign::Unsigned, IntegerSign::Unsigned);
        assert_eq!(IntegerSign::Signed, IntegerSign::Signed);
    }

    #[test]
    fn test_integer_type_creation() {
        let int_type = IntegerType::new(IntegerSize::_32, IntegerSign::Signed);
        assert_eq!(int_type.size, IntegerSize::_32);
        assert_eq!(int_type.sign, IntegerSign::Signed);
    }

    #[test]
    fn test_integer_type_equality() {
        let type1 = IntegerType::new(IntegerSize::_64, IntegerSign::Unsigned);
        let type2 = IntegerType::new(IntegerSize::_64, IntegerSign::Unsigned);
        let type3 = IntegerType::new(IntegerSize::_32, IntegerSign::Unsigned);

        assert_eq!(type1, type2);
        assert_ne!(type1, type3);
    }

    #[test]
    fn test_ffi_type_conversion() {
        let u8_type = IntegerType::new(IntegerSize::_8, IntegerSign::Unsigned);
        let i8_type = IntegerType::new(IntegerSize::_8, IntegerSign::Signed);
        let u32_type = IntegerType::new(IntegerSize::_32, IntegerSign::Unsigned);
        let i32_type = IntegerType::new(IntegerSize::_32, IntegerSign::Signed);
        let u64_type = IntegerType::new(IntegerSize::_64, IntegerSign::Unsigned);
        let i64_type = IntegerType::new(IntegerSize::_64, IntegerSign::Signed);

        // Test that conversion works without panicking
        let _: ffi::Type = (&u8_type).into();
        let _: ffi::Type = (&i8_type).into();
        let _: ffi::Type = (&u32_type).into();
        let _: ffi::Type = (&i32_type).into();
        let _: ffi::Type = (&u64_type).into();
        let _: ffi::Type = (&i64_type).into();

        // Test owned conversion
        let _: ffi::Type = u8_type.into();
        let _: ffi::Type = i8_type.into();
    }

    #[test]
    fn test_debug_output() {
        let int_type = IntegerType::new(IntegerSize::_32, IntegerSign::Signed);
        let debug_str = format!("{:?}", int_type);
        assert!(debug_str.contains("IntegerType"));
        assert!(debug_str.contains("_32"));
        assert!(debug_str.contains("Signed"));
    }

    #[test]
    fn test_clone() {
        let original = IntegerType::new(IntegerSize::_64, IntegerSign::Unsigned);
        let cloned = original.clone();
        assert_eq!(original, cloned);

        // Ensure they're actually separate instances
        assert_eq!(original.size, cloned.size);
        assert_eq!(original.sign, cloned.sign);
    }

    #[test]
    fn test_all_size_variants() {
        let sizes = [IntegerSize::_8, IntegerSize::_32, IntegerSize::_64];
        for size in sizes {
            let int_type = IntegerType::new(size, IntegerSign::Signed);
            assert_eq!(int_type.size, size);
        }
    }

    #[test]
    fn test_all_sign_variants() {
        let signs = [IntegerSign::Unsigned, IntegerSign::Signed];
        for sign in signs {
            let int_type = IntegerType::new(IntegerSize::_32, sign);
            assert_eq!(int_type.sign, sign);
        }
    }
}
