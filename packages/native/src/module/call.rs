use std::{
    ffi::{c_void, CString},
    sync::mpsc,
};

use anyhow::Result as AnyhowResult;
use gtk4::glib::{
    self,
    translate::{FromGlibPtrFull as _, FromGlibPtrNone as _},
};
use libffi::middle as ffi;
use libloading::Library;
use neon::prelude::*;
// use neon::object::Object as _; // not needed
use neon::handle::Root;
use std::sync::Arc as StdArc;
use neon::object::Object as _;

use crate::{
    arg::Arg,
    cif::{Arg as CifArg, Value as CifValue},
    object::{Boxed, Object},
    result::{Result, ResultType},
    state::{ObjectId, ThreadState},
    types::{FloatSize, IntegerSign, IntegerSize},
};

pub fn call(mut cx: FunctionContext) -> JsResult<JsValue> {
    let library_name = cx.argument::<JsString>(0)?.value(&mut cx);
    let symbol_name = cx.argument::<JsString>(1)?.value(&mut cx);
    let js_args = cx.argument::<JsArray>(2)?;
    let js_result_type = cx.argument::<JsObject>(3)?;
    let args = Arg::from_js_array(&mut cx, js_args)?;
    let result_type = ResultType::from_js_value(&mut cx, js_result_type.upcast())?;
    let (tx, rx) = mpsc::channel::<AnyhowResult<(Result, Vec<(StdArc<Root<JsObject>>, crate::value::Value)>)>>();

    glib::idle_add_once(move || {
        let cif = ffi::Builder::new()
            .res((&result_type).into())
            .args(
                args.iter()
                    .map(|arg| arg.get_type().into())
                    .collect::<Vec<_>>(),
            )
            .into_cif();

        // Build CIF args while collecting prepared refs for later readback
        let mut prepared_refs: Vec<crate::arg::PreparedRef> = Vec::new();
        let cif_args: Vec<CifArg> = match args
            .iter()
            .map(|arg| arg.try_into_cif_arg_with_ref())
            .collect::<AnyhowResult<Vec<_>>>()
        {
            Ok(pairs) => {
                let mut v = Vec::with_capacity(pairs.len());
                for (cif, maybe_ref) in pairs {
                    v.push(cif);
                    if let Some(pr) = maybe_ref { prepared_refs.push(pr); }
                }
                v
            }
            Err(err) => {
                tx.send(Err(err)).unwrap();
                return;
            }
        };

        let raw_args: Vec<CifValue> = cif_args.iter().map(Into::into).collect();

        let mut ffi_args = raw_args.iter().map(Into::into).collect::<Vec<_>>();

        let symbol_ptr = unsafe {
            let symbol_result = ThreadState::with(|state| {
                if !state.libraries.contains_key(&library_name) {
                    match Library::new(&library_name) {
                        Ok(lib) => {
                            state.libraries.insert(library_name.clone(), lib);
                        }
                        Err(e) => {
                            return Err(anyhow::anyhow!(
                                "Failed to load library '{}': {}",
                                library_name,
                                e
                            ));
                        }
                    }
                }

                match state.libraries.get(&library_name) {
                    Some(lib) => {
                        match lib.get::<unsafe extern "C" fn() -> ()>(symbol_name.as_bytes()) {
                            Ok(symbol) => Ok(ffi::CodePtr(symbol.try_as_raw_ptr().unwrap())),
                            Err(e) => Err(anyhow::anyhow!(
                                "Failed to get symbol '{}' from library '{}': {}",
                                symbol_name,
                                library_name,
                                e
                            )),
                        }
                    }
                    None => Err(anyhow::anyhow!("Library '{}' not loaded", library_name)),
                }
            });

            match symbol_result {
                Ok(ptr) => ptr,
                Err(err) => {
                    tx.send(Err(err)).unwrap();
                    return;
                }
            }
        };

        let result_and_refs = (|| -> AnyhowResult<(Result, Vec<(StdArc<Root<JsObject>>, crate::value::Value)>)> {
            let result: Result = unsafe {
                match result_type {
                    ResultType::Void => {
                        cif.call::<()>(symbol_ptr, &mut ffi_args);
                        Result::Void
                    }
                    ResultType::Integer(type_) => match (type_.size, type_.sign) {
                        (IntegerSize::_8, IntegerSign::Unsigned) => Result::Number(
                            cif.call::<u8>(symbol_ptr, &mut ffi_args) as f64,
                        ),
                        (IntegerSize::_8, IntegerSign::Signed) => Result::Number(
                            cif.call::<i8>(symbol_ptr, &mut ffi_args) as f64,
                        ),
                        (IntegerSize::_32, IntegerSign::Unsigned) => Result::Number(
                            cif.call::<u32>(symbol_ptr, &mut ffi_args) as f64,
                        ),
                        (IntegerSize::_32, IntegerSign::Signed) => Result::Number(
                            cif.call::<i32>(symbol_ptr, &mut ffi_args) as f64,
                        ),
                        (IntegerSize::_64, IntegerSign::Unsigned) => Result::Number(
                            cif.call::<u64>(symbol_ptr, &mut ffi_args) as f64,
                        ),
                        (IntegerSize::_64, IntegerSign::Signed) => Result::Number(
                            cif.call::<i64>(symbol_ptr, &mut ffi_args) as f64,
                        ),
                    },
                    ResultType::Float(type_) => match type_.size {
                        FloatSize::_32 => Result::Number(
                            cif.call::<f32>(symbol_ptr, &mut ffi_args) as f64,
                        ),
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
                    ResultType::Null => Result::Null,
                    ResultType::Array(_) => return Err(anyhow::anyhow!("Array return type not yet supported")),
                    ResultType::Callback => return Err(anyhow::anyhow!("Callback return type not yet supported")),
                }
            };
            // If we reach here, we have a Result. Now read back ref values
            let mut ref_updates: Vec<(StdArc<Root<JsObject>>, crate::value::Value)> = Vec::new();
            for prepared in prepared_refs.into_iter() {
                match unsafe { prepared.read_back_value() } {
                    Ok(value) => ref_updates.push((prepared.js_obj.clone(), value)),
                    Err(_) => {}
                }
            }
            Ok((result, ref_updates))
        })();

        tx.send(result_and_refs).unwrap();
    });

    let result_and_updates = rx.recv().unwrap();

    let (result, updates) = match result_and_updates {
        Ok(v) => v,
        Err(err) => return cx.throw_error(format!("FFI call failed: {}", err)),
    };

    // Apply ref updates synchronously on Node thread
    for (root, value) in updates.into_iter() {
        let obj = root.to_inner(&mut cx);
        let js_value = value.to_js_value(&mut cx)?;
        obj.set(&mut cx, "value", js_value)?;
    }

    let js_result = match result {
        Result::Void => cx.undefined().upcast(),
        Result::Number(value) => cx.number(value).upcast(),
        Result::String(value) => cx.string(value).upcast(),
        Result::Boolean(value) => cx.boolean(value).upcast(),
        Result::Object(object_id) => cx.boxed(object_id.clone()).upcast(),
        Result::Null => cx.null().upcast(),
    };

    Ok(js_result)
}
