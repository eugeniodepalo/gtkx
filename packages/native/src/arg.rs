use std::ffi::CString;
use std::sync::Arc;

use crate::cif::Arg as CifArg;
use crate::result::Result;
use crate::types::{FloatSize, IntegerSign, IntegerSize, Type};
use crate::value::Value;
use anyhow::{bail, Context as AnyhowContext, Result as AnyhowResult};
use gtk4::glib;
use gtk4::glib::translate::{FromGlibPtrFull as _, FromGlibPtrNone as _};
use neon::prelude::*;
use neon::object::Object as _;
use std::ffi::{c_char, c_void};
use std::sync::Arc as StdArc;
use neon::handle::Root;
use crate::object::{Boxed, Object};
use crate::state::ObjectId;

#[derive(Debug)]
pub struct Arg {
    type_: Type,
    value: Value,
}

impl Arg {
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

    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let type_prop: Handle<'_, JsValue> = obj.prop(cx, "type").get()?;
        let value_prop: Handle<'_, JsValue> = obj.prop(cx, "value").get()?;
        let type_ = Type::from_js_value(cx, type_prop)?;

        let value = match &type_ {
            Type::Ref(_) => {
                let js_obj = value_prop.downcast::<JsObject, _>(cx).or_throw(cx)?;
                let root = js_obj.root(cx);
                Value::Ref(crate::value::Ref::new(Box::new(Value::Null), root, cx.channel()))
            }
            _ => Value::from_js_value(cx, value_prop)?,
        };

