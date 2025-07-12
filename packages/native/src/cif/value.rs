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

impl Value {
    pub fn into_ffi_arg(&self) -> ffi::Arg {
        match self {
            Value::U8(value) => ffi::arg(value),
            Value::I8(value) => ffi::arg(value),
            Value::U32(value) => ffi::arg(value),
            Value::I32(value) => ffi::arg(value),
            Value::U64(value) => ffi::arg(value),
            Value::I64(value) => ffi::arg(value),
            Value::F32(value) => ffi::arg(value),
            Value::F64(value) => ffi::arg(value),
            Value::Pointer(ptr) => ffi::arg(ptr),
        }
    }
}
