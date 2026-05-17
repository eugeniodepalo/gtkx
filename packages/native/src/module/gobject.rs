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

use super::handler::ModuleRequest;
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

/// napi export shims for `GObject` metadata access. Excluded from coverage
/// instrumentation: both dispatch through a live [`napi::Env`]. The
/// [`FindObjectPropertyRequest`] and [`GetInstanceGtypeRequest`] `execute`
/// logic they dispatch is exercised directly by tests.
#[cfg_attr(coverage_nightly, coverage(off))]
#[allow(clippy::wildcard_imports)]
mod napi_export {
    use super::*;

    #[napi]
    #[cfg_attr(test, allow(dead_code))]
    pub fn find_object_property<'env>(
        env: &'env Env,
        handle: &External<NativeHandle>,
        property_name: String,
    ) -> napi::Result<Unknown<'env>> {
        let property_name = CString::new(property_name)
            .map_err(|err| napi::Error::new(napi::Status::InvalidArg, err.to_string()))?;
        FindObjectPropertyRequest {
            instance_addr: handle.ptr_as_usize(),
            property_name,
        }
        .dispatch(env)
    }

    #[napi]
    #[cfg_attr(test, allow(dead_code))]
    pub fn get_instance_gtype<'env>(
        env: &'env Env,
        handle: &External<NativeHandle>,
    ) -> napi::Result<Unknown<'env>> {
        GetInstanceGtypeRequest {
            instance_addr: handle.ptr_as_usize(),
        }
        .dispatch(env)
    }
}

#[cfg(test)]
mod tests {
    use gtk4::gio;
    use gtk4::glib;
    use gtk4::glib::translate::{IntoGlib as _, ToGlibPtr as _};
    use gtk4::prelude::{Cast as _, StaticType as _};

    use super::*;

    fn object_addr(object: &glib::Object) -> usize {
        let ptr: *const glib::gobject_ffi::GObject = object.to_glib_none().0;
        ptr as usize
    }

    #[test]
    fn find_object_property_returns_handle_for_known_property() {
        let action = gio::SimpleAction::new("test-action", None);
        let request = FindObjectPropertyRequest {
            instance_addr: object_addr(action.upcast_ref::<glib::Object>()),
            property_name: CString::new("enabled").unwrap(),
        };
        let result = request.execute().expect("property lookup should succeed");
        let handle = result.expect("enabled property should exist");
        assert!(!handle.ptr().is_null());
    }

    #[test]
    fn find_object_property_returns_none_for_unknown_property() {
        let action = gio::SimpleAction::new("test-action", None);
        let request = FindObjectPropertyRequest {
            instance_addr: object_addr(action.upcast_ref::<glib::Object>()),
            property_name: CString::new("no-such-property").unwrap(),
        };
        let result = request.execute().expect("property lookup should succeed");
        assert!(result.is_none());
    }

    #[test]
    fn find_object_property_rejects_null_instance() {
        let request = FindObjectPropertyRequest {
            instance_addr: 0,
            property_name: CString::new("value").unwrap(),
        };
        let err = request.execute().expect_err("null instance should fail");
        assert!(err.to_string().contains("null pointer"));
    }

    #[test]
    fn find_object_property_rejects_instance_without_class() {
        let mut instance: gobject_ffi::GTypeInstance = unsafe { std::mem::zeroed() };
        let request = FindObjectPropertyRequest {
            instance_addr: std::ptr::addr_of_mut!(instance) as usize,
            property_name: CString::new("value").unwrap(),
        };
        let err = request
            .execute()
            .expect_err("instance without class should fail");
        assert!(err.to_string().contains("no resolved class"));
    }

    #[test]
    fn find_object_property_error_context_is_stable() {
        assert_eq!(
            FindObjectPropertyRequest::error_context(),
            "find_object_property"
        );
    }

    #[test]
    fn get_instance_gtype_returns_real_gtype() {
        let object = glib::Object::new::<glib::Object>();
        let request = GetInstanceGtypeRequest {
            instance_addr: object_addr(&object),
        };
        let gtype = request.execute().expect("gtype query should succeed");
        assert_eq!(gtype, glib::Object::static_type().into_glib() as u64);
    }

    #[test]
    fn get_instance_gtype_returns_zero_for_null_instance() {
        let request = GetInstanceGtypeRequest { instance_addr: 0 };
        let gtype = request.execute().expect("null instance should be Ok(0)");
        assert_eq!(gtype, 0);
    }

    #[test]
    fn get_instance_gtype_returns_zero_for_instance_without_class() {
        let mut instance: gobject_ffi::GTypeInstance = unsafe { std::mem::zeroed() };
        let request = GetInstanceGtypeRequest {
            instance_addr: std::ptr::addr_of_mut!(instance) as usize,
        };
        let gtype = request
            .execute()
            .expect("instance without class should be Ok(0)");
        assert_eq!(gtype, 0);
    }

    #[test]
    fn get_instance_gtype_error_context_is_stable() {
        assert_eq!(
            GetInstanceGtypeRequest::error_context(),
            "get_instance_gtype"
        );
    }
}
