//! JavaScript value representation for the native module.
//!
//! This module defines [`Value`], the intermediate representation for values
//! crossing between JavaScript and native code. Values are converted to/from
//! JavaScript types via napi-rs and to/from FFI-compatible representations
//! via the [`ffi`] module.
//!
//! The [`Value`] enum supports all types that can be passed through the FFI:
//! - Primitives: numbers, strings, booleans
//! - Objects: `GObjects`, boxed types, structs
//! - Callbacks: JavaScript functions invocable from native code
//! - Arrays and references

use std::ffi::c_void;
use std::sync::Arc;

use anyhow::bail;
use gtk4::glib::{
    self,
    prelude::{ObjectExt as _, ObjectType as _},
    translate::{FromGlibPtrNone as _, ToGlibPtrMut as _},
    value::ToValue as _,
};
use napi::bindgen_prelude::*;
use napi::sys;
use napi::{Env, JsFunction, JsObject, NapiRaw as _, ValueType};

use crate::error_reporter::NativeErrorReporter;
use crate::managed::NativeHandle;
use crate::types::{FfiDecoder, GlibValueCodec, Type};
use crate::{arg::Arg, ffi};

/// Send-safe napi reference to a JavaScript function.
///
/// Wraps a raw `napi_ref` paired with its `napi_env`. Sending the ref across
/// threads is safe because the contained pointer is opaque; only the JS thread
/// dereferences it via `get_value`. The reference is released on `Drop`.
pub struct JsCallbackRef {
    raw: sys::napi_ref,
    env: sys::napi_env,
}

unsafe impl Send for JsCallbackRef {}
unsafe impl Sync for JsCallbackRef {}

impl std::fmt::Debug for JsCallbackRef {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("JsCallbackRef").finish_non_exhaustive()
    }
}

impl Drop for JsCallbackRef {
    fn drop(&mut self) {
        let status = unsafe { sys::napi_delete_reference(self.env, self.raw) };
        debug_assert_eq!(status, sys::Status::napi_ok);
    }
}

impl JsCallbackRef {
    pub fn from_js_function(env: &Env, func: &JsFunction) -> napi::Result<Self> {
        let raw_value = unsafe { func.raw() };
        let mut raw_ref = std::ptr::null_mut();
        unsafe {
            let status = sys::napi_create_reference(env.raw(), raw_value, 1, &mut raw_ref);
            if status != sys::Status::napi_ok {
                return Err(napi::Error::new(
                    napi::Status::GenericFailure,
                    "Failed to create function reference",
                ));
            }
        }
        Ok(Self {
            raw: raw_ref,
            env: env.raw(),
        })
    }

    pub fn get_value(&self, env: &Env) -> napi::Result<JsFunction> {
        use napi::NapiValue as _;
        let mut raw_value = std::ptr::null_mut();
        unsafe {
            let status = sys::napi_get_reference_value(env.raw(), self.raw, &mut raw_value);
            if status != sys::Status::napi_ok {
                return Err(napi::Error::new(
                    napi::Status::GenericFailure,
                    "Failed to get function reference value",
                ));
            }
            Ok(JsFunction::from_raw_unchecked(env.raw(), raw_value))
        }
    }
}

/// Send-safe napi reference to a JavaScript object.
///
/// Mirrors [`JsCallbackRef`] but stores a reference to a `JsObject` rather than
/// a `JsFunction`. Used by `Ref` values to write back updated `value` properties
/// after an FFI call completes.
pub struct JsObjectRefValue {
    raw: sys::napi_ref,
    env: sys::napi_env,
}

unsafe impl Send for JsObjectRefValue {}
unsafe impl Sync for JsObjectRefValue {}

impl std::fmt::Debug for JsObjectRefValue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("JsObjectRefValue").finish_non_exhaustive()
    }
}

impl Drop for JsObjectRefValue {
    fn drop(&mut self) {
        let status = unsafe { sys::napi_delete_reference(self.env, self.raw) };
        debug_assert_eq!(status, sys::Status::napi_ok);
    }
}

