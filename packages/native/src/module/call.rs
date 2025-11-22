use std::{
    ffi::{c_char, c_void},
    sync::{Arc, mpsc},
};

use anyhow::bail;
use gtk4::glib;
use libffi::middle as ffi;
use neon::prelude::*;

use crate::{
    arg::Arg,
    cif,
    state::GtkThreadState,
    types::{FloatSize, IntegerSign, IntegerSize, Type},
    value::Value,
};

type RefUpdate = (Arc<Root<JsObject>>, Value);

pub fn call(mut cx: FunctionContext) -> JsResult<JsValue> {
    let library_name = cx.argument::<JsString>(0)?.value(&mut cx);
    let symbol_name = cx.argument::<JsString>(1)?.value(&mut cx);
    let js_args = cx.argument::<JsArray>(2)?;
    let js_result_type = cx.argument::<JsObject>(3)?;
    let args = Arg::from_js_array(&mut cx, js_args)?;
    let result_type = Type::from_js_value(&mut cx, js_result_type.upcast())?;

    // For void-returning functions with no ref parameters, don't block waiting for the result
    // This prevents deadlock when the GTK function triggers a callback synchronously
    let has_refs = args.iter().any(|arg| matches!(arg.value, crate::value::Value::Ref(_)));
    let is_void = matches!(result_type, Type::Undefined | Type::Null);

    if is_void && !has_refs {
        // Fire and forget for void functions without refs
        glib::idle_add_once(move || {
            if let Err(err) = handle_call(library_name, symbol_name, args, result_type) {
                eprintln!("Error during void FFI call: {err}");
            }
        });

        return Ok(cx.undefined().upcast());
    }

    // For non-void functions, we need to wait for the result
    let (tx, rx) = mpsc::channel::<anyhow::Result<(Value, Vec<RefUpdate>)>>();

    glib::idle_add_once(move || {
        tx.send(handle_call(library_name, symbol_name, args, result_type))
            .unwrap();
    });

    let (value, ref_updates) = rx
        .recv()
        .or_else(|err| cx.throw_error(format!("Error receiving function call result: {err}")))?
        .or_else(|err| cx.throw_error(format!("Error during FFI call: {err}")))?;

    for (js_obj, new_value) in ref_updates {
        let js_obj = js_obj.to_inner(&mut cx);
        let new_js_value = new_value.to_js_value(&mut cx)?;
        let mut prop = js_obj.prop(&mut cx, "value");

        prop.set(new_js_value)?;
    }

    Ok(value.to_js_value(&mut cx)?)
}

fn handle_call(
    library_name: String,
    symbol_name: String,
    args: Vec<Arg>,
    result_type: Type,
) -> anyhow::Result<(Value, Vec<RefUpdate>)> {
    let arg_types: Vec<ffi::Type> = args.iter().map(|arg| (&arg.type_).into()).collect();

    let cif = ffi::Builder::new()
        .res((&result_type).into())
        .args(arg_types)
        .into_cif();

    let cif_args = args
        .clone()
        .into_iter()
        .map(TryInto::<cif::Value>::try_into)
        .collect::<anyhow::Result<Vec<cif::Value>>>()?;

    let mut ffi_args: Vec<ffi::Arg> = cif_args.iter().map(Into::into).collect();

    let symbol_ptr = unsafe {
        GtkThreadState::with::<_, anyhow::Result<ffi::CodePtr>>(|state| {
            let library = state.get_library(&library_name)?;
            let symbol = library.get::<unsafe extern "C" fn() -> ()>(symbol_name.as_bytes())?;

            let ptr = symbol.try_as_raw_ptr().ok_or(anyhow::anyhow!(
                "Failed to get raw pointer for symbol '{}'",
                symbol_name
            ))?;

            Ok(ffi::CodePtr(ptr))
        })?
    };

    let result = unsafe {
        match result_type {
            Type::Undefined => {
                cif.call::<()>(symbol_ptr, &mut ffi_args);
                cif::Value::Void
            }
            Type::Integer(type_) => match (type_.size, type_.sign) {
                (IntegerSize::_8, IntegerSign::Unsigned) => {
                    cif::Value::U8(cif.call::<u8>(symbol_ptr, &mut ffi_args))
                }
                (IntegerSize::_8, IntegerSign::Signed) => {
                    cif::Value::I8(cif.call::<i8>(symbol_ptr, &mut ffi_args))
                }
                (IntegerSize::_32, IntegerSign::Unsigned) => {
                    cif::Value::U32(cif.call::<u32>(symbol_ptr, &mut ffi_args))
                }
                (IntegerSize::_32, IntegerSign::Signed) => {
                    cif::Value::I32(cif.call::<i32>(symbol_ptr, &mut ffi_args))
                }
                (IntegerSize::_64, IntegerSign::Unsigned) => {
                    cif::Value::U64(cif.call::<u64>(symbol_ptr, &mut ffi_args))
                }
                (IntegerSize::_64, IntegerSign::Signed) => {
                    cif::Value::I64(cif.call::<i64>(symbol_ptr, &mut ffi_args))
                }
            },
            Type::Float(type_) => match type_.size {
                FloatSize::_32 => cif::Value::F32(cif.call::<f32>(symbol_ptr, &mut ffi_args)),
                FloatSize::_64 => cif::Value::F64(cif.call::<f64>(symbol_ptr, &mut ffi_args)),
            },
            Type::String => {
                let ptr = cif.call::<*const c_char>(symbol_ptr, &mut ffi_args);
                cif::Value::Ptr(ptr as *mut c_void)
            }
            Type::Boolean => cif::Value::U8(cif.call::<u8>(symbol_ptr, &mut ffi_args)),
            Type::GObject(_) | Type::Boxed(_) => {
                let ptr = cif.call::<*mut c_void>(symbol_ptr, &mut ffi_args);
                cif::Value::Ptr(ptr)
            }
            Type::Null => cif::Value::Void,
            _ => bail!("Unsupported return type: {:?}", result_type),
        }
    };

    let mut ref_updates = Vec::new();

    for (i, arg) in args.iter().enumerate() {
        if let Value::Ref(r#ref) = &arg.value {
            ref_updates.push((
                r#ref.js_obj.clone(),
                Value::from_cif_value(&cif_args[i], &arg.type_)?,
            ));
        }
    }

    Ok((Value::from_cif_value(&result, &result_type)?, ref_updates))
}
