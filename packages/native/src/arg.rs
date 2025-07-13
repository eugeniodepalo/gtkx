use std::ffi::CString;
use std::sync::Arc;

use crate::cif::Arg as CifArg;
use crate::result::Result;
use crate::types::{FloatSize, IntegerSign, IntegerSize, Type};
use crate::value::Value;
use anyhow::{bail, Context as AnyhowContext, Result as AnyhowResult};
use gtk4::glib;
use neon::prelude::*;

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
        let value = Value::from_js_value(cx, value_prop)?;

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
