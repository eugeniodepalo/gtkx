//! String type descriptor.

use libffi::middle as ffi;
use neon::prelude::*;

/// Type descriptor for string types.
///
/// Strings are passed as C-style null-terminated character pointers.
/// The `is_borrowed` flag indicates whether the string memory is owned
/// by the caller or borrowed from the callee.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct StringType {
    /// Whether the string memory is borrowed from the callee.
    pub is_borrowed: bool,
}

impl StringType {
    /// Creates a new string type descriptor.
    pub fn new(is_borrowed: bool) -> Self {
        StringType { is_borrowed }
    }

    /// Parses a string type from a JavaScript object.
    ///
    /// # Errors
    ///
    /// Returns a `NeonResult` error if the object is malformed.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let is_borrowed_prop: Handle<'_, JsValue> = obj.prop(cx, "borrowed").get()?;

        let is_borrowed = is_borrowed_prop
            .downcast::<JsBoolean, _>(cx)
            .map(|b| b.value(cx))
            .unwrap_or(false);

        Ok(Self::new(is_borrowed))
    }
}

impl From<&StringType> for ffi::Type {
    fn from(_value: &StringType) -> Self {
        ffi::Type::pointer()
    }
}
