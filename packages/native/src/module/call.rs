use std::{
    ffi::{c_void, CString},
    sync::mpsc,
};

use anyhow::{bail, Result as AnyhowResult};
use gtk4::glib::{
    self,
    translate::{FromGlibPtrFull as _, FromGlibPtrNone as _},
};
use libffi::middle as ffi;
use neon::prelude::*;

use crate::{
    arg::Arg,
    cif::{Arg as CifArg, Value as CifValue},
    object::{Boxed, Object},
    result::{Result, ResultType},
    state::{GtkThreadState, ObjectId},
    types::{FloatSize, IntegerSign, IntegerSize},
};

pub fn call(mut cx: FunctionContext) -> JsResult<JsValue> {
    let symbol_name = cx.argument::<JsString>(0)?.value(&mut cx);
    let js_args = cx.argument::<JsArray>(1)?;
    let js_result_type = cx.argument::<JsObject>(2)?;
    let args = Arg::vec_from_js_value(&mut cx, js_args)?;
    let result_type = ResultType::from_js_value(&mut cx, js_result_type.upcast())?;
    let (tx, rx) = mpsc::channel::<AnyhowResult<Result>>();

    glib::idle_add_once(move || {
        let cif = ffi::Builder::new()
            .res((&result_type).into())
            .args(
                args.iter()
                    .map(|arg| arg.type_().into())
                    .collect::<Vec<_>>(),
            )
            .into_cif();

        let cif_args: Vec<CifArg> = match args
            .iter()
            .map(|arg| arg.try_into_cif_arg())
            .collect::<AnyhowResult<Vec<_>>>()
        {
            Ok(cif_args) => cif_args,
            Err(err) => {
                tx.send(Err(err)).unwrap();
                return;
            }
        };

        let raw_args: Vec<CifValue> = cif_args.iter().map(Into::into).collect();

        let mut ffi_args = raw_args.iter().map(Into::into).collect::<Vec<_>>();

        let symbol_ptr = unsafe {
            GtkThreadState::with(|state| {
                let symbol = state
                    .library
                    .get::<unsafe extern "C" fn() -> ()>(symbol_name.as_bytes())
                    .unwrap();

                ffi::CodePtr(symbol.try_as_raw_ptr().unwrap())
            })
        };

        let return_value = (|| -> AnyhowResult<Result> {
            unsafe {
                match result_type {
                    ResultType::Void => {
                        cif.call::<()>(symbol_ptr, &mut ffi_args);
                        Ok(Result::Void)
                    }
                    ResultType::Integer(type_) => match (type_.size, type_.sign) {
                        (IntegerSize::_8, IntegerSign::Unsigned) => Ok(Result::Number(
                            cif.call::<u8>(symbol_ptr, &mut ffi_args) as f64,
                        )),
                        (IntegerSize::_8, IntegerSign::Signed) => Ok(Result::Number(
                            cif.call::<i8>(symbol_ptr, &mut ffi_args) as f64,
                        )),
                        (IntegerSize::_32, IntegerSign::Unsigned) => Ok(Result::Number(
                            cif.call::<u32>(symbol_ptr, &mut ffi_args) as f64,
                        )),
                        (IntegerSize::_32, IntegerSign::Signed) => Ok(Result::Number(
                            cif.call::<i32>(symbol_ptr, &mut ffi_args) as f64,
                        )),
                        (IntegerSize::_64, IntegerSign::Unsigned) => Ok(Result::Number(
                            cif.call::<u64>(symbol_ptr, &mut ffi_args) as f64,
                        )),
                        (IntegerSize::_64, IntegerSign::Signed) => Ok(Result::Number(
                            cif.call::<i64>(symbol_ptr, &mut ffi_args) as f64,
                        )),
                    },
                    ResultType::Float(type_) => match type_.size {
                        FloatSize::_32 => Ok(Result::Number(
                            cif.call::<f32>(symbol_ptr, &mut ffi_args) as f64,
                        )),
                        FloatSize::_64 => {
                            Ok(Result::Number(cif.call::<f64>(symbol_ptr, &mut ffi_args)))
                        }
                    },
                    ResultType::String => {
                        let cstring = cif.call::<CString>(symbol_ptr, &mut ffi_args);
                        let string = cstring.to_str().unwrap_or("").to_string();
                        Ok(Result::String(string))
                    }
                    ResultType::Boolean => {
                        let value = cif.call::<u8>(symbol_ptr, &mut ffi_args);
                        Ok(Result::Boolean(value != 0))
                    }
                    ResultType::GObject(type_) => {
                        let object_ptr = cif.call::<*mut c_void>(symbol_ptr, &mut ffi_args);

                        let object = if type_.is_borrowed {
                            let object = glib::Object::from_glib_none(
                                object_ptr as *mut glib::gobject_ffi::GObject,
                            );

                            Object::GObject(object)
                        } else {
                            let object = glib::Object::from_glib_full(
                                object_ptr as *mut glib::gobject_ffi::GObject,
                            );

                            Object::GObject(object)
                        };

                        Ok(Result::Object(ObjectId::new(object)))
                    }
                    ResultType::Boxed(type_) => {
                        let boxed_ptr = cif.call::<*mut c_void>(symbol_ptr, &mut ffi_args);

                        let boxed = if type_.is_borrowed {
                            let boxed = Boxed::from_glib_none(
                                glib::Type::from_name(&type_.type_).unwrap(),
                                boxed_ptr,
                            );

                            Object::Boxed(boxed)
                        } else {
                            let boxed = Boxed::from_glib_full(
                                glib::Type::from_name(&type_.type_).unwrap(),
                                boxed_ptr,
                            );

                            Object::Boxed(boxed)
                        };

                        Ok(Result::Object(ObjectId::new(boxed)))
                    }
                    ResultType::Null => Ok(Result::Null),
                    ResultType::Array(_) => bail!("Array return type not yet supported"),
                    ResultType::Callback => bail!("Callback return type not yet supported"),
                }
            }
        })();

        tx.send(return_value).unwrap();
    });

    let return_value = rx.recv().unwrap();

    let return_value = match return_value {
        Ok(result) => result,
        Err(err) => return cx.throw_error(format!("FFI call failed: {}", err)),
    };

    let return_js_value = match return_value {
        Result::Void => cx.undefined().upcast(),
        Result::Number(value) => cx.number(value).upcast(),
        Result::String(value) => cx.string(value).upcast(),
        Result::Boolean(value) => cx.boolean(value).upcast(),
        Result::Object(object_id) => cx.boxed(object_id.clone()).upcast(),
        Result::Null => cx.null().upcast(),
    };

    Ok(return_js_value)
}
