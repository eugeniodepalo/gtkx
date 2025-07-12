use libffi::middle as ffi;
use neon::prelude::*;

use crate::types::Type;

#[derive(Debug, Clone)]
pub struct ArrayType {
    pub item_type: Box<Type>,
}

impl ArrayType {
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let item_type_value: Handle<'_, JsValue> = obj.prop(cx, "itemType").get()?;
        let item_type = Type::from_js_value(cx, item_type_value)?;

        Ok(Self {
            item_type: Box::new(item_type),
        })
    }

    pub fn into_ffi_type(&self) -> ffi::Type {
        ffi::Type::pointer()
    }
}
