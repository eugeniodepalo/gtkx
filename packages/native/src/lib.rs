use libffi::middle as ffi;
use neon::prelude::*;

use std::{
    any::{Any, TypeId},
    cell::{OnceCell, RefCell},
    collections::HashMap,
    ffi::{c_char, c_void, CString},
    sync::mpsc,
};

use gtk4::{
    gio,
    glib::{
        self,
        translate::{FromGlibPtrBorrow, FromGlibPtrFull},
    },
    prelude::*,
};

type UnrefFn<'a> = libloading::Symbol<'a, unsafe extern "C" fn(*mut c_void)>;
type RefFn<'a> = libloading::Symbol<'a, unsafe extern "C" fn(*mut c_void)>;

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
                object_map: HashMap::new(),
                app_hold_guard: None,
            });

            f(inner.get_mut().unwrap())
        })
    }
}

struct GtkThreadStateInner {
    library: libloading::Library,
    object_map: HashMap<usize, Box<dyn Any>>,
    app_hold_guard: Option<gio::ApplicationHoldGuard>,
}

thread_local! {
    static GTK_THREAD_STATE: GtkThreadState = GtkThreadState::new();
}

#[derive(Debug, Copy, Clone)]
struct ObjectId(usize);

impl ObjectId {
    fn new(id: usize) -> Self {
        Self(id)
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

#[derive(Debug)]
struct Custom {
    ptr: *mut c_void,
    unref: String,
    ref_: String,
}

impl Custom {
    fn from_ptr_full(ptr: *mut c_void, unref: String, ref_: String) -> Self {
        Self { ptr, unref, ref_ }
    }

    fn from_ptr_borrow(ptr: *mut c_void, unref: String, ref_: String) -> Self {
        let custom = Self::from_ptr_full(ptr, unref, ref_);
        custom.ref_();
        custom
    }

    fn ref_(&self) {
        let ref_fn = self.ref_.clone();
        let ptr = self.ptr;

        GtkThreadState::with(|state| {
            let library = &state.library;
            let symbol: RefFn = unsafe { library.get(ref_fn.as_bytes()).unwrap() };

            unsafe {
                symbol(ptr);
            }
        });
    }

    fn unref(&self) {
        let unref_fn = self.unref.clone();
        let ptr = self.ptr;

        GtkThreadState::with(|state| {
            let library = &state.library;
            let symbol: UnrefFn = unsafe { library.get(unref_fn.as_bytes()).unwrap() };

            unsafe {
                symbol(ptr);
            }
        });
    }
}

impl Drop for Custom {
    fn drop(&mut self) {
        self.unref();
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

#[derive(Debug)]
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

#[derive(Debug)]
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
        let size_value = obj.prop(cx, "size").get()?;
        let sign_value = obj.prop(cx, "signed").get()?;
        let size = IntegerSize::from_js_value(cx, size_value)?;
        let sign = IntegerSign::from_js_value(cx, sign_value)?;

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

#[derive(Debug)]
struct FloatType {
    size: FloatSize,
}

impl FloatType {
    fn new(size: FloatSize) -> Self {
        FloatType { size }
    }

    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let size_value = obj.prop(cx, "size").get()?;
        let size = FloatSize::from_js_value(cx, size_value)?;

        Ok(Self::new(size))
    }

    fn into_ffi_type(&self) -> ffi::Type {
        match self.size {
            FloatSize::_32 => ffi::Type::f32(),
            FloatSize::_64 => ffi::Type::f64(),
        }
    }
}

#[derive(Debug)]
struct GObjectType {
    is_borrowed: bool,
}

impl GObjectType {
    fn new(is_borrowed: bool) -> Self {
        GObjectType { is_borrowed }
    }

    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let is_borrowed_value: Handle<'_, JsValue> = obj.prop(cx, "borrowed").get()?;

        let is_borrowed = is_borrowed_value
            .downcast::<JsBoolean, _>(cx)
            .map(|b| b.value(cx))
            .unwrap_or(false);

        Ok(Self::new(is_borrowed))
    }

    fn into_ffi_type(&self) -> ffi::Type {
        ffi::Type::pointer()
    }
}

#[derive(Debug)]
struct CustomType {
    is_borrowed: bool,
    unref: Option<String>,
    ref_: Option<String>,
}

impl CustomType {
    fn new(is_borrowed: bool, unref: Option<String>, ref_: Option<String>) -> Self {
        CustomType {
            is_borrowed,
            unref,
            ref_,
        }
    }

    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let is_borrowed_value: Handle<'_, JsValue> = obj.prop(cx, "borrowed").get()?;

        let is_borrowed = is_borrowed_value
            .downcast::<JsBoolean, _>(cx)
            .map(|b| b.value(cx))
            .unwrap_or(false);

        let unref_value: Handle<'_, JsValue> = obj.prop(cx, "unref").get()?;

        let unref = unref_value
            .downcast::<JsString, _>(cx)
            .map(|s| s.value(cx))
            .ok();

        let ref_value: Handle<'_, JsValue> = obj.prop(cx, "ref").get()?;

        let ref_ = ref_value
            .downcast::<JsString, _>(cx)
            .map(|s| s.value(cx))
            .ok();

        Ok(Self::new(is_borrowed, unref, ref_))
    }

    fn into_ffi_type(&self) -> ffi::Type {
        ffi::Type::pointer()
    }
}

#[derive(Debug)]
struct CallbackType {
    arg_types: Vec<Type>,
    return_type: Type,
}

impl CallbackType {
    fn new(arg_types: Vec<Type>, return_type: Type) -> Self {
        CallbackType {
            arg_types,
            return_type,
        }
    }

    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let arg_types_value: Handle<'_, JsValue> = obj.prop(cx, "argTypes").get()?;

