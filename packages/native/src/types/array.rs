//! Array Type Definitions
//!
//! This module provides type definitions for array types used in GTK4 FFI calls.
//! Arrays contain elements of a specific type and are passed as pointers to
//! the first element in C function calls.

use libffi::middle as ffi;
use neon::prelude::*;

use crate::types::Type;

/// Represents an array type specification.
///
/// This struct defines an array type for use in GTK4 FFI calls. It specifies
/// the type of elements contained in the array. Arrays are always passed as
/// pointers to the first element in C function calls.
#[derive(Debug, Clone)]
pub struct ArrayType {
    /// The type of elements contained in the array
    pub item_type: Box<Type>,
}

impl ArrayType {
    /// Creates an ArrayType from a JavaScript type description object.
    ///
    /// # Arguments
    ///
    /// * `cx` - Neon function context
    /// * `value` - JavaScript object with an 'itemType' property
    ///
    /// # Returns
    ///
    /// Returns an ArrayType representing the JavaScript type description.
    ///
    /// # Errors
    ///
    /// Returns a JavaScript error if the type description is invalid or
    /// if the 'itemType' property is missing or invalid.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let item_type_value: Handle<'_, JsValue> = obj.prop(cx, "itemType").get()?;
        let item_type = Type::from_js_value(cx, item_type_value)?;

        Ok(Self {
            item_type: Box::new(item_type),
        })
    }
}

impl Into<ffi::Type> for &ArrayType {
    /// Converts the ArrayType to a libffi type.
    ///
    /// Arrays are always represented as pointers in C, regardless of their
    /// element type. The actual array data is passed by reference, with the
    /// pointer pointing to the first element.
    fn into(self) -> ffi::Type {
        ffi::Type::pointer()
    }
}

impl Into<ffi::Type> for ArrayType {
    fn into(self) -> ffi::Type {
        (&self).into()
    }
}
