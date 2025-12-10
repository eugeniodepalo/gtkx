//! Field writing to native objects.

use std::ffi::c_void;
use std::sync::mpsc;

use anyhow::bail;
use gtk4::glib;
use neon::prelude::*;

use crate::{
    object::ObjectId,
    types::{FloatSize, IntegerSign, IntegerSize, Type},
    value::Value,
};

/// Writes a field to a native object at the given offset.
///
/// JavaScript signature: `write(objectId: ObjectId, type: Type, offset: number, value: Value) => void`
///
/// Writes a value of the specified type to the object's memory at the given
/// byte offset.
pub fn write(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let object_id = cx.argument::<JsBox<ObjectId>>(0)?;
    let js_type = cx.argument::<JsObject>(1)?;
    let offset = cx.argument::<JsNumber>(2)?.value(&mut cx) as usize;
    let js_value = cx.argument::<JsValue>(3)?;
    let type_ = Type::from_js_value(&mut cx, js_type.upcast())?;
    let value = Value::from_js_value(&mut cx, js_value)?;
    let object_id = *object_id.as_inner();
    let (tx, rx) = mpsc::channel::<anyhow::Result<()>>();

    glib::idle_add_once(move || {
        let _ = tx.send(handle_write(object_id, &type_, offset, &value));
    });

    rx.recv()
        .or_else(|err| cx.throw_error(format!("Error receiving write result: {err}")))?
        .or_else(|err| cx.throw_error(format!("Error during write: {err}")))?;

    Ok(cx.undefined())
}

fn handle_write(
    object_id: ObjectId,
    type_: &Type,
    offset: usize,
    value: &Value,
) -> anyhow::Result<()> {
    let ptr = object_id.as_ptr();

    if ptr.is_null() {
        bail!("Cannot write field to null pointer");
    }

    let field_ptr = unsafe { (ptr as *mut u8).add(offset) as *mut c_void };

    match (type_, value) {
        (Type::Integer(int_type), Value::Number(n)) => match (int_type.size, int_type.sign) {
            (IntegerSize::_8, IntegerSign::Signed) => {
                unsafe { *(field_ptr as *mut i8) = *n as i8 };
            }
            (IntegerSize::_8, IntegerSign::Unsigned) => {
                unsafe { *(field_ptr as *mut u8) = *n as u8 };
            }
            (IntegerSize::_16, IntegerSign::Signed) => {
                unsafe { *(field_ptr as *mut i16) = *n as i16 };
            }
            (IntegerSize::_16, IntegerSign::Unsigned) => {
                unsafe { *(field_ptr as *mut u16) = *n as u16 };
            }
            (IntegerSize::_32, IntegerSign::Signed) => {
                unsafe { *(field_ptr as *mut i32) = *n as i32 };
            }
            (IntegerSize::_32, IntegerSign::Unsigned) => {
                unsafe { *(field_ptr as *mut u32) = *n as u32 };
            }
            (IntegerSize::_64, IntegerSign::Signed) => {
                unsafe { *(field_ptr as *mut i64) = *n as i64 };
            }
            (IntegerSize::_64, IntegerSign::Unsigned) => {
                unsafe { *(field_ptr as *mut u64) = *n as u64 };
            }
        },
        (Type::Float(float_type), Value::Number(n)) => match float_type.size {
            FloatSize::_32 => unsafe { *(field_ptr as *mut f32) = *n as f32 },
            FloatSize::_64 => unsafe { *(field_ptr as *mut f64) = *n },
        },
        (Type::Boolean, Value::Boolean(b)) => {
            unsafe { *(field_ptr as *mut u8) = u8::from(*b) };
        }
        _ => bail!("Unsupported field type for write: {:?}", type_),
    }

    Ok(())
}