        let arg_types_value = arg_types_value
            .downcast::<JsArray, _>(cx)
            .or_throw(cx)?
            .to_vec(cx)?;

        let return_type_value: Handle<'_, JsValue> = obj.prop(cx, "returnType").get()?;

        let arg_types = arg_types_value
            .into_iter()
            .map(|v| Type::from_js_value(cx, v))
            .collect::<NeonResult<Vec<_>>>()?;

        let return_type = Type::from_js_value(cx, return_type_value)?;

        Ok(CallbackType {
            arg_types,
            return_type,
        })
    }

    fn into_ffi_type(&self) -> ffi::Type {
        ffi::Type::pointer()
    }
}

#[derive(Debug)]
enum ArrayType {
    Integer(IntegerType),
    Float(FloatType),
    String,
    Boolean,
}

impl ArrayType {
    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let item_type_value: Handle<'_, JsValue> = obj.prop(cx, "itemType").get()?;
        let item_type = Type::from_js_value(cx, item_type_value)?;

        match item_type {
            Type::Integer(type_) => Ok(ArrayType::Integer(type_)),
            Type::Float(type_) => Ok(ArrayType::Float(type_)),
            Type::String => Ok(ArrayType::String),
            Type::Boolean => Ok(ArrayType::Boolean),
            _ => cx.throw_type_error("Invalid item type for array"),
        }
    }

    fn into_ffi_type(&self) -> ffi::Type {
        ffi::Type::pointer()
    }
}

#[derive(Debug)]
enum Type {
    Integer(IntegerType),
    Float(FloatType),
    String,
    Boolean,
    GObject(GObjectType),
    Custom(CustomType),
    Array(ArrayType),
    Callback(Box<CallbackType>),
    VoidType,
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
            "gobject" => Ok(Type::GObject(GObjectType::from_js_value(cx, value)?)),
            "custom" => Ok(Type::Custom(CustomType::from_js_value(cx, value)?)),
            "array" => Ok(Type::Array(ArrayType::from_js_value(cx, obj.upcast())?)),
            "callback" => Ok(Type::Callback(Box::new(CallbackType::from_js_value(
                cx, value,
            )?))),
            "void" => Ok(Type::VoidType),
            _ => cx.throw_type_error("Unknown type"),
        }
    }

    fn into_ffi_type(&self) -> ffi::Type {
        match self {
            Type::Integer(type_) => type_.into_ffi_type(),
            Type::Float(type_) => type_.into_ffi_type(),
            Type::String => ffi::Type::pointer(),
            Type::Boolean => ffi::Type::u8(),
            Type::GObject(type_) => type_.into_ffi_type(),
            Type::Custom(type_) => type_.into_ffi_type(),
            Type::Array(type_) => type_.into_ffi_type(),
            Type::Callback(type_) => type_.into_ffi_type(),
            Type::VoidType => ffi::Type::void(),
        }
    }
}

#[derive(Debug)]
enum ArrayArg {
    Integer(IntegerType, Vec<i64>),
    Float(FloatType, Vec<f64>),
    String(Vec<String>),
    Boolean(Vec<bool>),
}

