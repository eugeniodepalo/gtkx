//! GObject reference type descriptor.

use libffi::middle as ffi;
use neon::prelude::*;

/// Type descriptor for GObject references.
///
/// GObjects are reference-counted objects. The `is_borrowed` flag indicates
/// whether ownership is transferred (the caller must unref) or borrowed
/// (the callee owns the reference).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GObjectType {
    /// Whether the reference is borrowed from the callee.
    pub is_borrowed: bool,
}

impl GObjectType {
    /// Creates a new GObject type descriptor.
    pub fn new(is_borrowed: bool) -> Self {
        GObjectType { is_borrowed }
    }

    /// Parses a GObject type from a JavaScript object.
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

impl From<&GObjectType> for ffi::Type {
    fn from(_value: &GObjectType) -> Self {
        ffi::Type::pointer()
    }
}
