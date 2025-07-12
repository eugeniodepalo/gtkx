//! Value Conversion and Representation
//!
//! This module provides the `Value` enum and related functionality for representing
//! JavaScript values in Rust and converting between different type systems.
//! It handles conversion between JavaScript values, Rust values, and GLib values.

use std::ffi::c_void;
use std::sync::Arc;

use anyhow::{bail, Result as AnyhowResult};
use gtk4::glib;
use neon::object::Object as _;
use neon::prelude::*;

use crate::object::{Boxed, Object};
use crate::state::ObjectId;

/// Represents a JavaScript value in Rust.
///
/// This enum provides a safe way to represent JavaScript values that can be
/// converted to C types for FFI calls. It supports all the basic JavaScript
/// types plus GTK4-specific types like object references and callbacks.
#[derive(Debug)]
pub enum Value {
    /// A JavaScript number (64-bit floating point)
    Number(f64),
    /// A JavaScript string (UTF-8)
    String(String),
    /// A JavaScript boolean
    Boolean(bool),
    /// A GTK4 object reference (GObject or Boxed)
    Object(ObjectId),
    /// A JavaScript null value
    Null,
    /// A JavaScript array of values
    Array(Vec<Value>),
    /// A JavaScript callback function with its execution channel
    Callback(Arc<Root<JsFunction>>, Channel),
}

impl Value {
    /// Creates a Value from a JavaScript value.
    ///
    /// This method examines the JavaScript value and creates the appropriate
    /// Rust representation. It handles all supported JavaScript types and
    /// performs necessary conversions.
    ///
    /// # Arguments
    ///
    /// * `cx` - Neon function context
    /// * `value` - JavaScript value to convert
    ///
    /// # Returns
    ///
    /// Returns a `Value` enum representing the JavaScript value.
    ///
    /// # Errors
    ///
    /// Returns a JavaScript error if the value type is not supported.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        if let Ok(number) = value.downcast::<JsNumber, _>(cx) {
            return Ok(Value::Number(number.value(cx)));
        }

        if let Ok(string) = value.downcast::<JsString, _>(cx) {
            return Ok(Value::String(string.value(cx)));
        }

        if let Ok(boolean) = value.downcast::<JsBoolean, _>(cx) {
            return Ok(Value::Boolean(boolean.value(cx)));
        }

        if let Ok(_) = value.downcast::<JsNull, _>(cx) {
            return Ok(Value::Null);
        }

        if let Ok(object_id) = value.downcast::<JsBox<ObjectId>, _>(cx) {
            return Ok(Value::Object(object_id.as_inner().clone()));
        }

        if let Ok(callback) = value.downcast::<JsFunction, _>(cx) {
            return Ok(Value::Callback(Arc::new(callback.root(cx)), cx.channel()));
        }

        if let Ok(array) = value.downcast::<JsArray, _>(cx) {
            let values = array.to_vec(cx)?;
            let mut vec_values = Vec::with_capacity(values.len());

            for item in values {
                vec_values.push(Self::from_js_value(cx, item)?);
            }

            return Ok(Value::Array(vec_values));
        }

        cx.throw_type_error("Unsupported JS value type")
    }

    /// Converts the Value to a JavaScript value.
    ///
    /// This method performs the reverse conversion, taking a Rust Value
    /// and creating the appropriate JavaScript representation.
    ///
    /// # Arguments
    ///
    /// * `cx` - Neon context for creating JavaScript values
    ///
    /// # Returns
    ///
    /// Returns a JavaScript value handle.
    ///
    /// # Errors
    ///
    /// Returns a JavaScript error if the conversion fails or the value
    /// type is not supported for JavaScript conversion.
    pub fn to_js_value<'a, C: Context<'a>>(&self, cx: &mut C) -> NeonResult<Handle<'a, JsValue>> {
        match self {
            Value::Number(n) => Ok(cx.number(*n).upcast()),
            Value::String(s) => Ok(cx.string(s).upcast()),
            Value::Boolean(b) => Ok(cx.boolean(*b).upcast()),
            Value::Object(id) => Ok(cx.boxed(id.clone()).upcast()),
            Value::Array(arr) => {
                let js_array = cx.empty_array();
                for (i, item) in arr.iter().enumerate() {
                    let js_item = item.to_js_value(cx)?;
                    js_array.set(cx, i as u32, js_item)?;
                }
                Ok(js_array.upcast())
            }
            _ => cx.throw_type_error("Unsupported Value type for JS conversion"),
        }
    }

    /// Attempts to create a Value from a GLib value.
    ///
    /// This method handles conversion from GLib's type system to the Rust
    /// Value representation. It supports all the basic GLib types and
    /// GTK4 object types.
    ///
    /// # Arguments
    ///
    /// * `value` - GLib value to convert
    ///
    /// # Returns
    ///
    /// Returns a `Value` representing the GLib value.
    ///
    /// # Errors
    ///
    /// Returns an error if the GLib value type is not supported.
    pub fn try_from_glib_value(value: &glib::Value) -> AnyhowResult<Self> {
        if value.is_type(glib::types::Type::I8) {
            Ok(Value::Number(value.get::<i8>().unwrap() as f64))
        } else if value.is_type(glib::types::Type::U8) {
            Ok(Value::Number(value.get::<u8>().unwrap() as f64))
        } else if value.is_type(glib::types::Type::I32) {
            Ok(Value::Number(value.get::<i32>().unwrap() as f64))
        } else if value.is_type(glib::types::Type::U32) {
            Ok(Value::Number(value.get::<u32>().unwrap() as f64))
        } else if value.is_type(glib::types::Type::I64) {
            Ok(Value::Number(value.get::<i64>().unwrap() as f64))
        } else if value.is_type(glib::types::Type::U64) {
            Ok(Value::Number(value.get::<u64>().unwrap() as f64))
        } else if value.is_type(glib::types::Type::F32) {
            Ok(Value::Number(value.get::<f32>().unwrap() as f64))
        } else if value.is_type(glib::types::Type::F64) {
            Ok(Value::Number(value.get::<f64>().unwrap()))
        } else if value.is_type(glib::types::Type::STRING) {
            let string: String = value.get().unwrap();
            Ok(Value::String(string))
        } else if value.is_type(glib::types::Type::BOOL) {
            let boolean: bool = value.get().unwrap();
            Ok(Value::Boolean(boolean))
        } else if value.is_type(glib::types::Type::OBJECT) {
            let object: glib::Object = value.get().unwrap();
            let object_id = ObjectId::new(Object::GObject(object));
            Ok(Value::Object(object_id))
        } else if value.is_type(glib::types::Type::BOXED) {
            let boxed_ptr = value.as_ptr();
            let boxed = Boxed::from_glib_none(value.type_(), boxed_ptr as *mut c_void);
            let object_id = ObjectId::new(Object::Boxed(boxed));
            Ok(Value::Object(object_id))
        } else {
            bail!("Unsupported glib value type: {:?}", value.type_());
        }
    }
}
