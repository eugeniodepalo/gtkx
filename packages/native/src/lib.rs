use libffi::middle as ffi;
use neon::{object::Object as _, prelude::*};

use std::{
    cell::{OnceCell, RefCell},
    collections::HashMap,
    ffi::{c_char, c_void, CString},
    sync::{mpsc, Arc},
};

use gtk4::{
    gio,
    glib::{
        self,
        translate::{FromGlibPtrFull, FromGlibPtrNone as _, IntoGlib},
    },
    prelude::*,
};

struct GtkThreadState(RefCell<OnceCell<GtkThreadStateInner>>);

impl GtkThreadState {
    fn new() -> Self {
        Self(RefCell::new(OnceCell::new()))
    }

    fn with<F, R>(f: F) -> R
    where
        F: FnOnce(&mut GtkThreadStateInner) -> R,
    {
        GTK_THREAD_STATE.with(|state| {
            let mut inner = state.0.borrow_mut();

            inner.get_or_init(|| GtkThreadStateInner {
                library: unsafe { libloading::Library::new("libgtk-4.so.1").unwrap() },
                next_object_id: 0,
                object_map: HashMap::new(),
                app_hold_guard: None,
            });

            f(inner.get_mut().unwrap())
        })
    }
}

struct GtkThreadStateInner {
    library: libloading::Library,
    next_object_id: usize,
    object_map: HashMap<usize, Object>,
    app_hold_guard: Option<gio::ApplicationHoldGuard>,
}

thread_local! {
    static GTK_THREAD_STATE: GtkThreadState = GtkThreadState::new();
}

#[derive(Debug)]
struct Boxed {
    ptr: *mut c_void,
    type_: glib::Type,
}

impl Boxed {
    fn from_glib_full(type_: glib::Type, ptr: *mut c_void) -> Self {
        Boxed { ptr, type_ }
    }

    fn from_glib_none(type_: glib::Type, ptr: *mut c_void) -> Self {
        let cloned_ptr = unsafe { glib::gobject_ffi::g_boxed_copy(type_.into_glib(), ptr) };

        Boxed {
            ptr: cloned_ptr,
            type_,
        }
    }
}

impl Clone for Boxed {
    fn clone(&self) -> Self {
        let cloned_ptr =
            unsafe { glib::gobject_ffi::g_boxed_copy(self.type_.into_glib(), self.ptr) };

        Boxed {
            ptr: cloned_ptr,
            type_: self.type_,
        }
    }
}

impl Drop for Boxed {
    fn drop(&mut self) {
        unsafe {
            glib::gobject_ffi::g_boxed_free(self.type_.into_glib(), self.ptr);
        }
    }
}

#[derive(Debug)]
enum Object {
    GObject(glib::Object),
    Boxed(Boxed),
}

impl Clone for Object {
    fn clone(&self) -> Self {
        match self {
            Object::GObject(obj) => Object::GObject(obj.clone()),
            Object::Boxed(boxed) => Object::Boxed(boxed.clone()),
        }
    }
}

#[derive(Debug, Clone, Copy)]
struct ObjectId(usize);

impl ObjectId {
    fn new(object: Object) -> Self {
        GtkThreadState::with(|state| {
            let id = state.next_object_id;
            state.next_object_id += 1;
            state.object_map.insert(id, object.clone());
            ObjectId(id)
        })
    }

    fn as_ptr(&self) -> *mut c_void {
        GtkThreadState::with(|state| {
            let object = state.object_map.get(&self.0).unwrap();

            match object {
                Object::GObject(obj) => obj.as_ptr() as *mut c_void,
                Object::Boxed(boxed) => boxed.ptr,
            }
        })
    }
}

impl Finalize for ObjectId {
    fn finalize<'a, C: Context<'a>>(self, _cx: &mut C) {
        glib::idle_add_once(move || {
            GtkThreadState::with(|state| {
                state.object_map.remove(&self.0);
            });
        });
    }
}

#[derive(Debug, Clone, Copy)]
enum IntegerSize {
    _8,
    _32,
    _64,
}

