use anyhow::bail;
use libffi::middle as libffi;
use neon::prelude::*;

use crate::{ffi, value};

#[derive(Debug, Clone, Copy)]
pub enum IntegerKind {
    U8,
    I8,
    U16,
    I16,
    U32,
    I32,
    U64,
    I64,
}

impl IntegerKind {
    pub fn is_unsigned(self) -> bool {
        matches!(self, Self::U8 | Self::U16 | Self::U32 | Self::U64)
    }

    pub fn byte_size(self) -> usize {
        match self {
            Self::U8 | Self::I8 => 1,
            Self::U16 | Self::I16 => 2,
            Self::U32 | Self::I32 => 4,
            Self::U64 | Self::I64 => 8,
        }
    }

    pub fn ffi_type(self) -> libffi::Type {
        match self {
            Self::U8 => libffi::Type::u8(),
            Self::I8 => libffi::Type::i8(),
            Self::U16 => libffi::Type::u16(),
            Self::I16 => libffi::Type::i16(),
            Self::U32 => libffi::Type::u32(),
            Self::I32 => libffi::Type::i32(),
            Self::U64 => libffi::Type::u64(),
            Self::I64 => libffi::Type::i64(),
        }
    }

    pub fn read_ptr(self, ptr: *const u8) -> f64 {
        unsafe {
            match self {
                Self::U8 => ptr.cast::<u8>().read_unaligned() as f64,
                Self::I8 => ptr.cast::<i8>().read_unaligned() as f64,
                Self::U16 => ptr.cast::<u16>().read_unaligned() as f64,
                Self::I16 => ptr.cast::<i16>().read_unaligned() as f64,
                Self::U32 => ptr.cast::<u32>().read_unaligned() as f64,
                Self::I32 => ptr.cast::<i32>().read_unaligned() as f64,
                Self::U64 => ptr.cast::<u64>().read_unaligned() as f64,
                Self::I64 => ptr.cast::<i64>().read_unaligned() as f64,
            }
        }
    }

    pub fn write_ptr(self, ptr: *mut u8, value: f64) {
        unsafe {
            match self {
                Self::U8 => ptr.cast::<u8>().write_unaligned(value as u8),
                Self::I8 => ptr.cast::<i8>().write_unaligned(value as i8),
                Self::U16 => ptr.cast::<u16>().write_unaligned(value as u16),
                Self::I16 => ptr.cast::<i16>().write_unaligned(value as i16),
                Self::U32 => ptr.cast::<u32>().write_unaligned(value as u32),
                Self::I32 => ptr.cast::<i32>().write_unaligned(value as i32),
                Self::U64 => ptr.cast::<u64>().write_unaligned(value as u64),
                Self::I64 => ptr.cast::<i64>().write_unaligned(value as i64),
            }
        }
    }

    pub fn to_ffi_value(self, value: f64) -> ffi::FfiValue {
        match self {
            Self::U8 => ffi::FfiValue::U8(value as u8),
            Self::I8 => ffi::FfiValue::I8(value as i8),
            Self::U16 => ffi::FfiValue::U16(value as u16),
            Self::I16 => ffi::FfiValue::I16(value as i16),
            Self::U32 => ffi::FfiValue::U32(value as u32),
            Self::I32 => ffi::FfiValue::I32(value as i32),
            Self::U64 => ffi::FfiValue::U64(value as u64),
            Self::I64 => ffi::FfiValue::I64(value as i64),
        }
    }

    pub fn read_slice(self, ptr: *const u8, length: usize) -> Vec<f64> {
        unsafe {
            match self {
                Self::U8 => std::slice::from_raw_parts(ptr.cast::<u8>(), length)
                    .iter()
                    .map(|&v| v as f64)
                    .collect(),
                Self::I8 => std::slice::from_raw_parts(ptr.cast::<i8>(), length)
                    .iter()
                    .map(|&v| v as f64)
                    .collect(),
                Self::U16 => std::slice::from_raw_parts(ptr.cast::<u16>(), length)
                    .iter()
                    .map(|&v| v as f64)
                    .collect(),
                Self::I16 => std::slice::from_raw_parts(ptr.cast::<i16>(), length)
                    .iter()
                    .map(|&v| v as f64)
                    .collect(),
                Self::U32 => std::slice::from_raw_parts(ptr.cast::<u32>(), length)
                    .iter()
                    .map(|&v| v as f64)
                    .collect(),
                Self::I32 => std::slice::from_raw_parts(ptr.cast::<i32>(), length)
                    .iter()
                    .map(|&v| v as f64)
                    .collect(),
                Self::U64 => std::slice::from_raw_parts(ptr.cast::<u64>(), length)
                    .iter()
                    .map(|&v| v as f64)
                    .collect(),
                Self::I64 => std::slice::from_raw_parts(ptr.cast::<i64>(), length)
                    .iter()
                    .map(|&v| v as f64)
                    .collect(),
            }
        }
    }

    pub fn to_ffi_storage(self, values: &[f64]) -> ffi::FfiStorage {
        match self {
            Self::U8 => values.iter().map(|&v| v as u8).collect::<Vec<_>>().into(),
            Self::I8 => values.iter().map(|&v| v as i8).collect::<Vec<_>>().into(),
            Self::U16 => values.iter().map(|&v| v as u16).collect::<Vec<_>>().into(),
            Self::I16 => values.iter().map(|&v| v as i16).collect::<Vec<_>>().into(),
            Self::U32 => values.iter().map(|&v| v as u32).collect::<Vec<_>>().into(),
            Self::I32 => values.iter().map(|&v| v as i32).collect::<Vec<_>>().into(),
            Self::U64 => values.iter().map(|&v| v as u64).collect::<Vec<_>>().into(),
            Self::I64 => values.iter().map(|&v| v as i64).collect::<Vec<_>>().into(),
        }
    }