impl JsObjectRefValue {
    pub fn from_js_object(env: &Env, obj: &JsObject) -> napi::Result<Self> {
        let raw_value = unsafe { obj.raw() };
        let mut raw_ref = std::ptr::null_mut();
        unsafe {
            let status = sys::napi_create_reference(env.raw(), raw_value, 1, &mut raw_ref);
            if status != sys::Status::napi_ok {
                return Err(napi::Error::new(
                    napi::Status::GenericFailure,
                    "Failed to create object reference",
                ));
            }
        }
        Ok(Self {
            raw: raw_ref,
            env: env.raw(),
        })
    }

    pub fn get_value(&self, env: &Env) -> napi::Result<JsObject> {
        use napi::NapiValue as _;
        let mut raw_value = std::ptr::null_mut();
        unsafe {
            let status = sys::napi_get_reference_value(env.raw(), self.raw, &mut raw_value);
            if status != sys::Status::napi_ok {
                return Err(napi::Error::new(
                    napi::Status::GenericFailure,
                    "Failed to get object reference value",
                ));
            }
            Ok(JsObject::from_raw_unchecked(env.raw(), raw_value))
        }
    }
}

#[derive(Debug)]
pub struct Callback {
    pub js_func: Arc<JsCallbackRef>,
}

impl Callback {
    #[must_use]
    pub fn new(js_func: Arc<JsCallbackRef>) -> Self {
        Self { js_func }
    }

    pub fn from_js_value(env: &Env, value: Unknown<'_>) -> napi::Result<Self> {
        use napi::NapiValue as _;
        let func: JsFunction = unsafe { JsFunction::from_raw_unchecked(env.raw(), value.raw()) };
        let func_ref = JsCallbackRef::from_js_function(env, &func)?;
        Ok(Self::new(Arc::new(func_ref)))
    }

    pub fn to_js_value<'env>(&self, env: &'env Env) -> napi::Result<Unknown<'env>> {
        let func = self.js_func.get_value(env)?;
        Ok(unsafe { Unknown::from_raw_unchecked(env.raw(), func.raw()) })
    }
}

impl Clone for Callback {
    fn clone(&self) -> Self {
        Self {
            js_func: self.js_func.clone(),
        }
    }
}

#[derive(Debug)]
pub struct Ref {
    pub value: Box<Value>,
    pub js_obj: Arc<JsObjectRefValue>,
}

impl Clone for Ref {
    fn clone(&self) -> Self {
        Self {
            value: self.value.clone(),
            js_obj: self.js_obj.clone(),
        }
    }
}

impl Ref {
    #[must_use]
    pub fn new(value: Value, js_obj: Arc<JsObjectRefValue>) -> Self {
        Self {
            value: Box::new(value),
            js_obj,
        }
    }

    pub fn from_js_value(env: &Env, value: Unknown<'_>) -> napi::Result<Self> {
        use napi::NapiValue as _;
        let obj: JsObject = unsafe { JsObject::from_raw_unchecked(env.raw(), value.raw()) };
        let value_prop: Unknown<'_> = obj.get_named_property("value")?;
        let inner = Value::from_js_value(env, value_prop)?;
        let js_obj_ref = JsObjectRefValue::from_js_object(env, &obj)?;

        Ok(Self::new(inner, Arc::new(js_obj_ref)))
    }
}

#[derive(Debug, Clone)]
#[non_exhaustive]
pub enum Value {
    Number(f64),
    String(String),
    Boolean(bool),
    Object(NativeHandle),
    Null,
    Undefined,
    Array(Vec<Self>),
    Callback(Callback),
    Ref(Ref),
}

impl Value {
    #[must_use]
    pub fn result_to_ptr(result: &std::result::Result<Self, ()>) -> *mut c_void {
        match result {
            Ok(Self::Object(handle)) => handle.ptr(),
            _ => std::ptr::null_mut(),
        }
    }