impl IntegerSize {
    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let size = value.downcast::<JsNumber, _>(cx).or_throw(cx)?;

        match size.value(cx) as u64 {
            8 => Ok(IntegerSize::_8),
            32 => Ok(IntegerSize::_32),
            64 => Ok(IntegerSize::_64),
            _ => cx.throw_type_error("Invalid integer size"),
        }
    }
}

#[derive(Debug, Clone, Copy)]
enum IntegerSign {
    Unsigned,
    Signed,
}

impl IntegerSign {
    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let is_signed = value
            .downcast::<JsBoolean, _>(cx)
            .map(|b| b.value(cx))
            .unwrap_or(false);

        Ok(if is_signed {
            IntegerSign::Signed
        } else {
            IntegerSign::Unsigned
        })
    }
}

#[derive(Debug, Clone, Copy)]
enum FloatSize {
    _32,
    _64,
}

impl FloatSize {
    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let size = value.downcast::<JsNumber, _>(cx).or_throw(cx)?;

        match size.value(cx) as u64 {
            32 => Ok(FloatSize::_32),
            64 => Ok(FloatSize::_64),
            _ => cx.throw_type_error("Invalid float size"),
        }
    }
}

#[derive(Debug, Clone, Copy)]
struct IntegerType {
    size: IntegerSize,
    sign: IntegerSign,
}

impl IntegerType {
    fn new(size: IntegerSize, sign: IntegerSign) -> Self {
        IntegerType { size, sign }
    }

    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let size_prop = obj.prop(cx, "size").get()?;
        let sign_prop = obj.prop(cx, "signed").get()?;
        let size = IntegerSize::from_js_value(cx, size_prop)?;
        let sign = IntegerSign::from_js_value(cx, sign_prop)?;

        Ok(Self::new(size, sign))
    }

    fn into_ffi_type(&self) -> ffi::Type {
        match (self.size, self.sign) {
            (IntegerSize::_8, IntegerSign::Unsigned) => ffi::Type::u8(),
            (IntegerSize::_8, IntegerSign::Signed) => ffi::Type::i8(),
            (IntegerSize::_32, IntegerSign::Unsigned) => ffi::Type::u32(),
            (IntegerSize::_32, IntegerSign::Signed) => ffi::Type::i32(),
            (IntegerSize::_64, IntegerSign::Unsigned) => ffi::Type::u64(),
            (IntegerSize::_64, IntegerSign::Signed) => ffi::Type::i64(),
        }
    }
}

#[derive(Debug, Clone, Copy)]
struct FloatType {
    size: FloatSize,
}

impl FloatType {
    fn new(size: FloatSize) -> Self {
        FloatType { size }
    }

    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let size_prop = obj.prop(cx, "size").get()?;
        let size = FloatSize::from_js_value(cx, size_prop)?;

        Ok(Self::new(size))
    }

    fn into_ffi_type(&self) -> ffi::Type {
        match self.size {
            FloatSize::_32 => ffi::Type::f32(),
            FloatSize::_64 => ffi::Type::f64(),
        }
    }
}

#[derive(Debug, Clone, Copy)]
struct GObjectType {
    is_borrowed: bool,
}

impl GObjectType {
    fn new(is_borrowed: bool) -> Self {
        GObjectType { is_borrowed }
    }

    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let is_borrowed_prop: Handle<'_, JsValue> = obj.prop(cx, "borrowed").get()?;

        let is_borrowed = is_borrowed_prop
            .downcast::<JsBoolean, _>(cx)
            .map(|b| b.value(cx))
            .unwrap_or(false);

        Ok(Self::new(is_borrowed))
    }

    fn into_ffi_type(&self) -> ffi::Type {
        ffi::Type::pointer()
    }
}

#[derive(Debug, Clone)]
struct BoxedType {
    is_borrowed: bool,
    type_: String,
}

impl BoxedType {
    fn new(is_borrowed: bool, type_: String) -> Self {
        BoxedType { is_borrowed, type_ }
    }

    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
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

    fn into_ffi_type(&self) -> ffi::Type {
        ffi::Type::pointer()
    }
}