impl ArrayArg {
    fn into_ffi_type(&self) -> ffi::Type {
        ffi::Type::pointer()
    }
}

type BoxedObjectId = JsBox<ObjectId>;

#[derive(Debug)]
enum Arg {
    Integer(IntegerType, i64),
    Float(FloatType, f64),
    String(String),
    Boolean(bool),
    GObject(GObjectType, usize),
    Custom(CustomType, usize),
    Array(ArrayArg),
    Callback(Box<CallbackType>, Root<JsFunction>),
}

impl Arg {
    fn from_js_array(cx: &mut FunctionContext, value: Handle<JsArray>) -> NeonResult<Vec<Self>> {
        let array = value.to_vec(cx)?;
        let mut args = Vec::with_capacity(array.len());

        for item in array {
            args.push(Arg::from_js_value(cx, item)?);
        }

        Ok(args)
    }

    fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let type_ = Type::from_js_value(cx, value)?;

        match type_ {
            Type::Integer(type_) => {
                let value_value: Handle<'_, JsValue> = obj.prop(cx, "value").get()?;

                let value = value_value
                    .downcast::<JsNumber, _>(cx)
                    .or_throw(cx)?
                    .value(cx) as i64;

                Ok(Self::Integer(type_, value))
            }
            Type::Float(type_) => {
                let value_value: Handle<'_, JsValue> = obj.prop(cx, "value").get()?;

                let value = value_value
                    .downcast::<JsNumber, _>(cx)
                    .or_throw(cx)?
                    .value(cx) as f64;

                Ok(Self::Float(type_, value))
            }
            Type::String => {
                let value_value: Handle<'_, JsValue> = obj.prop(cx, "value").get()?;

                let value = value_value
                    .downcast::<JsString, _>(cx)
                    .or_throw(cx)?
                    .value(cx);

                Ok(Self::String(value))
            }
            Type::Boolean => {
                let value_value: Handle<'_, JsValue> = obj.prop(cx, "value").get()?;

                let value = value_value
                    .downcast::<JsBoolean, _>(cx)
                    .or_throw(cx)?
                    .value(cx);

                Ok(Self::Boolean(value))
            }
            Type::GObject(type_) => {
                let value_value: Handle<'_, JsValue> = obj.prop(cx, "value").get()?;

                let value = value_value
                    .downcast::<BoxedObjectId, _>(cx)
                    .or_throw(cx)?
                    .as_inner()
                    .0;

                Ok(Self::GObject(type_, value))
            }
            Type::Custom(type_) => {
                let value_value: Handle<'_, JsValue> = obj.prop(cx, "value").get()?;

                let value = value_value
                    .downcast::<BoxedObjectId, _>(cx)
                    .or_throw(cx)?
                    .as_inner()
                    .0;

                Ok(Self::Custom(type_, value))
            }
            Type::Array(array_type) => {
                let value_value: Handle<'_, JsValue> = obj.prop(cx, "value").get()?;
                let value = value_value.downcast::<JsArray, _>(cx).or_throw(cx)?;

                let array_value = match array_type {
                    ArrayType::Integer(type_) => {
                        let values: Vec<i64> = value
                            .to_vec(cx)?
                            .into_iter()
                            .map(|v| {
                                v.downcast::<JsNumber, _>(cx)
                                    .or_throw(cx)
                                    .unwrap()
                                    .value(cx) as i64
                            })
                            .collect();

                        ArrayArg::Integer(type_, values)
                    }
                    ArrayType::Float(type_) => {
                        let values: Vec<f64> = value
                            .to_vec(cx)?
                            .into_iter()
                            .map(|v| {
                                v.downcast::<JsNumber, _>(cx)
                                    .or_throw(cx)
                                    .unwrap()
                                    .value(cx) as f64
                            })
                            .collect();

                        ArrayArg::Float(type_, values)
                    }
                    ArrayType::String => {
                        let values: Vec<String> = value
                            .to_vec(cx)?
                            .into_iter()
                            .map(|v| {
                                v.downcast::<JsString, _>(cx)
                                    .or_throw(cx)
                                    .unwrap()
                                    .value(cx)
                            })
                            .collect();

                        ArrayArg::String(values)
                    }
                    ArrayType::Boolean => {
                        let values: Vec<bool> = value
                            .to_vec(cx)?
                            .into_iter()
                            .map(|v| {
                                v.downcast::<JsBoolean, _>(cx)
                                    .or_throw(cx)
                                    .unwrap()
                                    .value(cx)
                            })
                            .collect();

                        ArrayArg::Boolean(values)
                    }
                };

                Ok(Self::Array(array_value))
            }
            Type::Callback(type_) => {
                let value_value: Handle<'_, JsValue> = obj.prop(cx, "value").get()?;
                let value = value_value.downcast::<JsFunction, _>(cx).or_throw(cx)?;

                Ok(Self::Callback(type_, value.root(cx)))
            }
            _ => cx.throw_type_error("Unsupported argument type"),
        }
    }

    pub fn into_ffi_type(&self) -> ffi::Type {
        match self {
            Arg::Integer(type_, _) => type_.into_ffi_type(),
            Arg::Float(type_, _) => type_.into_ffi_type(),
            Arg::String(_) => ffi::Type::pointer(),
            Arg::Boolean(_) => ffi::Type::u8(),
            Arg::GObject(type_, _) => type_.into_ffi_type(),
            Arg::Custom(type_, _) => type_.into_ffi_type(),
            Arg::Array(array_arg) => array_arg.into_ffi_type(),
            Arg::Callback(type_, _) => type_.into_ffi_type(),
        }
    }

    pub fn into_cif_arg(&self) -> CifArg {
        match self {
            Arg::Integer(_type, value) => match (_type.size, _type.sign) {
                (IntegerSize::_8, IntegerSign::Unsigned) => CifArg::U8(*value as u8),
                (IntegerSize::_8, IntegerSign::Signed) => CifArg::I8(*value as i8),
                (IntegerSize::_32, IntegerSign::Unsigned) => CifArg::U32(*value as u32),
                (IntegerSize::_32, IntegerSign::Signed) => CifArg::I32(*value as i32),
                (IntegerSize::_64, IntegerSign::Unsigned) => CifArg::U64(*value as u64),
                (IntegerSize::_64, IntegerSign::Signed) => CifArg::I64(*value as i64),
            },
            Arg::Float(_type, value) => match _type.size {
                FloatSize::_32 => CifArg::F32(*value as f32),
                FloatSize::_64 => CifArg::F64(*value),
            },
            Arg::String(value) => CifArg::String(CString::new(value.as_str()).unwrap()),
            Arg::Boolean(value) => CifArg::U8(if *value { 1 } else { 0 }),
            Arg::GObject(_type, value) => CifArg::Pointer(*value as *mut c_void),
            Arg::Custom(_type, value) => CifArg::Pointer(*value as *mut c_void),
            Arg::Array(array_arg) => match array_arg {
                ArrayArg::Integer(_type, values) => CifArg::Pointer(values.as_ptr() as *mut c_void),
                ArrayArg::Float(_type, values) => CifArg::Pointer(values.as_ptr() as *mut c_void),
                ArrayArg::String(values) => {
                    let cstrings: Vec<CString> = values
                        .iter()
                        .map(|s| CString::new(s.as_str()).unwrap())
                        .collect();

                    CifArg::StringArray(cstrings)
                }
                ArrayArg::Boolean(values) => {
                    let ptr = values.as_ptr() as *mut c_void;
                    CifArg::Pointer(ptr)
                }
            },
            Arg::Callback(_, _) => CifArg::Pointer(std::ptr::null_mut()),
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
    String(CString),
    StringArray(Vec<CString>),
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
                RawCifArg::String(ptr)
            }
            CifArg::StringArray(cstrings) => {
                let ptrs: Vec<*const c_char> = cstrings.iter().map(|s| s.as_ptr()).collect();
                let ptr = ptrs.as_ptr();
                RawCifArg::StringArray(ptr)
            }
            CifArg::Pointer(ptr) => RawCifArg::Pointer(*ptr),
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
    String(*const c_char),
    StringArray(*const *const c_char),
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
            RawCifArg::String(ptr) => ffi::arg(ptr),
            RawCifArg::StringArray(ptr) => ffi::arg(ptr),
            RawCifArg::Pointer(ptr) => ffi::arg(ptr),
        }
    }
}

