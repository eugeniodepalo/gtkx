//! Type System
//!
//! This module provides a comprehensive type system for representing GTK4 types
//! in a way that can be safely passed between JavaScript and C code. It handles
//! type conversion, validation, and FFI type mapping for all supported GTK4 types.

use libffi::middle as ffi;
use neon::prelude::*;

mod array;
mod boxed;
mod float;
mod gobject;
mod integer;

pub use array::*;
pub use boxed::*;
pub use float::*;
pub use gobject::*;
pub use integer::*;

/// Represents all possible types that can be used in GTK4 FFI calls.
///
/// This enum provides a type-safe way to represent GTK4 types that can be
/// converted between JavaScript and C representations. Each variant corresponds
/// to a specific category of GTK4 types and provides appropriate conversion
/// methods for use with libffi.
#[derive(Debug, Clone)]
pub enum Type {
    /// Integer types with configurable size and signedness
    Integer(IntegerType),
    /// Floating-point types with configurable precision
    Float(FloatType),
    /// UTF-8 strings (mapped to C char*)
    String,
    /// Null pointer type
    Null,
    /// Boolean type (mapped to C uint8)
    Boolean,
    /// GTK4 GObject types with reference counting
    GObject(GObjectType),
    /// GTK4 boxed types with GLib memory management
    Boxed(BoxedType),
    /// Arrays of supported types
    Array(ArrayType),
    /// Callback function types
    Callback,
}

impl Type {
    /// Creates a Type from a JavaScript type description object.
    ///
    /// # Arguments
    ///
    /// * `cx` - Neon function context
    /// * `value` - JavaScript object containing type information
    ///
    /// # Returns
    ///
    /// Returns a Type enum variant corresponding to the JavaScript type description.
    ///
    /// # Errors
    ///
    /// Returns a JavaScript error if the type description is invalid or unsupported.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let type_value: Handle<'_, JsValue> = obj.prop(cx, "type").get()?;

        let type_ = type_value
            .downcast::<JsString, _>(cx)
            .or_throw(cx)?
            .value(cx);

        match type_.as_str() {
            "int" => Ok(Type::Integer(IntegerType::from_js_value(cx, value)?)),
            "float" => Ok(Type::Float(FloatType::from_js_value(cx, value)?)),
            "string" => Ok(Type::String),
            "boolean" => Ok(Type::Boolean),
            "null" => Ok(Type::Null),
            "gobject" => Ok(Type::GObject(GObjectType::from_js_value(cx, value)?)),
            "boxed" => Ok(Type::Boxed(BoxedType::from_js_value(cx, value)?)),
            "array" => Ok(Type::Array(ArrayType::from_js_value(cx, obj.upcast())?)),
            "callback" => Ok(Type::Callback),
            _ => cx.throw_type_error("Unknown type"),
        }
    }
}

impl Into<ffi::Type> for &Type {
    fn into(self) -> ffi::Type {
        match self {
            Type::Integer(type_) => type_.into(),
            Type::Float(type_) => type_.into(),
            Type::String => ffi::Type::pointer(),
            Type::Boolean => ffi::Type::u8(),
            Type::Null => ffi::Type::pointer(),
            Type::GObject(type_) => type_.into(),
            Type::Boxed(type_) => type_.into(),
            Type::Array(type_) => type_.into(),
            Type::Callback => ffi::Type::pointer(),
        }
    }
}

impl Into<ffi::Type> for Type {
    fn into(self) -> ffi::Type {
        (&self).into()
    }
}