#[derive(Debug, Clone)]
struct ArrayType {
    item_type: Box<Type>,
}

impl ArrayType {
    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let item_type_value: Handle<'_, JsValue> = obj.prop(cx, "itemType").get()?;
        let item_type = Type::from_js_value(cx, item_type_value)?;

        Ok(Self {
            item_type: Box::new(item_type),
        })
    }

    fn into_ffi_type(&self) -> ffi::Type {
        ffi::Type::pointer()
    }
}

#[derive(Debug, Clone)]
enum Type {
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
    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
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

    fn into_ffi_type(&self) -> ffi::Type {
        match self {
            Type::Integer(type_) => type_.into_ffi_type(),
            Type::Float(type_) => type_.into_ffi_type(),
            Type::String => ffi::Type::pointer(),
            Type::Boolean => ffi::Type::u8(),
            Type::Null => ffi::Type::pointer(),
            Type::GObject(type_) => type_.into_ffi_type(),
            Type::Boxed(type_) => type_.into_ffi_type(),
            Type::Array(type_) => type_.into_ffi_type(),
            Type::Callback => ffi::Type::pointer(),
        }
    }
}

#[derive(Debug)]
enum Value {
    Number(f64),
    String(String),
    Boolean(bool),
    Object(ObjectId),
    Null,
    Array(Vec<Value>),
    Callback(Arc<Root<JsFunction>>, Channel),
}

impl Value {
    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
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

    fn to_js_value<'a, C: Context<'a>>(&self, cx: &mut C) -> NeonResult<Handle<'a, JsValue>> {
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

