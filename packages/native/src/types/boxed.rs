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
#[derive(Debug, Clone, PartialEq, Eq)]
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_boxed_type_creation() {
        let borrowed = BoxedType::new(true, "GdkRectangle".to_string());
        let owned = BoxedType::new(false, "GdkPixbuf".to_string());

        assert_eq!(borrowed.is_borrowed, true);
        assert_eq!(borrowed.type_, "GdkRectangle");
        assert_eq!(owned.is_borrowed, false);
        assert_eq!(owned.type_, "GdkPixbuf");
    }

    #[test]
    fn test_boxed_type_equality() {
        let type1 = BoxedType::new(true, "GdkRectangle".to_string());
        let type2 = BoxedType::new(true, "GdkRectangle".to_string());
        let type3 = BoxedType::new(false, "GdkRectangle".to_string());
        let type4 = BoxedType::new(true, "GdkPixbuf".to_string());

        assert_eq!(type1, type2);
        assert_ne!(type1, type3); // Different ownership
        assert_ne!(type1, type4); // Different type name
    }

    #[test]
    fn test_ffi_type_conversion() {
        let borrowed_type = BoxedType::new(true, "GdkRectangle".to_string());
        let owned_type = BoxedType::new(false, "GdkPixbuf".to_string());

        // Test that conversion works without panicking
        let _: ffi::Type = (&borrowed_type).into();
        let _: ffi::Type = (&owned_type).into();

        // Test owned conversion
        let _: ffi::Type = borrowed_type.into();
        let _: ffi::Type = owned_type.into();
    }

    #[test]
    fn test_debug_output() {
        let boxed_type = BoxedType::new(false, "GdkRectangle".to_string());
        let debug_str = format!("{:?}", boxed_type);
        assert!(debug_str.contains("BoxedType"));
        assert!(debug_str.contains("GdkRectangle"));
        assert!(debug_str.contains("false"));
    }

    #[test]
    fn test_clone() {
        let original = BoxedType::new(true, "GdkPixbuf".to_string());
        let cloned = original.clone();
        assert_eq!(original, cloned);
        assert_eq!(original.is_borrowed, cloned.is_borrowed);
        assert_eq!(original.type_, cloned.type_);
    }

    #[test]
    fn test_borrowed_vs_owned() {
        let borrowed = BoxedType::new(true, "GdkRectangle".to_string());
        let owned = BoxedType::new(false, "GdkRectangle".to_string());

        assert!(borrowed.is_borrowed);
        assert!(!owned.is_borrowed);
        assert_ne!(borrowed, owned);
        assert_eq!(borrowed.type_, owned.type_); // Same type name
    }

    #[test]
    fn test_common_gtk_types() {
        let types = [
            "GdkRectangle",
            "GdkPixbuf",
            "GdkRGBA",
            "GtkBorder",
            "GtkRequisition",
            "PangoFontDescription",
        ];

        for type_name in types {
            let boxed_type = BoxedType::new(false, type_name.to_string());
            assert_eq!(boxed_type.type_, type_name);
            assert!(!boxed_type.is_borrowed); // Default owned
        }
    }

    #[test]
    fn test_empty_type_name() {
        let empty_type = BoxedType::new(true, String::new());
        assert!(empty_type.type_.is_empty());
        assert!(empty_type.is_borrowed);
    }

    #[test]
    fn test_long_type_name() {
        let long_name = "Very".repeat(100);
        let boxed_type = BoxedType::new(false, long_name.clone());
        assert_eq!(boxed_type.type_, long_name);
        assert_eq!(boxed_type.type_.len(), 400); // "Very" * 100 = 400 chars
    }
}
