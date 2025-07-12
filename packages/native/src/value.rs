use std::ffi::c_void;
use std::sync::Arc;

use gtk4::glib;
use neon::object::Object as _;
use neon::prelude::*;

use crate::object::{Boxed, Object};
use crate::state::ObjectId;

#[derive(Debug)]
pub enum Value {
    Number(f64),
    String(String),
    Boolean(bool),
    Object(ObjectId),
    Null,
    Array(Vec<Value>),
    Callback(Arc<Root<JsFunction>>, Channel),
}

impl Value {
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        if let Ok(number) = value.downcast::<JsNumber, _>(cx) {
            return Ok(Value::Number(number.value(cx)));
        }

        if let Ok(string) = value.downcast::<JsString, _>(cx) {
            return Ok(Value::String(string.value(cx)));
        }

        if let Ok(boolean) = value.downcast::<JsBoolean, _>(cx) {
            return Ok(Value::Boolean(boolean.value(cx)));
        }

        if let Ok(_) = value.downcast::<JsNull, _>(cx) {
            return Ok(Value::Null);
        }

        if let Ok(object_id) = value.downcast::<JsBox<ObjectId>, _>(cx) {
            return Ok(Value::Object(object_id.as_inner().clone()));
        }

        if let Ok(callback) = value.downcast::<JsFunction, _>(cx) {
            return Ok(Value::Callback(Arc::new(callback.root(cx)), cx.channel()));
        }

        if let Ok(array) = value.downcast::<JsArray, _>(cx) {
            let values = array.to_vec(cx)?;
            let mut vec_values = Vec::with_capacity(values.len());

            for item in values {
                vec_values.push(Self::from_js_value(cx, item)?);
            }

            return Ok(Value::Array(vec_values));
        }

        cx.throw_type_error("Unsupported JS value type")
    }

    pub fn to_js_value<'a, C: Context<'a>>(&self, cx: &mut C) -> NeonResult<Handle<'a, JsValue>> {
        match self {
            Value::Number(n) => Ok(cx.number(*n).upcast()),
            Value::String(s) => Ok(cx.string(s).upcast()),
            Value::Boolean(b) => Ok(cx.boolean(*b).upcast()),
            Value::Object(id) => Ok(cx.boxed(id.clone()).upcast()),
            Value::Array(arr) => {
                let js_array = cx.empty_array();
                for (i, item) in arr.iter().enumerate() {
                    let js_item = item.to_js_value(cx)?;
                    js_array.set(cx, i as u32, js_item)?;
                }
                Ok(js_array.upcast())
            }
            _ => cx.throw_type_error("Unsupported Value type for JS conversion"),
        }
    }

    pub fn from_glib_value(value: &glib::Value) -> Self {
        if value.is_type(glib::types::Type::I8) {
            Value::Number(value.get::<i8>().unwrap() as f64)
        } else if value.is_type(glib::types::Type::U8) {
            Value::Number(value.get::<u8>().unwrap() as f64)
        } else if value.is_type(glib::types::Type::I32) {
            Value::Number(value.get::<i32>().unwrap() as f64)
        } else if value.is_type(glib::types::Type::U32) {
            Value::Number(value.get::<u32>().unwrap() as f64)
        } else if value.is_type(glib::types::Type::I64) {
            Value::Number(value.get::<i64>().unwrap() as f64)
        } else if value.is_type(glib::types::Type::U64) {
            Value::Number(value.get::<u64>().unwrap() as f64)
        } else if value.is_type(glib::types::Type::F32) {
            Value::Number(value.get::<f32>().unwrap() as f64)
        } else if value.is_type(glib::types::Type::F64) {
            Value::Number(value.get::<f64>().unwrap())
        } else if value.is_type(glib::types::Type::STRING) {
            let string: String = value.get().unwrap();
            Value::String(string)
        } else if value.is_type(glib::types::Type::BOOL) {
            let boolean: bool = value.get().unwrap();
            Value::Boolean(boolean)
        } else if value.is_type(glib::types::Type::OBJECT) {
            let object: glib::Object = value.get().unwrap();
            let object_id = ObjectId::new(Object::GObject(object));
            Value::Object(object_id)
        } else if value.is_type(glib::types::Type::BOXED) {
            let boxed_ptr = value.as_ptr();
            let boxed = Boxed::from_glib_none(value.type_(), boxed_ptr as *mut c_void);
            let object_id = ObjectId::new(Object::Boxed(boxed));
            Value::Object(object_id)
        } else {
            panic!("Unsupported glib value type: {:?}", value.type_());
        }
    }
}
