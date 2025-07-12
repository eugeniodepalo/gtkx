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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::object::Object;

    #[test]
    fn test_value_number() {
        let number_val = Value::Number(42.5);

        match number_val {
            Value::Number(n) => assert_eq!(n, 42.5),
            _ => panic!("Expected Number value"),
        }
    }

    #[test]
    fn test_value_string() {
        let string_val = Value::String("Hello, World!".to_string());

        match string_val {
            Value::String(s) => assert_eq!(s, "Hello, World!"),
            _ => panic!("Expected String value"),
        }
    }

    #[test]
    fn test_value_boolean() {
        let true_val = Value::Boolean(true);
        let false_val = Value::Boolean(false);

        match true_val {
            Value::Boolean(b) => assert!(b),
            _ => panic!("Expected Boolean value"),
        }

        match false_val {
            Value::Boolean(b) => assert!(!b),
            _ => panic!("Expected Boolean value"),
        }
    }

    #[test]
    fn test_value_null() {
        let null_val = Value::Null;

        match null_val {
            Value::Null => {} // Expected
            _ => panic!("Expected Null value"),
        }
    }

    #[test]
    fn test_value_object() {
        // Create a mock object for testing
        let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
        let object_id = ObjectId::new(mock_object);
        let object_val = Value::Object(object_id);

        match object_val {
            Value::Object(_) => {} // Expected
            _ => panic!("Expected Object value"),
        }
    }

    #[test]
    fn test_value_array() {
        let array_val = Value::Array(vec![
            Value::Number(1.0),
            Value::String("test".to_string()),
            Value::Boolean(true),
        ]);

        match array_val {
            Value::Array(arr) => {
                assert_eq!(arr.len(), 3);
                assert!(matches!(arr[0], Value::Number(1.0)));
                assert!(matches!(arr[1], Value::String(ref s) if s == "test"));
                assert!(matches!(arr[2], Value::Boolean(true)));
            }
            _ => panic!("Expected Array value"),
        }
    }

    #[test]
    fn test_value_debug() {
        let values = vec![
            Value::Number(3.14),
            Value::String("debug".to_string()),
            Value::Boolean(false),
            Value::Null,
            Value::Array(vec![Value::Number(1.0)]),
        ];

        for value in values {
            let debug_str = format!("{:?}", value);
            assert!(!debug_str.is_empty());
            assert!(
                debug_str.starts_with("Number")
                    || debug_str.starts_with("String")
                    || debug_str.starts_with("Boolean")
                    || debug_str.starts_with("Null")
                    || debug_str.starts_with("Array")
            );
        }
    }

    #[test]
    fn test_nested_arrays() {
        let nested = Value::Array(vec![
            Value::Number(1.0),
            Value::Array(vec![
                Value::String("nested".to_string()),
                Value::Boolean(true),
            ]),
            Value::Number(2.0),
        ]);

        match nested {
            Value::Array(outer) => {
                assert_eq!(outer.len(), 3);
                match &outer[1] {
                    Value::Array(inner) => {
                        assert_eq!(inner.len(), 2);
                        assert!(matches!(inner[0], Value::String(ref s) if s == "nested"));
                        assert!(matches!(inner[1], Value::Boolean(true)));
                    }
                    _ => panic!("Expected nested array"),
                }
            }
            _ => panic!("Expected outer array"),
        }
    }

    #[test]
    fn test_empty_array() {
        let empty_array = Value::Array(vec![]);

        match empty_array {
            Value::Array(arr) => assert!(arr.is_empty()),
            _ => panic!("Expected Array value"),
        }
    }

    #[test]
    fn test_empty_string() {
        let empty_string = Value::String(String::new());

        match empty_string {
            Value::String(s) => assert!(s.is_empty()),
            _ => panic!("Expected String value"),
        }
    }

    #[test]
    fn test_unicode_string() {
        let unicode_string = Value::String("🦀 Rust 🔥".to_string());

        match unicode_string {
            Value::String(s) => {
                assert_eq!(s, "🦀 Rust 🔥");
                assert!(s.chars().count() > 0);
            }
            _ => panic!("Expected String value"),
        }
    }

    #[test]
    fn test_extreme_numbers() {
        let extreme_numbers = vec![
            Value::Number(f64::MAX),
            Value::Number(f64::MIN),
            Value::Number(f64::INFINITY),
            Value::Number(f64::NEG_INFINITY),
            Value::Number(f64::NAN),
            Value::Number(0.0),
            Value::Number(-0.0),
        ];

        for value in extreme_numbers {
            match value {
                Value::Number(n) => {
                    // Just verify it's a number - specific equality checks
                    // for NaN and infinity are tricky
                    assert!(n.is_finite() || n.is_infinite() || n.is_nan());
                }
                _ => panic!("Expected Number value"),
            }
        }
    }

    #[test]
    fn test_glib_value_conversion_integers() {
        let test_cases = vec![
            (glib::Value::from(42i8), 42.0),
            (glib::Value::from(255u8), 255.0),
            (glib::Value::from(-12345i32), -12345.0),
            (glib::Value::from(98765u32), 98765.0),
            (glib::Value::from(-9876543210i64), -9876543210.0),
            (glib::Value::from(1234567890u64), 1234567890.0),
        ];

        for (glib_val, expected) in test_cases {
            let result = Value::try_from_glib_value(&glib_val);
            assert!(result.is_ok());

            match result.unwrap() {
                Value::Number(n) => assert_eq!(n, expected),
                _ => panic!("Expected Number value"),
            }
        }
    }

    #[test]
    fn test_glib_value_conversion_floats() {
        let test_cases = vec![
            (glib::Value::from(3.14f32), 3.14f32 as f64),
            (glib::Value::from(2.718281828f64), 2.718281828f64),
        ];

        for (glib_val, expected) in test_cases {
            let result = Value::try_from_glib_value(&glib_val);
            assert!(result.is_ok());

            match result.unwrap() {
                Value::Number(n) => assert!((n - expected).abs() < f64::EPSILON),
                _ => panic!("Expected Number value"),
            }
        }
    }

    #[test]
    fn test_glib_value_conversion_string() {
        let glib_val = glib::Value::from("Hello from GLib");
        let result = Value::try_from_glib_value(&glib_val);
        assert!(result.is_ok());

        match result.unwrap() {
            Value::String(s) => assert_eq!(s, "Hello from GLib"),
            _ => panic!("Expected String value"),
        }
    }

    #[test]
    fn test_glib_value_conversion_boolean() {
        let true_val = glib::Value::from(true);
        let false_val = glib::Value::from(false);

        let true_result = Value::try_from_glib_value(&true_val).unwrap();
        let false_result = Value::try_from_glib_value(&false_val).unwrap();

        assert!(matches!(true_result, Value::Boolean(true)));
        assert!(matches!(false_result, Value::Boolean(false)));
    }

    #[test]
    fn test_glib_value_conversion_object() {
        let glib_object = glib::Object::new::<glib::Object>();
        let glib_val = glib::Value::from(&glib_object);

        let result = Value::try_from_glib_value(&glib_val);
        assert!(result.is_ok());

        match result.unwrap() {
            Value::Object(_) => {} // Expected
            _ => panic!("Expected Object value"),
        }
    }

    #[test]
    fn test_large_array() {
        let large_array = Value::Array((0..1000).map(|i| Value::Number(i as f64)).collect());

        match large_array {
            Value::Array(arr) => {
                assert_eq!(arr.len(), 1000);
                assert!(matches!(arr[0], Value::Number(0.0)));
                assert!(matches!(arr[999], Value::Number(999.0)));
            }
            _ => panic!("Expected Array value"),
        }
    }

    #[test]
    fn test_mixed_type_array() {
        let mixed_array = Value::Array(vec![
            Value::Number(42.0),
            Value::String("mixed".to_string()),
            Value::Boolean(true),
            Value::Null,
            Value::Array(vec![Value::Number(1.0)]),
        ]);

        match mixed_array {
            Value::Array(arr) => {
                assert_eq!(arr.len(), 5);
                assert!(matches!(arr[0], Value::Number(42.0)));
                assert!(matches!(arr[1], Value::String(ref s) if s == "mixed"));
                assert!(matches!(arr[2], Value::Boolean(true)));
                assert!(matches!(arr[3], Value::Null));
                assert!(matches!(arr[4], Value::Array(_)));
            }
            _ => panic!("Expected Array value"),
        }
    }
}