    fn from_glib_value(value: &glib::Value) -> Self {
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

#[derive(Debug)]
struct Arg {
    type_: Type,
    value: Value,
}

impl Arg {
    fn vec_from_js_value(
        cx: &mut FunctionContext,
        value: Handle<JsArray>,
    ) -> NeonResult<Vec<Self>> {
        let array = value.to_vec(cx)?;
        let mut args = Vec::with_capacity(array.len());

        for item in array {
            args.push(Self::from_js_value(cx, item)?);
        }

        Ok(args)
    }

    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let type_prop: Handle<'_, JsValue> = obj.prop(cx, "type").get()?;
        let value_prop: Handle<'_, JsValue> = obj.prop(cx, "value").get()?;
        let type_ = Type::from_js_value(cx, type_prop)?;
        let value = Value::from_js_value(cx, value_prop)?;

        Ok(Arg { type_, value })
    }

    pub fn into_ffi_type(&self) -> ffi::Type {
        self.type_.into_ffi_type()
    }

    pub fn into_cif_arg(&self) -> CifArg {
        match &self.type_ {
            Type::Integer(type_) => {
                let number = match self.value {
                    Value::Number(n) => n,
                    _ => panic!("Expected a Number for integer type"),
                };

                match type_.size {
                    IntegerSize::_8 => match type_.sign {
                        IntegerSign::Unsigned => CifArg::U8(number as u8),
                        IntegerSign::Signed => CifArg::I8(number as i8),
                    },
                    IntegerSize::_32 => match type_.sign {
                        IntegerSign::Unsigned => CifArg::U32(number as u32),
                        IntegerSign::Signed => CifArg::I32(number as i32),
                    },
                    IntegerSize::_64 => match type_.sign {
                        IntegerSign::Unsigned => CifArg::U64(number as u64),
                        IntegerSign::Signed => CifArg::I64(number as i64),
                    },
                }
            }
            Type::Float(type_) => {
                let number = match self.value {
                    Value::Number(n) => n,
                    _ => panic!("Expected a Number for float type"),
                };

                match type_.size {
                    FloatSize::_32 => CifArg::F32(number as f32),
                    FloatSize::_64 => CifArg::F64(number),
                }
            }
            Type::String => {
                let string = match &self.value {
                    Value::String(s) => s,
                    _ => panic!("Expected a String for string type"),
                };

                let cstring = CString::new(string.as_bytes()).unwrap();
                CifArg::String(cstring)
            }
            Type::Boolean => {
                let boolean = match self.value {
                    Value::Boolean(b) => b,
                    _ => panic!("Expected a Boolean for boolean type"),
                };

                CifArg::U8(if boolean { 1 } else { 0 })
            }
            Type::Null => CifArg::Pointer(std::ptr::null_mut()),
            Type::GObject(_) => {
                let object_id = match &self.value {
                    Value::Object(id) => id,
                    _ => panic!("Expected a Object for gobject type"),
                };

                CifArg::Pointer(object_id.as_ptr())
            }
            Type::Boxed(_) => {
                let object_id = match &self.value {
                    Value::Object(id) => id,
                    _ => panic!("Expected a Boxed for boxed type"),
                };

                CifArg::Pointer(object_id.as_ptr())
            }
            Type::Array(ref array_type) => {
                let array = match &self.value {
                    Value::Array(arr) => arr,
                    _ => panic!("Expected an Array for array type"),
                };

                match *array_type.item_type {
                    Type::Integer(type_) => {
                        let values = array
                            .into_iter()
                            .map(|v| match v {
                                Value::Number(n) => n,
                                _ => panic!("Expected a Number for integer array type"),
                            })
                            .collect::<Vec<_>>();

                        match (type_.size, type_.sign) {
                            (IntegerSize::_8, IntegerSign::Unsigned) => {
                                CifArg::U8Array(values.iter().map(|&v| *v as u8).collect())
                            }
                            (IntegerSize::_8, IntegerSign::Signed) => {
                                CifArg::I8Array(values.iter().map(|&v| *v as i8).collect())
                            }
                            (IntegerSize::_32, IntegerSign::Unsigned) => {
                                CifArg::U32Array(values.iter().map(|&v| *v as u32).collect())
                            }
                            (IntegerSize::_32, IntegerSign::Signed) => {
                                CifArg::I32Array(values.iter().map(|&v| *v as i32).collect())
                            }
                            (IntegerSize::_64, IntegerSign::Unsigned) => {
                                CifArg::U64Array(values.iter().map(|&v| *v as u64).collect())
                            }
                            (IntegerSize::_64, IntegerSign::Signed) => {
                                CifArg::I64Array(values.iter().map(|&v| *v as i64).collect())
                            }
                        }
                    }
                    Type::Float(type_) => {
                        let values = array
                            .into_iter()
                            .map(|v| match v {
                                Value::Number(n) => n,
                                _ => panic!("Expected a Number for float array type"),
                            })
                            .collect::<Vec<_>>();

                        match type_.size {
                            FloatSize::_32 => {
                                CifArg::F32Array(values.iter().map(|&v| *v as f32).collect())
                            }
                            FloatSize::_64 => {
                                CifArg::F64Array(values.iter().map(|&v| *v).collect())
                            }
                        }
                    }
                    Type::String => {
                        let cstrings = array
                            .into_iter()
                            .map(|v| match v {
                                Value::String(s) => CString::new(s.as_bytes()).unwrap(),
                                _ => panic!("Expected a String for string array type"),
                            })
                            .collect::<Vec<_>>();

                        CifArg::StringArray(cstrings)
                    }
                    Type::GObject(_) => {
                        let pointers = array
                            .into_iter()
                            .map(|v| match v {
                                Value::Object(id) => id.as_ptr(),
                                _ => panic!("Expected a GObject for gobject array type"),
                            })
                            .collect::<Vec<_>>();

                        CifArg::PointerArray(pointers)
                    }
                    Type::Boxed(_) => {
                        let pointers = array
                            .into_iter()
                            .map(|v| match v {
                                Value::Object(id) => id.as_ptr(),
                                _ => panic!("Expected a Boxed object for pointer array type"),
                            })
                            .collect::<Vec<_>>();

                        CifArg::PointerArray(pointers)
                    }
                    Type::Boolean => {
                        let values = array
                            .into_iter()
                            .map(|v| match v {
                                Value::Boolean(b) => {
                                    if *b {
                                        1
                                    } else {
                                        0
                                    }
                                }
                                _ => panic!("Expected a Boolean for boolean array type"),
                            })
                            .collect::<Vec<_>>();

                        CifArg::U8Array(values)
                    }
                    _ => panic!("Unsupported array item type"),
                }
            }
            Type::Callback => {
                let (callback, channel) = match &self.value {
                    Value::Callback(callback, channel) => (callback, channel),
                    _ => panic!("Expected a callback for callback type"),
                };

                let channel = channel.clone();
                let callback = callback.clone();

                let closure = glib::Closure::new(move |args: &[glib::Value]| {
                    println!("Callback called with args: {:?}", args);
                    let args_values = args
                        .into_iter()
                        .map(|v| Value::from_glib_value(v))
                        .collect::<Vec<_>>();

                    let callback = callback.clone();

                    let return_value = channel.send(move |mut cx| {
                        let js_args = args_values
                            .into_iter()
                            .map(|v| v.to_js_value(&mut cx))
                            .collect::<NeonResult<Vec<_>>>()?;

                        let js_this = cx.undefined();
                        let js_callback = callback.clone().to_inner(&mut cx);
                        let js_return_value = js_callback.call(&mut cx, js_this, js_args)?;

                        let return_value =
                            ReturnValue::from_js_value(&mut cx, js_return_value).unwrap();

                        Ok(return_value)
                    });

                    return_value.join().unwrap().to_glib_value()
                });

                CifArg::Callback(closure)
            }
        }
    }
}

enum CifArg {
    U8(u8),
    I8(i8),
    U32(u32),
    I32(i32),
    U64(u64),
    I64(i64),
    F32(f32),
    F64(f64),
    U8Array(Vec<u8>),
    I8Array(Vec<i8>),
    U32Array(Vec<u32>),
    I32Array(Vec<i32>),
    U64Array(Vec<u64>),
    I64Array(Vec<i64>),
    F32Array(Vec<f32>),
    F64Array(Vec<f64>),
    StringArray(Vec<CString>),
    PointerArray(Vec<*mut c_void>),
    Callback(glib::Closure),
    String(CString),
    Pointer(*mut c_void),
}

impl CifArg {
    fn into_raw(&self) -> RawCifArg {
        match self {
            CifArg::U8(value) => RawCifArg::U8(*value),
            CifArg::I8(value) => RawCifArg::I8(*value),
            CifArg::U32(value) => RawCifArg::U32(*value),
            CifArg::I32(value) => RawCifArg::I32(*value),
            CifArg::U64(value) => RawCifArg::U64(*value),
            CifArg::I64(value) => RawCifArg::I64(*value),
            CifArg::F32(value) => RawCifArg::F32(*value),
            CifArg::F64(value) => RawCifArg::F64(*value),
            CifArg::String(cstring) => {
                let ptr = cstring.as_ptr();
                RawCifArg::Pointer(ptr as *mut c_void)
            }
            CifArg::Pointer(ptr) => RawCifArg::Pointer(*ptr),
            CifArg::U8Array(values) => {
                let ptr = values.as_ptr() as *const c_void;
                RawCifArg::Pointer(ptr as *mut c_void)
            }
            CifArg::I8Array(values) => {
                let ptr = values.as_ptr() as *const c_void;
                RawCifArg::Pointer(ptr as *mut c_void)
            }
            CifArg::U32Array(values) => {
                let ptr = values.as_ptr() as *const c_void;
                RawCifArg::Pointer(ptr as *mut c_void)
            }
            CifArg::I32Array(values) => {
                let ptr = values.as_ptr() as *const c_void;
                RawCifArg::Pointer(ptr as *mut c_void)
            }
            CifArg::U64Array(values) => {
                let ptr = values.as_ptr() as *const c_void;
                RawCifArg::Pointer(ptr as *mut c_void)
            }
            CifArg::I64Array(values) => {
                let ptr = values.as_ptr() as *const c_void;
                RawCifArg::Pointer(ptr as *mut c_void)
            }
            CifArg::F32Array(values) => {
                let ptr = values.as_ptr() as *const c_void;
                RawCifArg::Pointer(ptr as *mut c_void)
            }
            CifArg::F64Array(values) => {
                let ptr = values.as_ptr() as *const c_void;
                RawCifArg::Pointer(ptr as *mut c_void)
            }
            CifArg::StringArray(cstrings) => {
                let ptrs: Vec<*const c_char> = cstrings.iter().map(|s| s.as_ptr()).collect();
                let ptr = ptrs.as_ptr();
                RawCifArg::Pointer(ptr as *mut c_void)
            }
            CifArg::PointerArray(pointers) => {
                let ptrs: Vec<*mut c_void> = pointers.iter().map(|p| *p).collect();
                let ptr = ptrs.as_ptr();
                RawCifArg::Pointer(ptr as *mut c_void)
            }
            CifArg::Callback(closure) => {
                let ptr = closure.as_ptr() as *mut c_void;
                RawCifArg::Pointer(ptr)
            }
        }
    }
}

enum RawCifArg {
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

impl RawCifArg {
    fn into_ffi_arg(&self) -> ffi::Arg {
        match self {
            RawCifArg::U8(value) => ffi::arg(value),
            RawCifArg::I8(value) => ffi::arg(value),
            RawCifArg::U32(value) => ffi::arg(value),
            RawCifArg::I32(value) => ffi::arg(value),
            RawCifArg::U64(value) => ffi::arg(value),
            RawCifArg::I64(value) => ffi::arg(value),
            RawCifArg::F32(value) => ffi::arg(value),
            RawCifArg::F64(value) => ffi::arg(value),
            RawCifArg::Pointer(ptr) => ffi::arg(ptr),
        }
    }
}

enum ReturnType {
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

impl ReturnType {
    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let type_prop: Handle<'_, JsValue> = obj.prop(cx, "type").get()?;

