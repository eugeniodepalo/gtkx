//! Integer type descriptor.

use libffi::middle as ffi;
use neon::prelude::*;

/// Size of an integer type in bits.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IntegerSize {
    /// 8-bit integer.
    _8,
    /// 16-bit integer.
    _16,
    /// 32-bit integer.
    _32,
    /// 64-bit integer.
    _64,
}

impl IntegerSize {
    /// Parses an integer size from a JavaScript number.
    ///
    /// # Errors
    ///
    /// Returns a `NeonResult` error if the value is not 8, 16, 32, or 64.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let size = value.downcast::<JsNumber, _>(cx).or_throw(cx)?;

        match size.value(cx) as u64 {
            8 => Ok(IntegerSize::_8),
            16 => Ok(IntegerSize::_16),
            32 => Ok(IntegerSize::_32),
            64 => Ok(IntegerSize::_64),
            _ => cx.throw_type_error("Invalid integer size"),
        }
    }
}

/// Signedness of an integer type.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IntegerSign {
    /// Unsigned integer.
    Unsigned,
    /// Signed integer.
    Signed,
}

impl IntegerSign {
    /// Parses an integer sign from a JavaScript boolean.
    ///
    /// True means unsigned, false means signed.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let is_unsigned = value
            .downcast::<JsBoolean, _>(cx)
            .map(|b| b.value(cx))
            .unwrap_or(true);

        Ok(if is_unsigned {
            IntegerSign::Unsigned
        } else {
            IntegerSign::Signed
        })
    }
}

/// Type descriptor for integer types.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct IntegerType {
    /// The size of the integer.
    pub size: IntegerSize,
    /// The signedness of the integer.
    pub sign: IntegerSign,
}

impl IntegerType {
    /// Creates a new integer type with the given size and sign.
    pub fn new(size: IntegerSize, sign: IntegerSign) -> Self {
        IntegerType { size, sign }
    }

    /// Parses an integer type from a JavaScript object.
    ///
    /// # Errors
    ///
    /// Returns a `NeonResult` error if the object is malformed.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let size_prop = obj.prop(cx, "size").get()?;
        let sign_prop = obj.prop(cx, "unsigned").get()?;
        let size = IntegerSize::from_js_value(cx, size_prop)?;
        let sign = IntegerSign::from_js_value(cx, sign_prop)?;

        Ok(Self::new(size, sign))
    }
}

impl From<&IntegerType> for ffi::Type {
    fn from(value: &IntegerType) -> Self {
        match (value.size, value.sign) {
            (IntegerSize::_8, IntegerSign::Unsigned) => ffi::Type::u8(),
            (IntegerSize::_8, IntegerSign::Signed) => ffi::Type::i8(),
            (IntegerSize::_16, IntegerSign::Unsigned) => ffi::Type::u16(),
            (IntegerSize::_16, IntegerSign::Signed) => ffi::Type::i16(),
            (IntegerSize::_32, IntegerSign::Unsigned) => ffi::Type::u32(),
            (IntegerSize::_32, IntegerSign::Signed) => ffi::Type::i32(),
            (IntegerSize::_64, IntegerSign::Unsigned) => ffi::Type::u64(),
            (IntegerSize::_64, IntegerSign::Signed) => ffi::Type::i64(),
        }
    }
}
