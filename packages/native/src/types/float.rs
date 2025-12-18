//! Floating point type descriptor.

use libffi::middle as ffi;
use neon::prelude::*;

/// Size of a floating point type.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FloatSize {
    /// 32-bit float (f32).
    _32,
    /// 64-bit float (f64).
    _64,
}

impl FloatSize {
    /// Parses a float size from a JavaScript number.
    ///
    /// # Errors
    ///
    /// Returns a `NeonResult` error if the value is not 32 or 64.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let size = value.downcast::<JsNumber, _>(cx).or_throw(cx)?;

        match size.value(cx) as u64 {
            32 => Ok(FloatSize::_32),
            64 => Ok(FloatSize::_64),
            _ => cx.throw_type_error("Invalid float size"),
        }
    }
}

/// Type descriptor for floating point types.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FloatType {
    /// The size of the float.
    pub size: FloatSize,
}

impl FloatType {
    /// Creates a new float type with the given size.
    pub fn new(size: FloatSize) -> Self {
        FloatType { size }
    }

    /// Parses a float type from a JavaScript object.
    ///
    /// # Errors
    ///
    /// Returns a `NeonResult` error if the object is malformed.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let size_prop = obj.prop(cx, "size").get()?;
        let size = FloatSize::from_js_value(cx, size_prop)?;

        Ok(Self::new(size))
    }
}

impl From<&FloatType> for ffi::Type {
    fn from(value: &FloatType) -> Self {
        match value.size {
            FloatSize::_32 => ffi::Type::f32(),
            FloatSize::_64 => ffi::Type::f64(),
        }
    }
}