        Ok(Arg { type_, value })
    }

    pub fn get_type(&self) -> &Type {
        &self.type_
    }

    pub fn try_into_cif_arg(&self) -> AnyhowResult<CifArg> {
        match &self.type_ {
            Type::Integer(type_) => {
                let number = match self.value {
                    Value::Number(n) => n,
                    _ => bail!("Expected a Number for integer type, got {:?}", self.value),
                };

                match type_.size {
                    IntegerSize::_8 => match type_.sign {
                        IntegerSign::Unsigned => Ok(CifArg::U8(number as u8)),
                        IntegerSign::Signed => Ok(CifArg::I8(number as i8)),
                    },
                    IntegerSize::_32 => match type_.sign {
                        IntegerSign::Unsigned => Ok(CifArg::U32(number as u32)),
                        IntegerSign::Signed => Ok(CifArg::I32(number as i32)),
                    },
                    IntegerSize::_64 => match type_.sign {
                        IntegerSign::Unsigned => Ok(CifArg::U64(number as u64)),
                        IntegerSign::Signed => Ok(CifArg::I64(number as i64)),
                    },
                }
            }
            Type::Float(type_) => {
                let number = match self.value {
                    Value::Number(n) => n,
                    _ => bail!("Expected a Number for float type, got {:?}", self.value),
                };

                match type_.size {
                    FloatSize::_32 => Ok(CifArg::F32(number as f32)),
                    FloatSize::_64 => Ok(CifArg::F64(number)),
                }
            }
            Type::String => {
                let string = match &self.value {
                    Value::String(s) => s,
                    _ => bail!("Expected a String for string type, got {:?}", self.value),
                };

                let cstring = CString::new(string.as_bytes())
                    .with_context(|| "Failed to create CString from string")?;
                Ok(CifArg::String(cstring))
            }
            Type::Boolean => {
                let boolean = match self.value {
                    Value::Boolean(b) => b,
                    _ => bail!("Expected a Boolean for boolean type, got {:?}", self.value),
                };

                Ok(CifArg::U8(if boolean { 1 } else { 0 }))
            }
            Type::Null => Ok(CifArg::Pointer(std::ptr::null_mut())),
            Type::GObject(_) => {
                let object_id = match &self.value {
                    Value::Object(id) => id,
                    _ => bail!("Expected a Object for gobject type, got {:?}", self.value),
                };

                Ok(CifArg::Pointer(object_id.as_ptr()))
            }
            Type::Boxed(_) => {
                let object_id = match &self.value {
                    Value::Object(id) => id,
                    _ => bail!("Expected a Boxed for boxed type, got {:?}", self.value),
                };

                Ok(CifArg::Pointer(object_id.as_ptr()))
            }
            Type::Array(ref array_type) => {
                let array = match &self.value {
                    Value::Array(arr) => arr,
                    _ => bail!("Expected an Array for array type, got {:?}", self.value),
                };

                self.convert_array_to_cif_arg(array, array_type)
            }
            Type::Callback => {
                let (callback, channel) = match &self.value {
                    Value::Callback(callback, channel) => (callback, channel),
                    _ => bail!(
                        "Expected a callback for callback type, got {:?}",
                        self.value
                    ),
                };

                self.convert_callback_to_cif_arg(callback, channel)
            }
            Type::Ref(_) => bail!("Internal error: Ref should be handled with try_into_cif_arg_with_ref"),
        }
    }

    pub fn try_into_cif_arg_with_ref(&self) -> AnyhowResult<(CifArg, Option<PreparedRef>)> {
        match &self.type_ {
            Type::Ref(ref ref_type) => {
                // Expect a Value::Ref carrying the JS object root and channel
                let (js_obj, channel) = match &self.value {
                    Value::Ref(r) => (r.js_obj.clone(), r.channel.clone()),
                    _ => bail!("Expected a ref object for ref type, got {:?}", self.value),
                };

                let mut storage = RefStorage::allocate_for_type(&ref_type.inner_type);
                let ptr = storage.as_ffi_pointer();
                let prepared = PreparedRef {
                    inner_type: (*ref_type.inner_type).clone(),
                    storage,
                    js_obj,
                    channel,
                };
                Ok((CifArg::Pointer(ptr), Some(prepared)))
            }
            _ => Ok((self.try_into_cif_arg()?, None)),
        }
    }

    fn convert_array_to_cif_arg(
        &self,
        array: &[Value],
        array_type: &crate::types::ArrayType,
    ) -> AnyhowResult<CifArg> {
        match *array_type.item_type {
            Type::Integer(type_) => {
                let mut values = Vec::new();
                for v in array {
                    match v {
                        Value::Number(n) => values.push(n),
                        _ => bail!("Expected a Number for integer array type, got {:?}", v),
                    }
                }

                match (type_.size, type_.sign) {
                    (IntegerSize::_8, IntegerSign::Unsigned) => {
                        Ok(CifArg::U8Array(values.iter().map(|&v| *v as u8).collect()))
                    }
                    (IntegerSize::_8, IntegerSign::Signed) => {
                        Ok(CifArg::I8Array(values.iter().map(|&v| *v as i8).collect()))
                    }
                    (IntegerSize::_32, IntegerSign::Unsigned) => Ok(CifArg::U32Array(
                        values.iter().map(|&v| *v as u32).collect(),
                    )),
                    (IntegerSize::_32, IntegerSign::Signed) => Ok(CifArg::I32Array(
                        values.iter().map(|&v| *v as i32).collect(),
                    )),
                    (IntegerSize::_64, IntegerSign::Unsigned) => Ok(CifArg::U64Array(
                        values.iter().map(|&v| *v as u64).collect(),
                    )),
                    (IntegerSize::_64, IntegerSign::Signed) => Ok(CifArg::I64Array(
                        values.iter().map(|&v| *v as i64).collect(),
                    )),
                }
            }
            Type::Float(type_) => {
                let mut values = Vec::new();
                for v in array {
                    match v {
                        Value::Number(n) => values.push(n),
                        _ => bail!("Expected a Number for float array type, got {:?}", v),
                    }
                }

                match type_.size {
                    FloatSize::_32 => Ok(CifArg::F32Array(
                        values.iter().map(|&v| *v as f32).collect(),
                    )),
                    FloatSize::_64 => Ok(CifArg::F64Array(values.iter().map(|&v| *v).collect())),
                }
            }
            Type::String => {
                let mut cstrings = Vec::new();
                for v in array {
                    match v {
                        Value::String(s) => {
                            let cstring = CString::new(s.as_bytes()).with_context(|| {
                                "Failed to create CString from string array item"
                            })?;
                            cstrings.push(cstring);
                        }
                        _ => bail!("Expected a String for string array type, got {:?}", v),
                    }
                }

                Ok(CifArg::StringArray(cstrings))
            }
            Type::GObject(_) => {
                let mut pointers = Vec::new();
                for v in array {
                    match v {
                        Value::Object(id) => pointers.push(id.as_ptr()),
                        _ => bail!("Expected a GObject for gobject array type, got {:?}", v),
                    }
                }

                Ok(CifArg::PointerArray(pointers))
            }
            Type::Boxed(_) => {
                let mut pointers = Vec::new();
                for v in array {
                    match v {
                        Value::Object(id) => pointers.push(id.as_ptr()),
                        _ => bail!(
                            "Expected a Boxed object for pointer array type, got {:?}",
                            v
                        ),
                    }
                }

                Ok(CifArg::PointerArray(pointers))
            }
            Type::Boolean => {
                let mut values = Vec::new();
                for v in array {
                    match v {
                        Value::Boolean(b) => values.push(if *b { 1 } else { 0 }),
                        _ => bail!("Expected a Boolean for boolean array type, got {:?}", v),
                    }
                }

                Ok(CifArg::U8Array(values))
            }
            _ => bail!("Unsupported array item type: {:?}", array_type.item_type),
        }
    }

    fn convert_callback_to_cif_arg(
        &self,
        callback: &Arc<Root<JsFunction>>,
        channel: &Channel,
    ) -> AnyhowResult<CifArg> {
        let channel = channel.clone();
        let callback = callback.clone();

        let closure = glib::Closure::new(move |args: &[glib::Value]| {
            let args_values = args
                .iter()
                .map(|v| Value::try_from_glib_value(v))
                .collect::<AnyhowResult<Vec<Value>>>()
                .unwrap_or_else(|_| Vec::new());
            let callback = callback.clone();

            let result = channel.send(move |mut cx| {
                let js_args = args_values
                    .into_iter()
                    .map(|v| v.to_js_value(&mut cx))
                    .collect::<NeonResult<Vec<_>>>()?;

                let js_this = cx.undefined();
                let js_callback = callback.clone().to_inner(&mut cx);
                let js_result = js_callback.call(&mut cx, js_this, js_args)?;

                let result = Result::from_js_value(&mut cx, js_result)?;

                Ok(result)
            });

            result.join().unwrap().try_to_glib_value().unwrap_or(None)
        });

        Ok(CifArg::Callback(closure))
    }
}

