use std::ffi::CString;

use crate::cif::Arg as CifArg;
use crate::result::Result;
use crate::types::{FloatSize, IntegerSign, IntegerSize, Type};
use crate::value::Value;
use gtk4::glib;
use libffi::middle as ffi;
use neon::prelude::*;

#[derive(Debug)]
pub struct Arg {
    type_: Type,
    value: Value,
}

impl Arg {
    pub fn vec_from_js_value(
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

    pub fn into_ffi_type(&self) -> ffi::Type {
        self.type_.into_ffi_type()
    }

    pub fn into_cif_arg(&self) -> CifArg {
        match &self.type_ {
            Type::Integer(type_) => {
                let number = match self.value {
                    Value::Number(n) => n,
                    _ => panic!("Expected a Number for integer type"),
                };

                match type_.size {
                    IntegerSize::_8 => match type_.sign {
                        IntegerSign::Unsigned => CifArg::U8(number as u8),
                        IntegerSign::Signed => CifArg::I8(number as i8),
                    },
                    IntegerSize::_32 => match type_.sign {
                        IntegerSign::Unsigned => CifArg::U32(number as u32),
                        IntegerSign::Signed => CifArg::I32(number as i32),
                    },
                    IntegerSize::_64 => match type_.sign {
                        IntegerSign::Unsigned => CifArg::U64(number as u64),
                        IntegerSign::Signed => CifArg::I64(number as i64),
                    },
                }
            }
            Type::Float(type_) => {
                let number = match self.value {
                    Value::Number(n) => n,
                    _ => panic!("Expected a Number for float type"),
                };

                match type_.size {
                    FloatSize::_32 => CifArg::F32(number as f32),
                    FloatSize::_64 => CifArg::F64(number),
                }
            }
            Type::String => {
                let string = match &self.value {
                    Value::String(s) => s,
                    _ => panic!("Expected a String for string type"),
                };

                let cstring = CString::new(string.as_bytes()).unwrap();
                CifArg::String(cstring)
            }
            Type::Boolean => {
                let boolean = match self.value {
                    Value::Boolean(b) => b,
                    _ => panic!("Expected a Boolean for boolean type"),
                };

                CifArg::U8(if boolean { 1 } else { 0 })
            }
            Type::Null => CifArg::Pointer(std::ptr::null_mut()),
            Type::GObject(_) => {
                let object_id = match &self.value {
                    Value::Object(id) => id,
                    _ => panic!("Expected a Object for gobject type"),
                };

                CifArg::Pointer(object_id.as_ptr())
            }
            Type::Boxed(_) => {
                let object_id = match &self.value {
                    Value::Object(id) => id,
                    _ => panic!("Expected a Boxed for boxed type"),
                };

                CifArg::Pointer(object_id.as_ptr())
            }
            Type::Array(ref array_type) => {
                let array = match &self.value {
                    Value::Array(arr) => arr,
                    _ => panic!("Expected an Array for array type"),
                };

                match *array_type.item_type {
                    Type::Integer(type_) => {
                        let values = array
                            .into_iter()
                            .map(|v| match v {
                                Value::Number(n) => n,
                                _ => panic!("Expected a Number for integer array type"),
                            })
                            .collect::<Vec<_>>();

                        match (type_.size, type_.sign) {
                            (IntegerSize::_8, IntegerSign::Unsigned) => {
                                CifArg::U8Array(values.iter().map(|&v| *v as u8).collect())
                            }
                            (IntegerSize::_8, IntegerSign::Signed) => {
                                CifArg::I8Array(values.iter().map(|&v| *v as i8).collect())
                            }
                            (IntegerSize::_32, IntegerSign::Unsigned) => {
                                CifArg::U32Array(values.iter().map(|&v| *v as u32).collect())
                            }
                            (IntegerSize::_32, IntegerSign::Signed) => {
                                CifArg::I32Array(values.iter().map(|&v| *v as i32).collect())
                            }
                            (IntegerSize::_64, IntegerSign::Unsigned) => {
                                CifArg::U64Array(values.iter().map(|&v| *v as u64).collect())
                            }
                            (IntegerSize::_64, IntegerSign::Signed) => {
                                CifArg::I64Array(values.iter().map(|&v| *v as i64).collect())
                            }
                        }
                    }
                    Type::Float(type_) => {
                        let values = array
                            .into_iter()
                            .map(|v| match v {
                                Value::Number(n) => n,
                                _ => panic!("Expected a Number for float array type"),
                            })
                            .collect::<Vec<_>>();

                        match type_.size {
                            FloatSize::_32 => {
                                CifArg::F32Array(values.iter().map(|&v| *v as f32).collect())
                            }
                            FloatSize::_64 => {
                                CifArg::F64Array(values.iter().map(|&v| *v).collect())
                            }
                        }
                    }
                    Type::String => {
                        let cstrings = array
                            .into_iter()
                            .map(|v| match v {
                                Value::String(s) => CString::new(s.as_bytes()).unwrap(),
                                _ => panic!("Expected a String for string array type"),
                            })
                            .collect::<Vec<_>>();

                        CifArg::StringArray(cstrings)
                    }
                    Type::GObject(_) => {
                        let pointers = array
                            .into_iter()
                            .map(|v| match v {
                                Value::Object(id) => id.as_ptr(),
                                _ => panic!("Expected a GObject for gobject array type"),
                            })
                            .collect::<Vec<_>>();

                        CifArg::PointerArray(pointers)
                    }
                    Type::Boxed(_) => {
                        let pointers = array
                            .into_iter()
                            .map(|v| match v {
                                Value::Object(id) => id.as_ptr(),
                                _ => panic!("Expected a Boxed object for pointer array type"),
                            })
                            .collect::<Vec<_>>();

                        CifArg::PointerArray(pointers)
                    }
                    Type::Boolean => {
                        let values = array
                            .into_iter()
                            .map(|v| match v {
                                Value::Boolean(b) => {
                                    if *b {
                                        1
                                    } else {
                                        0
                                    }
                                }
                                _ => panic!("Expected a Boolean for boolean array type"),
                            })
                            .collect::<Vec<_>>();

                        CifArg::U8Array(values)
                    }
                    _ => panic!("Unsupported array item type"),
                }
            }
            Type::Callback => {
                let (callback, channel) = match &self.value {
                    Value::Callback(callback, channel) => (callback, channel),
                    _ => panic!("Expected a callback for callback type"),
                };

                let channel = channel.clone();
                let callback = callback.clone();

                let closure = glib::Closure::new(move |args: &[glib::Value]| {
                    println!("Callback called with args: {:?}", args);
                    let args_values = args
                        .into_iter()
                        .map(|v| Value::from_glib_value(v))
                        .collect::<Vec<_>>();

                    let callback = callback.clone();

                    let result = channel.send(move |mut cx| {
                        let js_args = args_values
                            .into_iter()
                            .map(|v| v.to_js_value(&mut cx))
                            .collect::<NeonResult<Vec<_>>>()?;

                        let js_this = cx.undefined();
                        let js_callback = callback.clone().to_inner(&mut cx);
                        let js_result = js_callback.call(&mut cx, js_this, js_args)?;

                        let result = Result::from_js_value(&mut cx, js_result).unwrap();

                        Ok(result)
                    });

                    result.join().unwrap().to_glib_value()
                });

                CifArg::Callback(closure)
            }
        }
    }
}
