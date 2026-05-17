//! Field access for boxed/structured memory.
//!
//! This module provides read and write access to fields in boxed types at given
//! byte offsets. This enables JavaScript to access struct fields that aren't
//! exposed via GTK property accessors.
//!
//! ## Read Types
//!
//! - `Integer` (all sizes and signs)
//! - `Float` (f32, f64)
//! - `Boolean`
//! - `String` (as pointer to C string)
//! - `GObject` (as pointer to object)
//! - `Boxed` (as pointer to boxed value)
//! - `Fundamental` (as pointer to fundamental value)
//! - `Struct` (as pointer to struct, copied with known size)
//!
//! ## Write Types
//!
//! - `Integer` (all sizes and signs)
//! - `Float` (f32, f64)
//! - `Boolean`
//! - `String` (copies via `g_strdup`)
//! - `GObject` / `Boxed` / `Struct` / `Fundamental` (writes pointer value)

use std::ffi::c_void;

use napi::Env;
use napi::bindgen_prelude::*;
use napi_derive::napi;

use super::handler::ModuleRequest;
use crate::managed::NativeHandle;
use crate::types::{RawPtrCodec as _, Type};
use crate::value::Value;

/// The address of a field inside a boxed/structured native value: the base
/// pointer of the owning allocation plus a byte `offset`.
#[cfg_attr(test, allow(dead_code))]
struct FieldLocation {
    base_addr: usize,
    offset: usize,
}

impl FieldLocation {
    /// Resolves the field's address, failing when the owning handle holds a
    /// null pointer.
    #[cfg_attr(test, allow(dead_code))]
    fn resolve(&self) -> anyhow::Result<*mut c_void> {
        if self.base_addr == 0 {
            anyhow::bail!("NativeHandle has a null pointer");
        }
        Ok(unsafe { (self.base_addr as *mut u8).add(self.offset) as *mut c_void })
    }
}

#[cfg_attr(test, allow(dead_code))]
struct ReadRequest {
    location: FieldLocation,
    field_type: Type,
}

impl ModuleRequest for ReadRequest {
    type Output = Value;

    fn execute(self) -> anyhow::Result<Value> {
        let field_ptr = self.location.resolve()?.cast_const();
        self.field_type.read_from_raw_ptr(field_ptr, "field read")
    }

    fn error_context() -> &'static str {
        "field read"
    }
}

#[napi]
#[cfg_attr(test, allow(dead_code))]
pub fn read<'env>(
    env: &'env Env,
    handle: &External<NativeHandle>,
    js_type: Unknown<'_>,
    offset: f64,
) -> napi::Result<Unknown<'env>> {
    let field_type = Type::from_js_value(env, js_type)?;
    let request = ReadRequest {
        location: FieldLocation {
            base_addr: handle.ptr_as_usize(),
            offset: offset as usize,
        },
        field_type,
    };
    request.dispatch(env)
}

#[cfg_attr(test, allow(dead_code))]
struct WriteRequest {
    location: FieldLocation,
    field_type: Type,
    value: Value,
}

impl ModuleRequest for WriteRequest {
    type Output = ();

    fn execute(self) -> anyhow::Result<()> {
        let field_ptr = self.location.resolve()?;
        self.field_type
            .write_value_to_raw_ptr(field_ptr, &self.value)
    }

    fn error_context() -> &'static str {
        "field write"
    }
}

#[napi]
#[cfg_attr(test, allow(dead_code))]
pub fn write<'env>(
    env: &'env Env,
    handle: &External<NativeHandle>,
    js_type: Unknown<'_>,
    offset: f64,
    value: Unknown<'_>,
) -> napi::Result<Unknown<'env>> {
    let field_type = Type::from_js_value(env, js_type)?;
    let parsed_value = Value::from_js_value(env, value)?;
    let request = WriteRequest {
        location: FieldLocation {
            base_addr: handle.ptr_as_usize(),
            offset: offset as usize,
        },
        field_type,
        value: parsed_value,
    };
    request.dispatch(env)
}