#[derive(Debug)]
pub enum RefStorage {
    U8(Box<u8>),
    I8(Box<i8>),
    U32(Box<u32>),
    I32(Box<i32>),
    U64(Box<u64>),
    I64(Box<i64>),
    F32(Box<f32>),
    F64(Box<f64>),
    Bool(Box<u8>),
    StringPtr(Box<*mut c_char>),
    PointerPtr(Box<*mut c_void>),
}

impl RefStorage {
    pub fn allocate_for_type(inner: &Type) -> Self {
        match inner {
            Type::Integer(t) => match (t.size, t.sign) {
                (IntegerSize::_8, IntegerSign::Unsigned) => RefStorage::U8(Box::new(0)),
                (IntegerSize::_8, IntegerSign::Signed) => RefStorage::I8(Box::new(0)),
                (IntegerSize::_32, IntegerSign::Unsigned) => RefStorage::U32(Box::new(0)),
                (IntegerSize::_32, IntegerSign::Signed) => RefStorage::I32(Box::new(0)),
                (IntegerSize::_64, IntegerSign::Unsigned) => RefStorage::U64(Box::new(0)),
                (IntegerSize::_64, IntegerSign::Signed) => RefStorage::I64(Box::new(0)),
            },
            Type::Float(t) => match t.size {
                FloatSize::_32 => RefStorage::F32(Box::new(0.0)),
                FloatSize::_64 => RefStorage::F64(Box::new(0.0)),
            },
            Type::Boolean => RefStorage::Bool(Box::new(0)),
            Type::String => RefStorage::StringPtr(Box::new(std::ptr::null_mut())),
            Type::GObject(_) | Type::Boxed(_) | Type::Null | Type::Array(_) | Type::Callback | Type::Ref(_) => {
                RefStorage::PointerPtr(Box::new(std::ptr::null_mut()))
            }
        }
    }

    pub fn as_ffi_pointer(&mut self) -> *mut c_void {
        match self {
            RefStorage::U8(v) => v.as_mut() as *mut u8 as *mut c_void,
            RefStorage::I8(v) => v.as_mut() as *mut i8 as *mut c_void,
            RefStorage::U32(v) => v.as_mut() as *mut u32 as *mut c_void,
            RefStorage::I32(v) => v.as_mut() as *mut i32 as *mut c_void,
            RefStorage::U64(v) => v.as_mut() as *mut u64 as *mut c_void,
            RefStorage::I64(v) => v.as_mut() as *mut i64 as *mut c_void,
            RefStorage::F32(v) => v.as_mut() as *mut f32 as *mut c_void,
            RefStorage::F64(v) => v.as_mut() as *mut f64 as *mut c_void,
            RefStorage::Bool(v) => v.as_mut() as *mut u8 as *mut c_void,
            RefStorage::StringPtr(v) => v.as_mut() as *mut *mut c_char as *mut c_void,
            RefStorage::PointerPtr(v) => v.as_mut() as *mut *mut c_void as *mut c_void,
        }
    }
}

