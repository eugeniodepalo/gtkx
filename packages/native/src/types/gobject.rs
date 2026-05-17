use std::ffi::c_void;

use anyhow::bail;
use gtk4::glib::{
    self,
    translate::{FromGlibPtrFull as _, FromGlibPtrNone as _, IntoGlibPtr, ToGlibPtr as _},
    value::ToValue as _,
};
use napi::{Env, JsObject};

use super::raw_ptr::{null_guarded, write_object_ptr, write_return_object_ptr};
use super::{FfiDecoder, FfiEncoder, GlibValueCodec, Ownership, RawPtrCodec};
use crate::managed::NativeValue;
use crate::{ffi, value};

#[derive(Debug, Clone, Copy)]
pub struct GObjectType {
    pub ownership: Ownership,
}

impl GObjectType {
    #[cfg_attr(coverage_nightly, coverage(off))]
    pub fn from_js_value(_env: &Env, obj: &JsObject) -> napi::Result<Self> {
        let ownership = Ownership::from_js_value(obj, "gobject")?;
        Ok(Self { ownership })
    }
}

impl FfiEncoder for GObjectType {
    fn encode(&self, value: &value::Value, _optional: bool) -> anyhow::Result<ffi::FfiValue> {
        let ptr = value.object_ptr("GObject")?;
        Ok(ffi::FfiValue::Ptr(self.ref_for_transfer(ptr)?))
    }

    fn ref_for_transfer(&self, ptr: *mut c_void) -> anyhow::Result<*mut c_void> {
        if self.ownership.is_full() && !ptr.is_null() {
            let obj: glib::Object =
                unsafe { glib::Object::from_glib_none(ptr as *mut glib::gobject_ffi::GObject) };
            return Ok(
                IntoGlibPtr::<*mut glib::gobject_ffi::GObject>::into_glib_ptr(obj).cast::<c_void>(),
            );
        }
        Ok(ptr)
    }
}

impl FfiDecoder for GObjectType {
    /// Decodes a `GObject` pointer returned across the FFI boundary.
    ///
    /// A `GInitiallyUnowned` is claimed with `g_object_ref_sink` whenever the
    /// caller owns the result: that sinks a still-floating reference, and adds
    /// an owned reference to an instance already sunk during construction —
    /// e.g. a `GtkApplicationWindow` whose `application` property parents it
    /// into the `GtkApplication` before the constructor returns, leaving it
    /// non-floating with the application holding its only reference. Taking
    /// such a pointer with `from_glib_full` would steal that reference. A
    /// plain transfer-full pointer is taken with `from_glib_full`; a borrowed
    /// one is referenced with `from_glib_none`.
    fn decode(&self, ffi_value: &ffi::FfiValue) -> anyhow::Result<value::Value> {
        let Some(object_ptr) = ffi_value.as_non_null_ptr("GObject")? else {
            return Ok(value::Value::Null);
        };

        let gobject_ptr = object_ptr as *mut glib::gobject_ffi::GObject;

        let type_class = unsafe { (*gobject_ptr).g_type_instance.g_class };
        if type_class.is_null() {
            bail!("GObject has invalid type class (object may have been freed)");
        }

        let is_floating = unsafe { glib::gobject_ffi::g_object_is_floating(gobject_ptr) != 0 };

        let gtype = unsafe { (*type_class).g_type };
        let is_initially_unowned = unsafe {
            glib::gobject_ffi::g_type_is_a(gtype, glib::gobject_ffi::g_initially_unowned_get_type())
                != 0
        };

        let object = if is_floating || (is_initially_unowned && self.ownership.is_full()) {
            unsafe { glib::gobject_ffi::g_object_ref_sink(gobject_ptr) };
            NativeValue::GObject(unsafe { glib::Object::from_glib_full(gobject_ptr) })
        } else if self.ownership.is_full() {
            NativeValue::GObject(unsafe { glib::Object::from_glib_full(gobject_ptr) })
        } else {
            NativeValue::GObject(unsafe { glib::Object::from_glib_none(gobject_ptr) })
        };

        Ok(value::Value::Object(object.into()))
    }
}

impl RawPtrCodec for GObjectType {
    fn ptr_to_value(&self, ptr: *mut c_void, _context: &str) -> anyhow::Result<value::Value> {
        null_guarded(ptr, |ptr| {
            let gobject_ptr = ptr as *mut glib::gobject_ffi::GObject;
            let type_class = unsafe { (*gobject_ptr).g_type_instance.g_class };
            if type_class.is_null() {
                bail!("GObject has invalid type class (object may have been freed)");
            }
            let object = unsafe { glib::Object::from_glib_none(gobject_ptr) };
            Ok(value::Value::Object(NativeValue::GObject(object).into()))
        })
    }

    fn write_return_to_raw_ptr(&self, ret: *mut c_void, value: &Result<value::Value, ()>) {
        write_return_object_ptr(ret, value, |ptr| {
            let obj: glib::Object =
                unsafe { glib::Object::from_glib_none(ptr as *mut glib::gobject_ffi::GObject) };
            IntoGlibPtr::<*mut glib::gobject_ffi::GObject>::into_glib_ptr(obj).cast::<c_void>()
        });
    }

    fn write_value_to_raw_ptr(&self, ptr: *mut c_void, value: &value::Value) -> anyhow::Result<()> {
        write_object_ptr(ptr, value, "GObject field write")
    }
}

impl GlibValueCodec for GObjectType {
    fn to_glib_value(&self, val: &value::Value) -> anyhow::Result<Option<glib::Value>> {
        let ptr = match val {
            value::Value::Object(handle) => handle.ptr(),
            value::Value::Null | value::Value::Undefined => {
                return Ok(Some(Option::<glib::Object>::None.into()));
            }
            _ => return Ok(None),
        };
        if ptr.is_null() {
            return Ok(Some(Option::<glib::Object>::None.into()));
        }
        let obj: glib::Object =
            unsafe { glib::Object::from_glib_none(ptr as *mut glib::gobject_ffi::GObject) };
        Ok(Some(obj.to_value()))
    }

    fn from_glib_value(&self, gvalue: &glib::Value) -> anyhow::Result<value::Value> {
        let obj_ptr =
            unsafe { glib::gobject_ffi::g_value_get_object(gvalue.to_glib_none().0 as *const _) };
        if obj_ptr.is_null() {
            return Ok(value::Value::Null);
        }
        let type_class = unsafe { (*obj_ptr).g_type_instance.g_class };
        if type_class.is_null() {
            bail!("GObject has invalid type class (object may have been freed)");
        }
        let obj = unsafe { glib::Object::from_glib_none(obj_ptr) };
        Ok(value::Value::Object(NativeValue::GObject(obj).into()))
    }
}