    pub fn vec_to_f64(self, storage: &ffi::FfiStorage) -> anyhow::Result<Vec<f64>> {
        storage.as_numeric_slice(self)
    }

    /// # Safety
    ///
    /// The caller must ensure:
    /// - `cif` matches the function signature of the symbol at `ptr`
    /// - `ptr` is a valid function pointer
    /// - `args` contains valid arguments matching the CIF's expected types
    pub unsafe fn call_cif(
        self,
        cif: &libffi::Cif,
        ptr: libffi::CodePtr,
        args: &[libffi::Arg],
    ) -> ffi::FfiValue {
        unsafe {
            match self {
                Self::U8 => ffi::FfiValue::U8(cif.call::<u8>(ptr, args)),
                Self::I8 => ffi::FfiValue::I8(cif.call::<i8>(ptr, args)),
                Self::U16 => ffi::FfiValue::U16(cif.call::<u16>(ptr, args)),
                Self::I16 => ffi::FfiValue::I16(cif.call::<i16>(ptr, args)),
                Self::U32 => ffi::FfiValue::U32(cif.call::<u32>(ptr, args)),
                Self::I32 => ffi::FfiValue::I32(cif.call::<i32>(ptr, args)),
                Self::U64 => ffi::FfiValue::U64(cif.call::<u64>(ptr, args)),
                Self::I64 => ffi::FfiValue::I64(cif.call::<i64>(ptr, args)),
            }
        }
    }
}

impl From<IntegerKind> for libffi::Type {
    fn from(kind: IntegerKind) -> Self {
        kind.ffi_type()
    }
}

impl IntegerKind {
    pub fn encode(&self, value: &value::Value, optional: bool) -> anyhow::Result<ffi::FfiValue> {
        let number = match value {
            value::Value::Number(n) => *n,
            value::Value::Object(handle) => handle
                .get_ptr_as_usize()
                .ok_or_else(|| anyhow::anyhow!("Object has been garbage collected"))?
                as f64,
            value::Value::Null | value::Value::Undefined if optional => 0.0,
            _ => bail!("Expected a Number for integer type, got {:?}", value),
        };

        Ok(self.to_ffi_value(number))
    }

    pub fn decode(&self, ffi_value: &ffi::FfiValue) -> anyhow::Result<value::Value> {
        Ok(value::Value::Number(ffi_value.to_number()?))
    }
}

#[derive(Debug, Clone)]
pub struct TaggedType {
    pub library: String,
    pub get_type_fn: String,
}

impl TaggedType {
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;

        let library: Handle<JsString> = obj.prop(cx, "library").get()?;
        let get_type_fn: Handle<JsString> = obj.prop(cx, "getTypeFn").get()?;

        Ok(TaggedType {
            library: library.value(cx),
            get_type_fn: get_type_fn.value(cx),
        })
    }
}

#[derive(Debug, Clone, Copy)]
pub enum FloatKind {
    F32,
    F64,
}

impl FloatKind {
    pub fn ffi_type(self) -> libffi::Type {
        match self {
            Self::F32 => libffi::Type::f32(),
            Self::F64 => libffi::Type::f64(),
        }
    }

    pub fn read_ptr(self, ptr: *const u8) -> f64 {
        unsafe {
            match self {
                Self::F32 => ptr.cast::<f32>().read_unaligned() as f64,
                Self::F64 => ptr.cast::<f64>().read_unaligned(),
            }
        }
    }

    pub fn write_ptr(self, ptr: *mut u8, value: f64) {
        unsafe {
            match self {
                Self::F32 => ptr.cast::<f32>().write_unaligned(value as f32),
                Self::F64 => ptr.cast::<f64>().write_unaligned(value),
            }
        }
    }

    pub fn to_ffi_value(self, value: f64) -> ffi::FfiValue {
        match self {
            Self::F32 => ffi::FfiValue::F32(value as f32),
            Self::F64 => ffi::FfiValue::F64(value),
        }
    }

    /// # Safety
    ///
    /// The caller must ensure:
    /// - `cif` matches the function signature of the symbol at `ptr`
    /// - `ptr` is a valid function pointer
    /// - `args` contains valid arguments matching the CIF's expected types
    pub unsafe fn call_cif(
        self,
        cif: &libffi::Cif,
        ptr: libffi::CodePtr,
        args: &[libffi::Arg],
    ) -> ffi::FfiValue {
        unsafe {
            match self {
                Self::F32 => ffi::FfiValue::F32(cif.call::<f32>(ptr, args)),
                Self::F64 => ffi::FfiValue::F64(cif.call::<f64>(ptr, args)),
            }
        }
    }
}

impl From<FloatKind> for libffi::Type {
    fn from(kind: FloatKind) -> Self {
        kind.ffi_type()
    }
}

impl FloatKind {
    pub fn encode(&self, value: &value::Value, optional: bool) -> anyhow::Result<ffi::FfiValue> {
        let number = match value {
            value::Value::Number(n) => *n,
            value::Value::Null | value::Value::Undefined if optional => 0.0,
            _ => bail!("Expected a Number for float type, got {:?}", value),
        };

        Ok(self.to_ffi_value(number))
    }

    pub fn decode(&self, ffi_value: &ffi::FfiValue) -> anyhow::Result<value::Value> {
        Ok(value::Value::Number(ffi_value.to_number()?))
    }
}
