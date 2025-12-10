//! Reference (out-parameter) type descriptor.

use libffi::middle as ffi;
use neon::prelude::*;

use crate::types::Type;

/// Type descriptor for reference (out-parameter) types.
///
/// Ref types are used for out-parameters where the caller provides storage
/// and the callee writes the result into that storage.
#[derive(Debug, Clone)]
pub struct RefType {
    /// The type of value that will be written to the reference.
    pub inner_type: Box<Type>,
}

impl RefType {
    /// Creates a new ref type with the given inner type.
    pub fn new(inner_type: Type) -> Self {
        RefType {
            inner_type: Box::new(inner_type),
        }
    }

    /// Parses a ref type from a JavaScript object.
    ///
    /// # Errors
    ///
    /// Returns a `NeonResult` error if the object is malformed.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let inner_type_value: Handle<'_, JsValue> = obj.prop(cx, "innerType").get()?;
        let inner_type = Type::from_js_value(cx, inner_type_value)?;

        Ok(Self::new(inner_type))
    }
}

impl From<&RefType> for ffi::Type {
    fn from(_value: &RefType) -> Self {
        ffi::Type::pointer()
    }
}
