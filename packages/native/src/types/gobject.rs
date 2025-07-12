//! GObject Type Definitions
//!
//! This module provides type definitions for GTK4 GObject types used in FFI calls.
//! GObjects are the fundamental object type in GTK4, providing reference counting
//! and other object-oriented features.

use libffi::middle as ffi;
use neon::prelude::*;

/// Represents a GTK4 GObject type specification.
///
/// This struct defines how a GObject should be handled in FFI calls,
/// particularly regarding reference counting and ownership semantics.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GObjectType {
    /// Whether the GObject reference is borrowed or owned
    ///
    /// - `true`: The reference is borrowed (caller retains ownership)
    /// - `false`: The reference is owned (callee takes ownership)
    pub is_borrowed: bool,
}

impl GObjectType {
    /// Creates a new GObjectType with the specified ownership semantics.
    ///
    /// # Arguments
    ///
    /// * `is_borrowed` - Whether the reference is borrowed or owned
    ///
    /// # Returns
    ///
    /// Returns a new GObjectType with the specified ownership semantics.
    pub fn new(is_borrowed: bool) -> Self {
        GObjectType { is_borrowed }
    }

    /// Creates a GObjectType from a JavaScript type description object.
    ///
    /// # Arguments
    ///
    /// * `cx` - Neon function context
    /// * `value` - JavaScript object with a 'borrowed' property
    ///
    /// # Returns
    ///
    /// Returns a GObjectType representing the JavaScript type description.
    /// If the 'borrowed' property is not present, defaults to `false` (owned).
    ///
    /// # Errors
    ///
    /// Returns a JavaScript error if the type description is invalid.
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

impl Into<ffi::Type> for &GObjectType {
    /// Converts the GObjectType to a libffi type.
    ///
    /// GObjects are always represented as pointers in C, regardless of
    /// their ownership semantics. The ownership affects how the reference
    /// counting is handled, not the FFI type.
    fn into(self) -> ffi::Type {
        ffi::Type::pointer()
    }
}

impl Into<ffi::Type> for GObjectType {
    fn into(self) -> ffi::Type {
        (&self).into()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gobject_type_creation() {
        let borrowed = GObjectType::new(true);
        let owned = GObjectType::new(false);

        assert_eq!(borrowed.is_borrowed, true);
        assert_eq!(owned.is_borrowed, false);
    }

    #[test]
    fn test_gobject_type_equality() {
        let type1 = GObjectType::new(true);
        let type2 = GObjectType::new(true);
        let type3 = GObjectType::new(false);

        assert_eq!(type1, type2);
        assert_ne!(type1, type3);
    }

    #[test]
    fn test_ffi_type_conversion() {
        let borrowed_type = GObjectType::new(true);
        let owned_type = GObjectType::new(false);

        // Test that conversion works without panicking
        let _: ffi::Type = (&borrowed_type).into();
        let _: ffi::Type = (&owned_type).into();

        // Test owned conversion
        let _: ffi::Type = borrowed_type.into();
        let _: ffi::Type = owned_type.into();
    }

    #[test]
    fn test_debug_output() {
        let gobject_type = GObjectType::new(true);
        let debug_str = format!("{:?}", gobject_type);
        assert!(debug_str.contains("GObjectType"));
        assert!(debug_str.contains("true"));
    }

    #[test]
    fn test_clone() {
        let original = GObjectType::new(false);
        let cloned = original.clone();
        assert_eq!(original, cloned);
        assert_eq!(original.is_borrowed, cloned.is_borrowed);
    }

    #[test]
    fn test_borrowed_vs_owned() {
        let borrowed = GObjectType::new(true);
        let owned = GObjectType::new(false);

        assert!(borrowed.is_borrowed);
        assert!(!owned.is_borrowed);
        assert_ne!(borrowed, owned);
    }

    #[test]
    fn test_default_ownership_semantics() {
        // Test the typical cases
        let default_owned = GObjectType::new(false);
        let explicit_borrowed = GObjectType::new(true);

        // Default should be owned (false)
        assert!(!default_owned.is_borrowed);
        assert!(explicit_borrowed.is_borrowed);
    }
}