    pub fn object_ptr(&self, type_name: &str) -> anyhow::Result<*mut c_void> {
        match self {
            Self::Object(handle) => Ok(handle.ptr()),
            Self::Null | Self::Undefined => Ok(std::ptr::null_mut()),
            Self::Number(_)
            | Self::String(_)
            | Self::Boolean(_)
            | Self::Array(_)
            | Self::Callback(_)
            | Self::Ref(_) => {
                anyhow::bail!("Expected an Object for {type_name} type, got {self:?}")
            }
        }
    }

    pub fn from_ffi_value(ffi_value: &ffi::FfiValue, ty: &Type) -> anyhow::Result<Self> {
        ty.decode(ffi_value)
    }

    pub fn from_ffi_value_with_args(
        ffi_value: &ffi::FfiValue,
        ty: &Type,
        ffi_args: &[ffi::FfiValue],
        args: &[Arg],
    ) -> anyhow::Result<Self> {
        ty.decode_with_context(ffi_value, ffi_args, args)
    }

    #[must_use]
    pub fn into_glib_value_with_default(self, return_type: Option<&Type>) -> Option<glib::Value> {
        match &self {
            Self::Undefined => {
                let ty = return_type?;
                let default = match ty {
                    Type::Boolean(_) => Self::Boolean(false),
                    Type::Integer(_) | Type::Enum(_) | Type::Flags(_) | Type::Float(_) => {
                        Self::Number(0.0)
                    }
                    Type::String(_) | Type::GObject(_) => Self::Null,
                    _ => return None,
                };
                match ty.to_glib_value(&default) {
                    Ok(v) => v,
                    Err(e) => {
                        NativeErrorReporter::global()
                            .report(&e.context("failed to compute default glib value"));
                        None
                    }
                }
            }
            Self::Number(_)
            | Self::String(_)
            | Self::Boolean(_)
            | Self::Object(_)
            | Self::Null
            | Self::Array(_)
            | Self::Callback(_)
            | Self::Ref(_) => match self.to_glib_value_typed(return_type) {
                Ok(v) => Some(v),
                Err(e) => {
                    NativeErrorReporter::global()
                        .report(&e.context("failed to convert value to glib::Value"));
                    None
                }
            },
        }
    }

    pub fn to_glib_value(self) -> anyhow::Result<glib::Value> {
        self.to_glib_value_typed(None)
    }

    pub fn to_glib_value_typed(self, expected_type: Option<&Type>) -> anyhow::Result<glib::Value> {
        if let Some(ty) = expected_type
            && let Some(gvalue) = ty.to_glib_value(&self)?
        {
            return Ok(gvalue);
        }
        match self {
            Self::Number(n) => Ok(n.into()),
            Self::String(s) => Ok(s.into()),
            Self::Boolean(b) => Ok(b.into()),
            Self::Object(handle) => {
                let ptr = handle.ptr();
                if ptr.is_null() {
                    Ok(Option::<glib::Object>::None.to_value())
                } else {
                    let obj: glib::Object = unsafe {
                        glib::Object::from_glib_none(ptr as *mut glib::gobject_ffi::GObject)
                    };
                    let mut value = glib::Value::from_type(obj.type_());
                    unsafe {
                        glib::gobject_ffi::g_value_set_object(
                            value.to_glib_none_mut().0,
                            obj.as_ptr() as *mut _,
                        );
                    }
                    Ok(value)
                }
            }
            Self::Null | Self::Undefined => {
                bail!("Cannot convert Null/Undefined to glib::Value without a type hint")
            }
            Self::Array(_) | Self::Callback(_) | Self::Ref(_) => {
                bail!("Unsupported Value type for glib::Value conversion: {self:?}")
            }
        }
    }