        let type_ = type_prop
            .downcast::<JsString, _>(cx)
            .or_throw(cx)?
            .value(cx);

        match type_.as_str() {
            "void" => Ok(ReturnType::Void),
            "null" => Ok(ReturnType::Null),
            "int" => Ok(ReturnType::Integer(IntegerType::from_js_value(cx, value)?)),
            "float" => Ok(ReturnType::Float(FloatType::from_js_value(cx, value)?)),
            "string" => Ok(ReturnType::String),
            "boolean" => Ok(ReturnType::Boolean),
            "gobject" => Ok(ReturnType::GObject(GObjectType::from_js_value(cx, value)?)),
            "boxed" => Ok(ReturnType::Boxed(BoxedType::from_js_value(cx, value)?)),
            "array" => Ok(ReturnType::Array(ArrayType::from_js_value(
                cx,
                obj.upcast(),
            )?)),
            "callback" => Ok(ReturnType::Callback),
            _ => cx.throw_type_error("Unknown return type"),
        }
    }

    fn into_ffi_type(&self) -> ffi::Type {
        match self {
            ReturnType::Void => ffi::Type::void(),
            ReturnType::Null => ffi::Type::pointer(),
            ReturnType::Integer(type_) => type_.into_ffi_type(),
            ReturnType::Float(type_) => type_.into_ffi_type(),
            ReturnType::String => ffi::Type::pointer(),
            ReturnType::Boolean => ffi::Type::u8(),
            ReturnType::GObject(type_) => type_.into_ffi_type(),
            ReturnType::Boxed(type_) => type_.into_ffi_type(),
            ReturnType::Array(type_) => type_.into_ffi_type(),
            ReturnType::Callback => ffi::Type::pointer(),
        }
    }
}

enum ReturnValue {
    Void,
    Null,
    Number(f64),
    String(String),
    Boolean(bool),
    Object(ObjectId),
}

impl ReturnValue {
    fn from_js_value(cx: &mut Cx, value: Handle<JsValue>) -> NeonResult<Self> {
        if let Ok(number) = value.downcast::<JsNumber, _>(cx) {
            return Ok(ReturnValue::Number(number.value(cx)));
        }

        if let Ok(string) = value.downcast::<JsString, _>(cx) {
            return Ok(ReturnValue::String(string.value(cx)));
        }

        if let Ok(boolean) = value.downcast::<JsBoolean, _>(cx) {
            return Ok(ReturnValue::Boolean(boolean.value(cx)));
        }

        if let Ok(object_id) = value.downcast::<JsBox<ObjectId>, _>(cx) {
            return Ok(ReturnValue::Object(object_id.as_inner().clone()));
        }

        if let Ok(_) = value.downcast::<JsUndefined, _>(cx) {
            return Ok(ReturnValue::Null);
        }

        if let Ok(_) = value.downcast::<JsNull, _>(cx) {
            return Ok(ReturnValue::Null);
        }

        cx.throw_type_error("Unsupported JS value type for return value")
    }

