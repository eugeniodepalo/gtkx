//! `GObject` runtime helpers.
//!
//! Provides direct access to `GObject` class metadata so that JavaScript does
//! not need to traverse the `GTypeInstance` → `GTypeClass` → `GObjectClass`
//! chain through several individual FFI dispatches.

use std::ffi::{CString, c_void};

use gtk4::glib::gobject_ffi;
use napi::Env;
use napi::bindgen_prelude::*;
use napi_derive::napi;

use super::handler::{ModuleRequest, dispatch_request};
use crate::managed::NativeHandle;

#[cfg_attr(test, allow(dead_code))]
struct FindObjectPropertyRequest {
    instance_addr: usize,
    property_name: CString,
}

impl ModuleRequest for FindObjectPropertyRequest {
    type Output = Option<NativeHandle>;

    fn execute(self) -> anyhow::Result<Option<NativeHandle>> {
        if self.instance_addr == 0 {
            anyhow::bail!("instance handle has a null pointer");
        }

        let instance = self.instance_addr as *mut gobject_ffi::GTypeInstance;
        let object_class = unsafe { (*instance).g_class.cast::<gobject_ffi::GObjectClass>() };
        if object_class.is_null() {
            anyhow::bail!("instance has no resolved class");
        }

        let pspec = unsafe {
            gobject_ffi::g_object_class_find_property(object_class, self.property_name.as_ptr())
        };

        if pspec.is_null() {
            return Ok(None);
        }

        Ok(Some(NativeHandle::borrowed(pspec.cast::<c_void>())))
    }

    fn error_context() -> &'static str {
        "find_object_property"
    }
}

#[napi]
#[cfg_attr(test, allow(dead_code))]
pub fn find_object_property<'env>(
    env: &'env Env,
    handle: &External<NativeHandle>,
    property_name: String,
) -> napi::Result<Unknown<'env>> {
    let property_name = CString::new(property_name)
        .map_err(|err| napi::Error::new(napi::Status::InvalidArg, err.to_string()))?;
    dispatch_request(
        env,
        FindObjectPropertyRequest {
            instance_addr: handle.ptr_as_usize(),
            property_name,
        },
    )
}

#[cfg_attr(test, allow(dead_code))]
struct GetInstanceGtypeRequest {
    instance_addr: usize,
}

impl ModuleRequest for GetInstanceGtypeRequest {
    type Output = u64;

    fn execute(self) -> anyhow::Result<u64> {
        if self.instance_addr == 0 {
            return Ok(0);
        }
        let instance = self.instance_addr as *mut gobject_ffi::GTypeInstance;
        let g_class = unsafe { (*instance).g_class };
        if g_class.is_null() {
            return Ok(0);
        }
        let gtype = unsafe { (*g_class).g_type };
        Ok(gtype as u64)
    }

    fn error_context() -> &'static str {
        "get_instance_gtype"
    }
}

#[napi]
#[cfg_attr(test, allow(dead_code))]
pub fn get_instance_gtype<'env>(
    env: &'env Env,
    handle: &External<NativeHandle>,
) -> napi::Result<Unknown<'env>> {
    dispatch_request(
        env,
        GetInstanceGtypeRequest {
            instance_addr: handle.ptr_as_usize(),
        },
    )
}
