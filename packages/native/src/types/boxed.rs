use libffi::middle as ffi;
use neon::prelude::*;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BoxedType {
    pub is_borrowed: bool,
    pub type_: String,
}

impl BoxedType {
    pub fn new(is_borrowed: bool, type_: String) -> Self {
        BoxedType { is_borrowed, type_ }
    }

    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let is_borrowed_prop: Handle<'_, JsValue> = obj.prop(cx, "borrowed").get()?;

        let is_borrowed = is_borrowed_prop
            .downcast::<JsBoolean, _>(cx)
            .map(|b| b.value(cx))
            .unwrap_or(false);

        let type_prop: Handle<'_, JsValue> = obj.prop(cx, "type").get()?;

        let type_ = type_prop
            .downcast::<JsString, _>(cx)
            .or_throw(cx)?
            .value(cx);

        Ok(Self::new(is_borrowed, type_))
    }
}

impl From<&BoxedType> for ffi::Type {
    fn from(_value: &BoxedType) -> Self {
        ffi::Type::pointer()
    }
}
