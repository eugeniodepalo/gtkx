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

use super::handler::{ModuleRequest, dispatch_request};
use crate::managed::NativeHandle;
use crate::types::{RawPtrCodec as _, Type};
use crate::value::Value;

fn require_non_null(addr: usize) -> anyhow::Result<*mut c_void> {
    if addr == 0 {
        anyhow::bail!("NativeHandle has a null pointer");
    }
    Ok(addr as *mut c_void)
}

struct ReadRequest {
    base_addr: usize,
    field_type: Type,
    offset: usize,
}

impl ModuleRequest for ReadRequest {
    type Output = Value;

    fn execute(self) -> anyhow::Result<Value> {
        let base_ptr = require_non_null(self.base_addr)?;
        let field_ptr = unsafe { (base_ptr as *const u8).add(self.offset) as *const c_void };
        self.field_type.read_from_raw_ptr(field_ptr, "field read")
    }

    fn error_context() -> &'static str {
        "field read"
    }
}

#[napi]
pub fn read<'env>(
    env: &'env Env,
    handle: &External<NativeHandle>,
    js_type: Unknown<'_>,
    offset: f64,
) -> napi::Result<Unknown<'env>> {
    let field_type = Type::from_js_value(env, js_type)?;
    let request = ReadRequest {
        base_addr: handle.ptr_as_usize(),
        field_type,
        offset: offset as usize,
    };
    dispatch_request(env, request)
}

struct WriteRequest {
    base_addr: usize,
    field_type: Type,
    offset: usize,
    value: Value,
}

impl ModuleRequest for WriteRequest {
    type Output = ();

    fn execute(self) -> anyhow::Result<()> {
        let base_ptr = require_non_null(self.base_addr)?;
        let field_ptr = unsafe { (base_ptr as *mut u8).add(self.offset) as *mut c_void };
        self.field_type
            .write_value_to_raw_ptr(field_ptr, &self.value)
    }

    fn error_context() -> &'static str {
        "field write"
    }
}

#[napi]
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
        base_addr: handle.ptr_as_usize(),
        field_type,
        offset: offset as usize,
        value: parsed_value,
    };
    dispatch_request(env, request)
}
