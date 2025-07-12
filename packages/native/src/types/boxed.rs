//! Boxed Type Definitions
//!
//! This module provides type definitions for GTK4 boxed types used in FFI calls.
//! Boxed types are simple data structures that use GLib's type system for
//! memory management and reference counting.

use libffi::middle as ffi;
use neon::prelude::*;

/// Represents a GTK4 boxed type specification.
///
/// This struct defines how a boxed type should be handled in FFI calls,
/// including its GLib type name and ownership semantics.
#[derive(Debug, Clone)]
pub struct BoxedType {
    /// Whether the boxed type reference is borrowed or owned
    ///
    /// - `true`: The reference is borrowed (caller retains ownership)
    /// - `false`: The reference is owned (callee takes ownership)
    pub is_borrowed: bool,
    /// The GLib type name of the boxed type (e.g., "GdkRectangle")
    pub type_: String,
}

impl BoxedType {
    /// Creates a new BoxedType with the specified ownership and type name.
    ///
    /// # Arguments
    ///
    /// * `is_borrowed` - Whether the reference is borrowed or owned
    /// * `type_` - The GLib type name of the boxed type
    ///
    /// # Returns
    ///
    /// Returns a new BoxedType with the specified configuration.
    pub fn new(is_borrowed: bool, type_: String) -> Self {
        BoxedType { is_borrowed, type_ }
    }

    /// Creates a BoxedType from a JavaScript type description object.
    ///
    /// # Arguments
    ///
    /// * `cx` - Neon function context
    /// * `value` - JavaScript object with 'borrowed' and 'type' properties
    ///
    /// # Returns
    ///
    /// Returns a BoxedType representing the JavaScript type description.
    /// If the 'borrowed' property is not present, defaults to `false` (owned).
    ///
    /// # Errors
    ///
    /// Returns a JavaScript error if the type description is invalid or
    /// if the 'type' property is missing.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let is_borrowed_prop: Handle<'_, JsValue> = obj.prop(cx, "borrowed").get()?;

        let is_borrowed = is_borrowed_prop
            .downcast::<JsBoolean, _>(cx)
            .map(|b| b.value(cx))
            .unwrap_or(false);

        let type_prop: Handle<'_, JsValue> = obj.prop(cx, "type").get()?;

        let type_ = type_prop
            .downcast::<JsString, _>(cx)
            .or_throw(cx)?
            .value(cx);

        Ok(Self::new(is_borrowed, type_))
    }
}

impl Into<ffi::Type> for &BoxedType {
    /// Converts the BoxedType to a libffi type.
    ///
    /// Boxed types are always represented as pointers in C, regardless of
    /// their ownership semantics. The ownership affects how the reference
    /// counting is handled, not the FFI type.
    fn into(self) -> ffi::Type {
        ffi::Type::pointer()
    }
}

impl Into<ffi::Type> for BoxedType {
    fn into(self) -> ffi::Type {
        (&self).into()
    }
}