enum ReturnValue {
    Void,
    Number(f64),
    String(String),
    Boolean(bool),
    Object(ObjectId),
}

fn start(mut cx: FunctionContext) -> JsResult<JsValue> {
    let app_id = cx.argument::<JsString>(0)?.value(&mut cx);
    let (tx, rx) = mpsc::channel::<ObjectId>();

    std::thread::spawn(move || {
        let app = gtk4::Application::builder().application_id(app_id).build();
        let app_object_id = app.as_ptr() as usize;

        GtkThreadState::with(|state| {
            state.app_hold_guard = Some(app.hold());

            state
                .object_map
                .insert(app_object_id, Box::new(app.clone()) as Box<dyn Any>);
        });

        app.connect_activate(move |_| {
            tx.send(ObjectId::new(app_object_id)).unwrap();
        });

        app.run_with_args::<&str>(&[]);
    });

    let app_object_id = rx.recv().unwrap();

    Ok(cx.boxed(app_object_id).upcast())
}

fn stop(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let app_object_id = **cx.argument::<BoxedObjectId>(0)?;
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
    let args = Arg::from_js_array(&mut cx, js_args)?;
    let return_type = Type::from_js_value(&mut cx, js_return_type.upcast())?;
    let (tx, rx) = mpsc::channel::<ReturnValue>();

    glib::idle_add_once(move || {
        GtkThreadState::with(|state| {
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

            let symbol = unsafe {
                state
                    .library
                    .get::<unsafe extern "C" fn() -> ()>(symbol_name.as_bytes())
                    .unwrap()
            };

            let symbol_ptr = unsafe { ffi::CodePtr(symbol.try_as_raw_ptr().unwrap()) };

            let return_value = unsafe {
                match return_type {
                    Type::VoidType => {
                        cif.call::<()>(symbol_ptr, &mut ffi_args);
                        ReturnValue::Void
                    }
                    Type::Integer(type_) => match (type_.size, type_.sign) {
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
                    Type::Float(type_) => match type_.size {
                        FloatSize::_32 => {
                            ReturnValue::Number(cif.call::<f32>(symbol_ptr, &mut ffi_args) as f64)
                        }
                        FloatSize::_64 => {
                            ReturnValue::Number(cif.call::<f64>(symbol_ptr, &mut ffi_args))
                        }
                    },
                    Type::String => {
                        let cstring = cif.call::<CString>(symbol_ptr, &mut ffi_args);
                        let string = cstring.to_str().unwrap_or("").to_string();
                        ReturnValue::String(string)
                    }
                    Type::Boolean => {
                        let value = cif.call::<u8>(symbol_ptr, &mut ffi_args);
                        ReturnValue::Boolean(value != 0)
                    }
                    Type::GObject(type_) => {
                        let object_ptr = cif.call::<*mut c_void>(symbol_ptr, &mut ffi_args);
                        let object_id = ObjectId::new(object_ptr as usize);

                        if type_.is_borrowed {
                            state.object_map.insert(
                                object_id.0,
                                Box::new(glib::Object::from_glib_borrow(
                                    object_ptr as *mut glib::gobject_ffi::GObject,
                                )),
                            );
                        } else {
                            state.object_map.insert(
                                object_id.0,
                                Box::new(glib::Object::from_glib_full(
                                    object_ptr as *mut glib::gobject_ffi::GObject,
                                )),
                            );
                        }

                        ReturnValue::Object(object_id)
                    }
                    Type::Custom(type_) => {
                        let object_ptr = cif.call::<*mut c_void>(symbol_ptr, &mut ffi_args);
                        let object_id = ObjectId::new(object_ptr as usize);

                        if type_.is_borrowed {
                            state.object_map.insert(
                                object_id.0,
                                Box::new(Custom::from_ptr_borrow(
                                    object_ptr,
                                    type_.unref.unwrap(),
                                    type_.ref_.unwrap(),
                                )),
                            );
                        } else {
                            state.object_map.insert(
                                object_id.0,
                                Box::new(Custom::from_ptr_full(
                                    object_ptr,
                                    type_.unref.unwrap(),
                                    type_.ref_.unwrap(),
                                )),
                            );
                        }

                        ReturnValue::Object(object_id)
                    }
                    _ => panic!("Unsupported return type"),
                }
            };

            tx.send(return_value).unwrap();
        });
    });

    let return_value = rx.recv().unwrap();

    let return_js_value = match return_value {
        ReturnValue::Void => cx.undefined().upcast(),
        ReturnValue::Number(value) => cx.number(value).upcast(),
        ReturnValue::String(value) => cx.string(value).upcast(),
        ReturnValue::Boolean(value) => cx.boolean(value).upcast(),
        ReturnValue::Object(object_id) => cx.boxed(object_id.clone()).upcast(),
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
