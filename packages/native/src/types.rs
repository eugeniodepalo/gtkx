use libffi::middle as ffi;
use neon::prelude::*;

mod array;
mod boxed;
mod float;
mod gobject;
mod integer;

pub use array::*;
pub use boxed::*;
pub use float::*;
pub use gobject::*;
pub use integer::*;

#[derive(Debug, Clone)]
pub enum Type {
    Integer(IntegerType),
    Float(FloatType),
    String,
    Null,
    Boolean,
    GObject(GObjectType),
    Boxed(BoxedType),
    Array(ArrayType),
    Callback,
}

impl Type {
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let type_value: Handle<'_, JsValue> = obj.prop(cx, "type").get()?;

        let type_ = type_value
            .downcast::<JsString, _>(cx)
            .or_throw(cx)?
            .value(cx);

        match type_.as_str() {
            "int" => Ok(Type::Integer(IntegerType::from_js_value(cx, value)?)),
            "float" => Ok(Type::Float(FloatType::from_js_value(cx, value)?)),
            "string" => Ok(Type::String),
            "boolean" => Ok(Type::Boolean),
            "null" => Ok(Type::Null),
            "gobject" => Ok(Type::GObject(GObjectType::from_js_value(cx, value)?)),
            "boxed" => Ok(Type::Boxed(BoxedType::from_js_value(cx, value)?)),
            "array" => Ok(Type::Array(ArrayType::from_js_value(cx, obj.upcast())?)),
            "callback" => Ok(Type::Callback),
            _ => cx.throw_type_error("Unknown type"),
        }
    }
}

impl From<&Type> for ffi::Type {
    fn from(value: &Type) -> Self {
        match value {
            Type::Integer(type_) => type_.into(),
            Type::Float(type_) => type_.into(),
            Type::String => ffi::Type::pointer(),
            Type::Boolean => ffi::Type::u8(),
            Type::Null => ffi::Type::pointer(),
            Type::GObject(type_) => type_.into(),
            Type::Boxed(type_) => type_.into(),
            Type::Array(type_) => type_.into(),
            Type::Callback => ffi::Type::pointer(),
        }
    }
}