#[derive(Debug)]
pub struct PreparedRef {
    pub inner_type: Type,
    pub storage: RefStorage,
    pub js_obj: StdArc<Root<JsObject>>,
    pub channel: Channel,
}

impl PreparedRef {
    pub unsafe fn read_back_value(&self) -> AnyhowResult<Value> {
        match &self.inner_type {
            Type::Integer(t) => match (t.size, t.sign) {
                (IntegerSize::_8, IntegerSign::Unsigned) => { if let RefStorage::U8(v) = &self.storage { Ok(Value::Number((**v) as f64)) } else { bail!("ref storage mismatch") } }
                (IntegerSize::_8, IntegerSign::Signed) => { if let RefStorage::I8(v) = &self.storage { Ok(Value::Number((**v) as f64)) } else { bail!("ref storage mismatch") } }
                (IntegerSize::_32, IntegerSign::Unsigned) => { if let RefStorage::U32(v) = &self.storage { Ok(Value::Number((**v) as f64)) } else { bail!("ref storage mismatch") } }
                (IntegerSize::_32, IntegerSign::Signed) => { if let RefStorage::I32(v) = &self.storage { Ok(Value::Number((**v) as f64)) } else { bail!("ref storage mismatch") } }
                (IntegerSize::_64, IntegerSign::Unsigned) => { if let RefStorage::U64(v) = &self.storage { Ok(Value::Number((**v) as f64)) } else { bail!("ref storage mismatch") } }
                (IntegerSize::_64, IntegerSign::Signed) => { if let RefStorage::I64(v) = &self.storage { Ok(Value::Number((**v) as f64)) } else { bail!("ref storage mismatch") } }
            },
            Type::Float(t) => match t.size {
                FloatSize::_32 => { if let RefStorage::F32(v) = &self.storage { Ok(Value::Number((**v) as f64)) } else { bail!("ref storage mismatch") } }
                FloatSize::_64 => { if let RefStorage::F64(v) = &self.storage { Ok(Value::Number((**v) as f64)) } else { bail!("ref storage mismatch") } }
            },
            Type::Boolean => { if let RefStorage::Bool(v) = &self.storage { Ok(Value::Boolean((**v) != 0)) } else { bail!("ref storage mismatch") } }
            Type::String => {
                if let RefStorage::StringPtr(p) = &self.storage {
                    let ptr = *p.clone();
                    if ptr.is_null() {
                        Ok(Value::Null)
                    } else {
                        let s = std::ffi::CStr::from_ptr(ptr).to_string_lossy().to_string();
                        Ok(Value::String(s))
                    }
                } else { bail!("ref storage mismatch") }
            }
            Type::GObject(gtype) => {
                if let RefStorage::PointerPtr(p) = &self.storage {
                    let object_ptr = *p.clone();
                    let object = if gtype.is_borrowed {
                        let object = glib::Object::from_glib_none(object_ptr as *mut glib::gobject_ffi::GObject);
                        Object::GObject(object)
                    } else {
                        let object = glib::Object::from_glib_full(object_ptr as *mut glib::gobject_ffi::GObject);
                        Object::GObject(object)
                    };
                    Ok(Value::Object(ObjectId::new(object)))
                } else { bail!("ref storage mismatch") }
            }
            Type::Boxed(btype) => {
                if let RefStorage::PointerPtr(p) = &self.storage {
                    let boxed_ptr = *p.clone();
                    let boxed = if btype.is_borrowed {
                        let boxed = Boxed::from_glib_none(glib::Type::from_name(&btype.type_).unwrap(), boxed_ptr);
                        Object::Boxed(boxed)
                    } else {
                        let boxed = Boxed::from_glib_full(glib::Type::from_name(&btype.type_).unwrap(), boxed_ptr);
                        Object::Boxed(boxed)
                    };
                    Ok(Value::Object(ObjectId::new(boxed)))
                } else { bail!("ref storage mismatch") }
            }
            Type::Null => Ok(Value::Null),
            Type::Array(_) | Type::Callback | Type::Ref(_) => bail!("Unsupported ref inner type for readback"),
        }
    }
}
