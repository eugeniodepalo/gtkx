//! Boxed type descriptor.

use gtk4::glib::{self, translate::FromGlib as _};
use libffi::middle as ffi;
use neon::prelude::*;

use crate::state::GtkThreadState;

/// Type descriptor for GLib boxed types.
///
/// Boxed types are heap-allocated structs that are copied and freed using
/// type-specific functions registered with the GLib type system.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BoxedType {
    /// Whether the memory is borrowed from the callee.
    pub is_borrowed: bool,
    /// The GLib type name (e.g., "GdkRGBA").
    pub type_: String,
    /// Optional library name for dynamic type lookup.
    pub lib: Option<String>,
}

impl BoxedType {
    /// Creates a new boxed type descriptor.
    pub fn new(is_borrowed: bool, type_: String, lib: Option<String>) -> Self {
        BoxedType {
            is_borrowed,
            type_,
            lib,
        }
    }

    /// Parses a boxed type from a JavaScript object.
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

        let type_prop: Handle<'_, JsValue> = obj.prop(cx, "innerType").get()?;

        let type_ = type_prop
            .downcast::<JsString, _>(cx)
            .or_throw(cx)?
            .value(cx);

        let lib_prop: Handle<'_, JsValue> = obj.prop(cx, "lib").get()?;

        let lib = lib_prop
            .downcast::<JsString, _>(cx)
            .map(|s| s.value(cx))
            .ok();

        Ok(Self::new(is_borrowed, type_, lib))
    }

    /// Gets the GLib type for this boxed type.
    ///
    /// First tries to look up the type by name. If not registered, tries to
    /// load it dynamically from the specified library.
    pub fn get_gtype(&self) -> Option<glib::Type> {
        if let Some(gtype) = glib::Type::from_name(&self.type_) {
            return Some(gtype);
        }

        let lib_name = self.lib.as_ref()?;
        let get_type_fn = type_name_to_get_type_fn(&self.type_);

        GtkThreadState::with(|state| {
            let library = state.get_library(lib_name).ok()?;
            let symbol = unsafe {
                library
                    .get::<unsafe extern "C" fn() -> glib::ffi::GType>(get_type_fn.as_bytes())
                    .ok()?
            };
            let gtype_raw = unsafe { symbol() };
            let gtype = unsafe { glib::Type::from_glib(gtype_raw) };
            Some(gtype)
        })
    }
}

fn type_name_to_get_type_fn(type_name: &str) -> String {
    let mut result = String::new();

    for c in type_name.chars() {
        if c.is_uppercase() {
            if !result.is_empty() {
                result.push('_');
            }
            result.push(c.to_ascii_lowercase());
        } else {
            result.push(c);
        }
    }

    result.push_str("_get_type");
    result
}

impl From<&BoxedType> for ffi::Type {
    fn from(_value: &BoxedType) -> Self {
        ffi::Type::pointer()
    }
}
