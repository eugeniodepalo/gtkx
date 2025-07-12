//! Floating-Point Type Definitions
//!
//! This module provides type definitions for floating-point types used in GTK4 FFI calls.
//! It supports different float precisions, allowing for precise type mapping between
//! JavaScript and C floating-point types.

use libffi::middle as ffi;
use neon::prelude::*;

/// Represents the precision of a floating-point type.
///
/// This enum defines the supported floating-point precisions for GTK4 FFI calls.
/// Each precision corresponds to a specific C floating-point type.
#[derive(Debug, Clone, Copy)]
pub enum FloatSize {
    /// 32-bit floating-point (float)
    _32,
    /// 64-bit floating-point (double)
    _64,
}

impl FloatSize {
    /// Creates a FloatSize from a JavaScript numeric value.
    ///
    /// # Arguments
    ///
    /// * `cx` - Neon function context
    /// * `value` - JavaScript number representing the float precision in bits
    ///
    /// # Returns
    ///
    /// Returns the corresponding FloatSize enum value.
    ///
    /// # Errors
    ///
    /// Returns a JavaScript error if the precision is not supported (must be 32 or 64).
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let size = value.downcast::<JsNumber, _>(cx).or_throw(cx)?;

        match size.value(cx) as u64 {
            32 => Ok(FloatSize::_32),
            64 => Ok(FloatSize::_64),
            _ => cx.throw_type_error("Invalid float size"),
        }
    }
}

/// Represents a complete floating-point type specification.
///
/// This struct specifies a floating-point type for use in GTK4 FFI calls.
/// It provides conversion methods to libffi types for actual function calls.
#[derive(Debug, Clone, Copy)]
pub struct FloatType {
    /// The precision of the floating-point type in bits
    pub size: FloatSize,
}

impl FloatType {
    /// Creates a new FloatType with the specified precision.
    ///
    /// # Arguments
    ///
    /// * `size` - The precision of the floating-point type in bits
    ///
    /// # Returns
    ///
    /// Returns a new FloatType with the specified precision.
    pub fn new(size: FloatSize) -> Self {
        FloatType { size }
    }

    /// Creates a FloatType from a JavaScript type description object.
    ///
    /// # Arguments
    ///
    /// * `cx` - Neon function context
    /// * `value` - JavaScript object with a 'size' property
    ///
    /// # Returns
    ///
    /// Returns a FloatType representing the JavaScript type description.
    ///
    /// # Errors
    ///
    /// Returns a JavaScript error if the type description is invalid.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let size_prop = obj.prop(cx, "size").get()?;
        let size = FloatSize::from_js_value(cx, size_prop)?;

        Ok(Self::new(size))
    }
}

impl Into<ffi::Type> for &FloatType {
    /// Converts the FloatType to a libffi type.
    ///
    /// This method maps the precision to the appropriate libffi type
    /// for use in FFI calls.
    fn into(self) -> ffi::Type {
        match self.size {
            FloatSize::_32 => ffi::Type::f32(),
            FloatSize::_64 => ffi::Type::f64(),
        }
    }
}

impl Into<ffi::Type> for FloatType {
    fn into(self) -> ffi::Type {
        (&self).into()
    }
}
