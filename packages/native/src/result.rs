//! Return Value Handling
//!
//! This module provides types and functionality for handling return values from
//! GTK4 function calls. It manages the conversion between C return values and
//! JavaScript values, including proper type mapping and error handling.

use crate::{
    state::ObjectId,
    types::{ArrayType, BoxedType, FloatType, GObjectType, IntegerType},
};
use anyhow::{bail, Result as AnyhowResult};
use gtk4::glib;
use libffi::middle as ffi;
use neon::prelude::*;

/// Represents the expected return type of a GTK4 function call.
///
/// This enum describes what type of value a GTK4 function is expected to return,
/// allowing the FFI call mechanism to properly handle the return value conversion.
/// It parallels the `Type` enum but is specifically for return values.
pub enum ResultType {
    /// Function returns nothing (void)
    Void,
    /// Function returns a null pointer
    Null,
    /// Function returns an integer value
    Integer(IntegerType),
    /// Function returns a floating-point value
    Float(FloatType),
    /// Function returns a string (char*)
    String,
    /// Function returns a boolean value
    Boolean,
    /// Function returns a GObject reference
    GObject(GObjectType),
    /// Function returns a boxed type reference
    Boxed(BoxedType),
    /// Function returns an array of values
    Array(ArrayType),
    /// Function returns a callback function pointer
    Callback,
}

impl ResultType {
    /// Creates a ResultType from a JavaScript type description object.
    ///
    /// # Arguments
    ///
    /// * `cx` - Neon function context
    /// * `value` - JavaScript object describing the expected return type
    ///
    /// # Returns
    ///
    /// Returns a `ResultType` enum variant corresponding to the JavaScript description.
    ///
    /// # Errors
    ///
    /// Returns a JavaScript error if the type description is invalid.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let type_prop: Handle<'_, JsValue> = obj.prop(cx, "type").get()?;

        let type_ = type_prop
            .downcast::<JsString, _>(cx)
            .or_throw(cx)?
            .value(cx);

        match type_.as_str() {
            "void" => Ok(ResultType::Void),
            "null" => Ok(ResultType::Null),
            "int" => Ok(ResultType::Integer(IntegerType::from_js_value(cx, value)?)),
            "float" => Ok(ResultType::Float(FloatType::from_js_value(cx, value)?)),
            "string" => Ok(ResultType::String),
            "boolean" => Ok(ResultType::Boolean),
            "gobject" => Ok(ResultType::GObject(GObjectType::from_js_value(cx, value)?)),
            "boxed" => Ok(ResultType::Boxed(BoxedType::from_js_value(cx, value)?)),
            "array" => Ok(ResultType::Array(ArrayType::from_js_value(
                cx,
                obj.upcast(),
            )?)),
            "callback" => Ok(ResultType::Callback),
            _ => cx.throw_type_error("Unknown return type"),
        }
    }
}

impl Into<ffi::Type> for &ResultType {
    fn into(self) -> ffi::Type {
        match self {
            ResultType::Void => ffi::Type::void(),
            ResultType::Null => ffi::Type::pointer(),
            ResultType::Integer(type_) => type_.into(),
            ResultType::Float(type_) => type_.into(),
            ResultType::String => ffi::Type::pointer(),
            ResultType::Boolean => ffi::Type::u8(),
            ResultType::GObject(type_) => type_.into(),
            ResultType::Boxed(type_) => type_.into(),
            ResultType::Array(type_) => type_.into(),
            ResultType::Callback => ffi::Type::pointer(),
        }
    }
}

impl Into<ffi::Type> for ResultType {
    fn into(self) -> ffi::Type {
        (&self).into()
    }
}

/// Represents the actual return value from a GTK4 function call.
///
/// This enum holds the converted return value from a GTK4 function call.
/// It provides a unified representation that can be easily converted to
/// JavaScript values for return to the Node.js side.
pub enum Result {
    /// No return value (void functions)
    Void,
    /// Null pointer return value
    Null,
    /// Numeric return value (integers and floats)
    Number(f64),
    /// String return value
    String(String),
    /// Boolean return value
    Boolean(bool),
    /// Object return value (GObject or Boxed)
    Object(ObjectId),
}

impl Result {
    /// Creates a Result from a JavaScript value.
    ///
    /// This method is used primarily for callback return values, where
    /// JavaScript code returns a value that needs to be converted back
    /// to a C-compatible type.
    ///
    /// # Arguments
    ///
    /// * `cx` - Neon context
    /// * `value` - JavaScript value to convert
    ///
    /// # Returns
    ///
    /// Returns a `Result` representing the JavaScript value.
    ///
    /// # Errors
    ///
    /// Returns a JavaScript error if the value type is not supported.
    pub fn from_js_value(cx: &mut Cx, value: Handle<JsValue>) -> NeonResult<Self> {
        if let Ok(number) = value.downcast::<JsNumber, _>(cx) {
            return Ok(Result::Number(number.value(cx)));
        }

        if let Ok(string) = value.downcast::<JsString, _>(cx) {
            return Ok(Result::String(string.value(cx)));
        }

        if let Ok(boolean) = value.downcast::<JsBoolean, _>(cx) {
            return Ok(Result::Boolean(boolean.value(cx)));
        }

        if let Ok(object_id) = value.downcast::<JsBox<ObjectId>, _>(cx) {
            return Ok(Result::Object(object_id.as_inner().clone()));
        }

        if let Ok(_) = value.downcast::<JsUndefined, _>(cx) {
            return Ok(Result::Null);
        }

        if let Ok(_) = value.downcast::<JsNull, _>(cx) {
            return Ok(Result::Null);
        }

        cx.throw_type_error("Unsupported JS value type for return value")
    }

    /// Attempts to convert the Result to a GLib value.
    ///
    /// This method is used primarily for callback return values, where
    /// the Result needs to be converted to a GLib value that can be
    /// passed back to GTK4 functions.
    ///
    /// # Returns
    ///
    /// Returns an optional GLib value. `None` is returned for void or
    /// null results.
    ///
    /// # Errors
    ///
    /// Returns an error if the conversion is not supported or fails.
    pub fn try_to_glib_value(&self) -> AnyhowResult<Option<glib::Value>> {
        match self {
            Result::Number(n) => Ok(Some((*n).into())),
            Result::String(s) => Ok(Some(s.clone().into())),
            Result::Boolean(b) => Ok(Some((*b).into())),
            Result::Null => Ok(None),
            Result::Void => Ok(None),
            Result::Object(_) => bail!("Unsupported Value type for GLib conversion: Object"),
        }
    }
}