    pub fn from_js_value(env: &Env, value: Unknown<'_>) -> napi::Result<Self> {
        let value_type = value.get_type()?;

        match value_type {
            ValueType::Number => {
                let n = unsafe { f64::from_napi_value(env.raw(), value.raw())? };
                Ok(Self::Number(n))
            }
            ValueType::String => {
                let s = unsafe { String::from_napi_value(env.raw(), value.raw())? };
                Ok(Self::String(s))
            }
            ValueType::Boolean => {
                let b = unsafe { bool::from_napi_value(env.raw(), value.raw())? };
                Ok(Self::Boolean(b))
            }
            ValueType::Null => Ok(Self::Null),
            ValueType::Undefined => Ok(Self::Undefined),
            ValueType::External => {
                let external_ref =
                    unsafe { <&External<NativeHandle>>::from_napi_value(env.raw(), value.raw())? };
                Ok(Self::Object(NativeHandle::borrowed(external_ref.ptr())))
            }
            ValueType::Function => {
                let cb = Callback::from_js_value(env, value)?;
                Ok(Self::Callback(cb))
            }
            ValueType::Object => {
                if value.is_array()? {
                    let arr: Array = unsafe { Array::from_napi_value(env.raw(), value.raw())? };
                    let len = arr.len();
                    let mut values = Vec::with_capacity(len as usize);
                    for i in 0..len {
                        let item: Unknown<'_> = arr.get(i)?.ok_or_else(|| {
                            napi::Error::new(
                                napi::Status::GenericFailure,
                                format!("Array element {i} missing"),
                            )
                        })?;
                        values.push(Self::from_js_value(env, item)?);
                    }
                    Ok(Self::Array(values))
                } else {
                    let r = Ref::from_js_value(env, value)?;
                    Ok(Self::Ref(r))
                }
            }
            other => Err(napi::Error::new(
                napi::Status::InvalidArg,
                format!("Unsupported JS value type: {other:?}"),
            )),
        }
    }

    pub fn to_js_value(self, env: &Env) -> napi::Result<Unknown<'_>> {
        match self {
            Self::Number(n) => unsafe {
                let raw = f64::to_napi_value(env.raw(), n)?;
                Ok(Unknown::from_raw_unchecked(env.raw(), raw))
            },
            Self::String(s) => unsafe {
                let raw = String::to_napi_value(env.raw(), s)?;
                Ok(Unknown::from_raw_unchecked(env.raw(), raw))
            },
            Self::Boolean(b) => unsafe {
                let raw = bool::to_napi_value(env.raw(), b)?;
                Ok(Unknown::from_raw_unchecked(env.raw(), raw))
            },
            Self::Object(handle) => unsafe {
                let external = External::new(handle);
                let raw = External::<NativeHandle>::to_napi_value(env.raw(), external)?;
                Ok(Unknown::from_raw_unchecked(env.raw(), raw))
            },
            Self::Array(arr) => {
                let mut js_array = env.create_array(arr.len() as u32)?;
                for (i, item) in arr.into_iter().enumerate() {
                    let js_item = item.to_js_value(env)?;
                    js_array.set(i as u32, js_item)?;
                }
                unsafe {
                    let raw = Array::to_napi_value(env.raw(), js_array)?;
                    Ok(Unknown::from_raw_unchecked(env.raw(), raw))
                }
            }
            Self::Null => unsafe {
                let raw = napi::bindgen_prelude::Null::to_napi_value(env.raw(), Null)?;
                Ok(Unknown::from_raw_unchecked(env.raw(), raw))
            },
            Self::Undefined => unsafe {
                let raw = napi::bindgen_prelude::Undefined::to_napi_value(env.raw(), ())?;
                Ok(Unknown::from_raw_unchecked(env.raw(), raw))
            },
            Self::Callback(_) | Self::Ref(_) => Err(napi::Error::new(
                napi::Status::InvalidArg,
                format!("Unsupported Value type for JS conversion: {self:?}"),
            )),
        }
    }

    pub fn from_glib_value(gvalue: &glib::Value, ty: &Type) -> anyhow::Result<Self> {
        ty.from_glib_value(gvalue)
    }

    pub fn from_glib_values(args: &[glib::Value], arg_types: &[Type]) -> anyhow::Result<Vec<Self>> {
        args.iter()
            .zip(arg_types.iter())
            .map(|(gval, ty)| Self::from_glib_value(gval, ty))
            .collect()
    }
}
