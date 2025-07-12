use std::{
    ffi::{c_void, CString},
    sync::mpsc,
};

use gtk4::glib::{
    self,
    translate::{FromGlibPtrFull as _, FromGlibPtrNone as _},
};
use libffi::middle as ffi;
use neon::prelude::*;

use crate::{
    arg::Arg,
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
    let (tx, rx) = mpsc::channel::<Result>();

    glib::idle_add_once(move || {
        let cif = ffi::Builder::new()
            .res(result_type.into_ffi_type())
            .args(
                args.iter()
                    .map(|arg| arg.into_ffi_type())
                    .collect::<Vec<_>>(),
            )
            .into_cif();

        let mut cif_args = args
            .iter()
            .map(|arg| arg.into_cif_arg())
            .collect::<Vec<_>>();

        let raw_args = cif_args
            .iter_mut()
            .map(|arg| arg.into_value())
            .collect::<Vec<_>>();

        let mut ffi_args = raw_args
            .iter()
            .map(|arg| arg.into_ffi_arg())
            .collect::<Vec<_>>();

        let symbol_ptr = unsafe {
            GtkThreadState::with(|state| {
                let symbol = state
                    .library
                    .get::<unsafe extern "C" fn() -> ()>(symbol_name.as_bytes())
                    .unwrap();

                ffi::CodePtr(symbol.try_as_raw_ptr().unwrap())
            })
        };

        let return_value = unsafe {
            match result_type {
                ResultType::Void => {
                    cif.call::<()>(symbol_ptr, &mut ffi_args);
                    Result::Void
                }
                ResultType::Integer(type_) => match (type_.size, type_.sign) {
                    (IntegerSize::_8, IntegerSign::Unsigned) => {
                        Result::Number(cif.call::<u8>(symbol_ptr, &mut ffi_args) as f64)
                    }
                    (IntegerSize::_8, IntegerSign::Signed) => {
                        Result::Number(cif.call::<i8>(symbol_ptr, &mut ffi_args) as f64)
                    }
                    (IntegerSize::_32, IntegerSign::Unsigned) => {
                        Result::Number(cif.call::<u32>(symbol_ptr, &mut ffi_args) as f64)
                    }
                    (IntegerSize::_32, IntegerSign::Signed) => {
                        Result::Number(cif.call::<i32>(symbol_ptr, &mut ffi_args) as f64)
                    }
                    (IntegerSize::_64, IntegerSign::Unsigned) => {
                        Result::Number(cif.call::<u64>(symbol_ptr, &mut ffi_args) as f64)
                    }
                    (IntegerSize::_64, IntegerSign::Signed) => {
                        Result::Number(cif.call::<i64>(symbol_ptr, &mut ffi_args) as f64)
                    }
                },
                ResultType::Float(type_) => match type_.size {
                    FloatSize::_32 => {
                        Result::Number(cif.call::<f32>(symbol_ptr, &mut ffi_args) as f64)
                    }
                    FloatSize::_64 => Result::Number(cif.call::<f64>(symbol_ptr, &mut ffi_args)),
                },
                ResultType::String => {
                    let cstring = cif.call::<CString>(symbol_ptr, &mut ffi_args);
                    let string = cstring.to_str().unwrap_or("").to_string();
                    Result::String(string)
                }
                ResultType::Boolean => {
                    let value = cif.call::<u8>(symbol_ptr, &mut ffi_args);
                    Result::Boolean(value != 0)
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

                    Result::Object(ObjectId::new(object))
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

                    Result::Object(ObjectId::new(boxed))
                }
                _ => panic!("Unsupported return type"),
            }
        };

        tx.send(return_value).unwrap();
    });

    let return_value = rx.recv().unwrap();

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
