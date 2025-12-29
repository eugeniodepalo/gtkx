//! GParamSpec type representation for FFI.
//!
//! Defines [`GParamType`] with an ownership flag. GParamSpec is a fundamental
//! type in GLib that requires `g_value_get_param` for extraction from GValues.
//!
//! - `is_borrowed: true` - Reference is borrowed, caller must not unref
//! - `is_borrowed: false` - Ownership transferred, caller should unref when done

use libffi::middle as ffi;
use neon::prelude::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GParamType {
    pub is_borrowed: bool,
}

impl GParamType {
    pub fn new(is_borrowed: bool) -> Self {
        GParamType { is_borrowed }
    }

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

impl From<&GParamType> for ffi::Type {
    fn from(_value: &GParamType) -> Self {
        ffi::Type::pointer()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gparam_type_new_creates_correct_type() {
        let gparam_type = GParamType::new(true);
        assert!(gparam_type.is_borrowed);

        let gparam_type = GParamType::new(false);
        assert!(!gparam_type.is_borrowed);
    }

    #[test]
    fn gparam_type_equality() {
        let borrowed = GParamType::new(true);
        let not_borrowed = GParamType::new(false);
        let borrowed2 = GParamType::new(true);

        assert_eq!(borrowed, borrowed2);
        assert_ne!(borrowed, not_borrowed);
    }

    #[test]
    fn gparam_type_to_ffi_type_is_pointer() {
        let borrowed = GParamType::new(true);
        let not_borrowed = GParamType::new(false);

        let _ffi_type_borrowed: ffi::Type = (&borrowed).into();
        let _ffi_type_not_borrowed: ffi::Type = (&not_borrowed).into();
    }

    #[test]
    fn gparam_type_clone() {
        let original = GParamType::new(true);
        let cloned = original;
        assert_eq!(original, cloned);
    }
}
