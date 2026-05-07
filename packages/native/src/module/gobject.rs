//! `GObject` runtime helpers.
//!
//! Provides direct access to `GObject` class metadata so that JavaScript does
//! not need to traverse the `GTypeInstance` → `GTypeClass` → `GObjectClass`
//! chain through several individual FFI dispatches.

use std::ffi::{CStr, CString, c_void};

use gtk4::glib::gobject_ffi;
use napi::Env;
use napi::bindgen_prelude::*;
use napi_derive::napi;

use super::handler::{ModuleRequest, dispatch_request};
use crate::managed::NativeHandle;

struct FindObjectPropertyRequest {
    instance_ptr: *mut c_void,
    property_name: CString,
}

unsafe impl Send for FindObjectPropertyRequest {}

impl ModuleRequest for FindObjectPropertyRequest {
    type Output = Option<NativeHandle>;

    fn execute(self) -> anyhow::Result<Option<NativeHandle>> {
        if self.instance_ptr.is_null() {
            anyhow::bail!("instance handle has a null pointer");
        }

        let instance = self.instance_ptr.cast::<gobject_ffi::GTypeInstance>();
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
            instance_ptr: handle.ptr(),
            property_name,
        },
    )
}

struct GetInstanceTypeNameRequest {
    instance_ptr: *mut c_void,
}

unsafe impl Send for GetInstanceTypeNameRequest {}

impl ModuleRequest for GetInstanceTypeNameRequest {
    type Output = Option<String>;

    fn execute(self) -> anyhow::Result<Option<String>> {
        if self.instance_ptr.is_null() {
            return Ok(None);
        }
        let instance = self.instance_ptr.cast::<gobject_ffi::GTypeInstance>();
        let name = unsafe { gobject_ffi::g_type_name_from_instance(instance) };
        if name.is_null() {
            return Ok(None);
        }
        let owned = unsafe { CStr::from_ptr(name) }
            .to_string_lossy()
            .into_owned();
        Ok(Some(owned))
    }

    fn error_context() -> &'static str {
        "get_instance_type_name"
    }
}

#[napi]
pub fn get_instance_type_name<'env>(
    env: &'env Env,
    handle: &External<NativeHandle>,
) -> napi::Result<Unknown<'env>> {
    dispatch_request(
        env,
        GetInstanceTypeNameRequest {
            instance_ptr: handle.ptr(),
        },
    )
}

struct InstanceIsARequest {
    instance_ptr: *mut c_void,
    gtype: usize,
}

unsafe impl Send for InstanceIsARequest {}

impl ModuleRequest for InstanceIsARequest {
    type Output = bool;

    fn execute(self) -> anyhow::Result<bool> {
        if self.instance_ptr.is_null() {
            return Ok(false);
        }
        let instance = self.instance_ptr.cast::<gobject_ffi::GTypeInstance>();
        let result = unsafe { gobject_ffi::g_type_check_instance_is_a(instance, self.gtype) };
        Ok(result != 0)
    }

    fn error_context() -> &'static str {
        "instance_is_a"
    }
}

#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn instance_is_a<'env>(
    env: &'env Env,
    handle: &External<NativeHandle>,
    gtype: BigInt,
) -> napi::Result<Unknown<'env>> {
    let (_, gtype_value, _) = gtype.get_u64();
    dispatch_request(
        env,
        InstanceIsARequest {
            instance_ptr: handle.ptr(),
            gtype: gtype_value as usize,
        },
    )
}

struct RegisterClassRequest {
    name: CString,
    parent_gtype: usize,
}

unsafe impl Send for RegisterClassRequest {}

impl ModuleRequest for RegisterClassRequest {
    type Output = u64;

    fn execute(self) -> anyhow::Result<u64> {
        if self.parent_gtype == 0 {
            anyhow::bail!("parent gtype is invalid (G_TYPE_INVALID)");
        }

        let existing = unsafe { gobject_ffi::g_type_from_name(self.name.as_ptr()) };
        if existing != 0 {
            anyhow::bail!(
                "GType name '{}' is already registered",
                self.name.to_string_lossy()
            );
        }

        let mut query: gobject_ffi::GTypeQuery = unsafe { std::mem::zeroed() };
        unsafe { gobject_ffi::g_type_query(self.parent_gtype, &mut query) };
        if query.type_ == 0 {
            anyhow::bail!("parent gtype could not be queried");
        }

        let info = gobject_ffi::GTypeInfo {
            class_size: query.class_size as u16,
            base_init: None,
            base_finalize: None,
            class_init: None,
            class_finalize: None,
            class_data: std::ptr::null(),
            instance_size: query.instance_size as u16,
            n_preallocs: 0,
            instance_init: None,
            value_table: std::ptr::null(),
        };

        let new_gtype = unsafe {
            gobject_ffi::g_type_register_static(self.parent_gtype, self.name.as_ptr(), &info, 0)
        };
        if new_gtype == 0 {
            anyhow::bail!("g_type_register_static returned G_TYPE_INVALID");
        }

        Ok(new_gtype as u64)
    }

    fn error_context() -> &'static str {
        "register_class"
    }
}

#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn register_class(env: &Env, name: String, parent_gtype: BigInt) -> napi::Result<Unknown<'_>> {
    let name = CString::new(name)
        .map_err(|err| napi::Error::new(napi::Status::InvalidArg, err.to_string()))?;
    let (_, parent_gtype_value, _) = parent_gtype.get_u64();
    dispatch_request(
        env,
        RegisterClassRequest {
            name,
            parent_gtype: parent_gtype_value as usize,
        },
    )
}