    fn to_glib_value(&self) -> Option<glib::Value> {
        match self {
            ReturnValue::Number(n) => Some(glib::Value::from(*n)),
            ReturnValue::String(s) => Some(glib::Value::from(s.clone())),
            ReturnValue::Boolean(b) => Some(glib::Value::from(*b)),
            ReturnValue::Null => None,
            ReturnValue::Void => None,
            _ => panic!("Unsupported Value type for GLib conversion"),
        }
    }
}

fn start(mut cx: FunctionContext) -> JsResult<JsValue> {
    let app_id = cx.argument::<JsString>(0)?.value(&mut cx);
    let (tx, rx) = mpsc::channel::<ObjectId>();

    std::thread::spawn(move || {
        let app = gtk4::Application::builder().application_id(app_id).build();
        let app_object_id = ObjectId::new(Object::GObject(app.clone().into()));

        GtkThreadState::with(|state| state.app_hold_guard = Some(app.hold()));

        app.connect_activate(move |_| {
            tx.send(app_object_id.clone()).unwrap();
        });

        app.run_with_args::<&str>(&[]);
    });

    let app_object_id = rx.recv().unwrap();

    Ok(cx.boxed(app_object_id).upcast())
}

fn stop(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let app_object_id = cx.argument::<JsBox<ObjectId>>(0)?.as_inner().clone();
    let (tx, rx) = mpsc::channel::<()>();

    glib::idle_add_once(move || {
        GtkThreadState::with(|state| {
            state.object_map.remove(&app_object_id.0).unwrap();
            let _ = state.app_hold_guard.take().unwrap();
        });

        tx.send(()).unwrap();
    });

    rx.recv().unwrap();

    Ok(cx.undefined())
}

fn call(mut cx: FunctionContext) -> JsResult<JsValue> {
    let symbol_name = cx.argument::<JsString>(0)?.value(&mut cx);
    let js_args = cx.argument::<JsArray>(1)?;
    let js_return_type = cx.argument::<JsObject>(2)?;
    let args = Arg::vec_from_js_value(&mut cx, js_args)?;
    let return_type = ReturnType::from_js_value(&mut cx, js_return_type.upcast())?;
    let (tx, rx) = mpsc::channel::<ReturnValue>();

    glib::idle_add_once(move || {
        let cif = ffi::Builder::new()
            .res(return_type.into_ffi_type())
            .args(
                args.iter()
                    .map(|arg| arg.into_ffi_type())
                    .collect::<Vec<_>>(),
            )
            .into_cif();

        let mut cif_args = args
            .iter()
            .map(|arg| arg.into_cif_arg())
            .collect::<Vec<_>>();

        let raw_args = cif_args
            .iter_mut()
            .map(|arg| arg.into_raw())
            .collect::<Vec<_>>();

        let mut ffi_args = raw_args
            .iter()
            .map(|arg| arg.into_ffi_arg())
            .collect::<Vec<_>>();

        let symbol_ptr = unsafe {
            GtkThreadState::with(|state: &mut GtkThreadStateInner| {
                let symbol = state
                    .library
                    .get::<unsafe extern "C" fn() -> ()>(symbol_name.as_bytes())
                    .unwrap();

                ffi::CodePtr(symbol.try_as_raw_ptr().unwrap())
            })
        };

        let return_value = unsafe {
            match return_type {
                ReturnType::Void => {
                    cif.call::<()>(symbol_ptr, &mut ffi_args);
                    ReturnValue::Void
                }
                ReturnType::Integer(type_) => match (type_.size, type_.sign) {
                    (IntegerSize::_8, IntegerSign::Unsigned) => {
                        ReturnValue::Number(cif.call::<u8>(symbol_ptr, &mut ffi_args) as f64)
                    }
                    (IntegerSize::_8, IntegerSign::Signed) => {
                        ReturnValue::Number(cif.call::<i8>(symbol_ptr, &mut ffi_args) as f64)
                    }
                    (IntegerSize::_32, IntegerSign::Unsigned) => {
                        ReturnValue::Number(cif.call::<u32>(symbol_ptr, &mut ffi_args) as f64)
                    }
                    (IntegerSize::_32, IntegerSign::Signed) => {
                        ReturnValue::Number(cif.call::<i32>(symbol_ptr, &mut ffi_args) as f64)
                    }
                    (IntegerSize::_64, IntegerSign::Unsigned) => {
                        ReturnValue::Number(cif.call::<u64>(symbol_ptr, &mut ffi_args) as f64)
                    }
                    (IntegerSize::_64, IntegerSign::Signed) => {
                        ReturnValue::Number(cif.call::<i64>(symbol_ptr, &mut ffi_args) as f64)
                    }
                },
                ReturnType::Float(type_) => match type_.size {
                    FloatSize::_32 => {
                        ReturnValue::Number(cif.call::<f32>(symbol_ptr, &mut ffi_args) as f64)
                    }
                    FloatSize::_64 => {
                        ReturnValue::Number(cif.call::<f64>(symbol_ptr, &mut ffi_args))
                    }
                },
                ReturnType::String => {
                    let cstring = cif.call::<CString>(symbol_ptr, &mut ffi_args);
                    let string = cstring.to_str().unwrap_or("").to_string();
                    ReturnValue::String(string)
                }
                ReturnType::Boolean => {
                    let value = cif.call::<u8>(symbol_ptr, &mut ffi_args);
                    ReturnValue::Boolean(value != 0)
                }
                ReturnType::GObject(type_) => {
                    let object_ptr = cif.call::<*mut c_void>(symbol_ptr, &mut ffi_args);

                    let object = if type_.is_borrowed {
                        let object = glib::Object::from_glib_none(
                            object_ptr as *mut glib::gobject_ffi::GObject,
                        );

                        Object::GObject(object)
                    } else {
                        let object = glib::Object::from_glib_full(
                            object_ptr as *mut glib::gobject_ffi::GObject,
                        );

                        Object::GObject(object)
                    };

                    ReturnValue::Object(ObjectId::new(object))
                }
                ReturnType::Boxed(type_) => {
                    let boxed_ptr = cif.call::<*mut c_void>(symbol_ptr, &mut ffi_args);

                    let boxed = if type_.is_borrowed {
                        let boxed = Boxed::from_glib_none(
                            glib::Type::from_name(&type_.type_).unwrap(),
                            boxed_ptr,
                        );

                        Object::Boxed(boxed)
                    } else {
                        let boxed = Boxed::from_glib_full(
                            glib::Type::from_name(&type_.type_).unwrap(),
                            boxed_ptr,
                        );

                        Object::Boxed(boxed)
                    };

                    ReturnValue::Object(ObjectId::new(boxed))
                }
                _ => panic!("Unsupported return type"),
            }
        };

        tx.send(return_value).unwrap();
    });

    let return_value = rx.recv().unwrap();

    let return_js_value = match return_value {
        ReturnValue::Void => cx.undefined().upcast(),
        ReturnValue::Number(value) => cx.number(value).upcast(),
        ReturnValue::String(value) => cx.string(value).upcast(),
        ReturnValue::Boolean(value) => cx.boolean(value).upcast(),
        ReturnValue::Object(object_id) => cx.boxed(object_id.clone()).upcast(),
        ReturnValue::Null => cx.null().upcast(),
    };

    Ok(return_js_value)
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("start", start)?;
    cx.export_function("stop", stop)?;
    cx.export_function("call", call)?;
    Ok(())
}
