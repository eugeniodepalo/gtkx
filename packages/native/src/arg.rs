//! Function argument representation combining type and value.
//!
//! [`Arg`] pairs a [`Type`] descriptor with a [`Value`], representing a single
//! argument to an FFI function call. Arguments are parsed from JavaScript
//! objects containing `type`, `value`, and optional `optional` properties.
//!
//! ## Structure
//!
//! ```text
//! { type: TypeDescriptor, value: any, optional?: boolean }
//! ```
//!
//! The `optional` flag allows null/undefined values for otherwise required types,
//! converting them to appropriate defaults (null pointers, zero values).

use napi::bindgen_prelude::*;
use napi::{Env, JsObject};

use crate::{types::Type, value::Value};

#[derive(Debug, Clone)]
pub struct Arg {
    pub ty: Type,
    pub value: Value,
    pub optional: bool,
}

impl Arg {
    #[must_use]
    pub fn new(ty: Type, value: Value) -> Self {
        Self {
            ty,
            value,
            optional: false,
        }
    }

    pub fn from_js_array(env: &Env, value: &Array) -> napi::Result<Vec<Self>> {
        let len = value.len();
        let mut args = Vec::with_capacity(len as usize);

        for i in 0..len {
            let item: Unknown<'_> = value.get(i)?.ok_or_else(|| {
                napi::Error::new(
                    napi::Status::GenericFailure,
                    format!("Argument array element {i} missing"),
                )
            })?;
            args.push(Self::from_js_value(env, item)?);
        }

        Ok(args)
    }

    pub fn from_js_value(env: &Env, value: Unknown<'_>) -> napi::Result<Self> {
        let obj: JsObject = unsafe { JsObject::from_napi_value(env.raw(), value.raw())? };
        let type_prop: Unknown<'_> = obj.get_named_property("type")?;
        let value_prop: Unknown<'_> = obj.get_named_property("value")?;
        let ty = Type::from_js_value(env, type_prop)?;
        let value = Value::from_js_value(env, value_prop)?;

        let optional = obj
            .get_named_property::<Option<bool>>("optional")
            .ok()
            .flatten()
            .unwrap_or(false);

        Ok(Self {
            ty,
            value,
            optional,
        })
    }
}
