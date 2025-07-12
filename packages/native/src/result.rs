use crate::{
    state::ObjectId,
    types::{ArrayType, BoxedType, FloatType, GObjectType, IntegerType},
};
use gtk4::glib;
use libffi::middle as ffi;
use neon::prelude::*;

pub enum ResultType {
    Void,
    Null,
    Integer(IntegerType),
    Float(FloatType),
    String,
    Boolean,
    GObject(GObjectType),
    Boxed(BoxedType),
    Array(ArrayType),
    Callback,
}

impl ResultType {
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let type_prop: Handle<'_, JsValue> = obj.prop(cx, "type").get()?;

        let type_ = type_prop
            .downcast::<JsString, _>(cx)
            .or_throw(cx)?
            .value(cx);

        match type_.as_str() {
            "void" => Ok(ResultType::Void),
            "null" => Ok(ResultType::Null),
            "int" => Ok(ResultType::Integer(IntegerType::from_js_value(cx, value)?)),
            "float" => Ok(ResultType::Float(FloatType::from_js_value(cx, value)?)),
            "string" => Ok(ResultType::String),
            "boolean" => Ok(ResultType::Boolean),
            "gobject" => Ok(ResultType::GObject(GObjectType::from_js_value(cx, value)?)),
            "boxed" => Ok(ResultType::Boxed(BoxedType::from_js_value(cx, value)?)),
            "array" => Ok(ResultType::Array(ArrayType::from_js_value(
                cx,
                obj.upcast(),
            )?)),
            "callback" => Ok(ResultType::Callback),
            _ => cx.throw_type_error("Unknown return type"),
        }
    }
}

impl Into<ffi::Type> for &ResultType {
    fn into(self) -> ffi::Type {
        match self {
            ResultType::Void => ffi::Type::void(),
            ResultType::Null => ffi::Type::pointer(),
            ResultType::Integer(type_) => type_.into(),
            ResultType::Float(type_) => type_.into(),
            ResultType::String => ffi::Type::pointer(),
            ResultType::Boolean => ffi::Type::u8(),
            ResultType::GObject(type_) => type_.into(),
            ResultType::Boxed(type_) => type_.into(),
            ResultType::Array(type_) => type_.into(),
            ResultType::Callback => ffi::Type::pointer(),
        }
    }
}

impl Into<ffi::Type> for ResultType {
    fn into(self) -> ffi::Type {
        (&self).into()
    }
}

pub enum Result {
    Void,
    Null,
    Number(f64),
    String(String),
    Boolean(bool),
    Object(ObjectId),
}

impl Result {
    pub fn from_js_value(cx: &mut Cx, value: Handle<JsValue>) -> NeonResult<Self> {
        if let Ok(number) = value.downcast::<JsNumber, _>(cx) {
            return Ok(Result::Number(number.value(cx)));
        }

        if let Ok(string) = value.downcast::<JsString, _>(cx) {
            return Ok(Result::String(string.value(cx)));
        }

        if let Ok(boolean) = value.downcast::<JsBoolean, _>(cx) {
            return Ok(Result::Boolean(boolean.value(cx)));
        }

        if let Ok(object_id) = value.downcast::<JsBox<ObjectId>, _>(cx) {
            return Ok(Result::Object(object_id.as_inner().clone()));
        }

        if let Ok(_) = value.downcast::<JsUndefined, _>(cx) {
            return Ok(Result::Null);
        }

        if let Ok(_) = value.downcast::<JsNull, _>(cx) {
            return Ok(Result::Null);
        }

        cx.throw_type_error("Unsupported JS value type for return value")
    }
}

impl Into<Option<glib::Value>> for &Result {
    fn into(self) -> Option<glib::Value> {
        match self {
            Result::Number(n) => Some((*n).into()),
            Result::String(s) => Some(s.clone().into()),
            Result::Boolean(b) => Some((*b).into()),
            Result::Null => None,
            Result::Void => None,
            _ => panic!("Unsupported Value type for GLib conversion"),
        }
    }
}

impl Into<Option<glib::Value>> for Result {
    fn into(self) -> Option<glib::Value> {
        (&self).into()
    }
}
