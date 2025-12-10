//! FFI function argument handling.
//!
//! This module provides the [`Arg`] struct for representing typed arguments
//! to native function calls.

use neon::{object::Object as _, prelude::*};

use crate::{types::Type, value::Value};

/// A typed argument for an FFI function call.
///
/// Combines a type descriptor with the actual value, plus metadata about
/// whether the argument is optional.
#[derive(Debug, Clone)]
pub struct Arg {
    /// The type descriptor for this argument.
    pub type_: Type,
    /// The actual value.
    pub value: Value,
    /// Whether this argument can accept null/undefined.
    pub optional: bool,
}

impl Arg {
    /// Creates a new non-optional argument.
    pub fn new(type_: Type, value: Value) -> Self {
        Arg {
            type_,
            value,
            optional: false,
        }
    }

    /// Parses an array of arguments from a JavaScript array.
    ///
    /// # Errors
    ///
    /// Returns a `NeonResult` error if any element cannot be parsed.
    pub fn from_js_array(
        cx: &mut FunctionContext,
        value: Handle<JsArray>,
    ) -> NeonResult<Vec<Self>> {
        let array = value.to_vec(cx)?;
        let mut args = Vec::with_capacity(array.len());

        for item in array {
            args.push(Self::from_js_value(cx, item)?);
        }

        Ok(args)
    }

    /// Parses an argument from a JavaScript object.
    ///
    /// The object must have `type` and `value` properties, and optionally
    /// an `optional` boolean property.
    ///
    /// # Errors
    ///
    /// Returns a `NeonResult` error if the object is malformed.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let type_prop: Handle<'_, JsValue> = obj.prop(cx, "type").get()?;
        let value_prop: Handle<'_, JsValue> = obj.prop(cx, "value").get()?;
        let type_ = Type::from_js_value(cx, type_prop)?;
        let value = Value::from_js_value(cx, value_prop)?;

        let optional_prop: Option<Handle<JsBoolean>> = obj.get_opt(cx, "optional")?;
        let optional = optional_prop.map(|h| h.value(cx)).unwrap_or(false);

        Ok(Arg {
            type_,
            value,
            optional,
        })
    }
}
