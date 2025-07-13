use std::ffi::c_void;

use libffi::middle as ffi;

pub enum Value {
    U8(u8),
    I8(i8),
    U32(u32),
    I32(i32),
    U64(u64),
    I64(i64),
    F32(f32),
    F64(f64),
    Pointer(*mut c_void),
}

impl From<&Value> for ffi::Arg {
    fn from(value: &Value) -> Self {
        match value {
            Value::U8(val) => ffi::arg(val),
            Value::I8(val) => ffi::arg(val),
            Value::U32(val) => ffi::arg(val),
            Value::I32(val) => ffi::arg(val),
            Value::U64(val) => ffi::arg(val),
            Value::I64(val) => ffi::arg(val),
            Value::F32(val) => ffi::arg(val),
            Value::F64(val) => ffi::arg(val),
            Value::Pointer(val) => ffi::arg(val),
        }
    }
}
