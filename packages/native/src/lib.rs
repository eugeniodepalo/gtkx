use glib::translate::FromGlibPtrFull;
use gtk4::glib;
use gtk4::prelude::*;
use libffi::middle::Cif;
use libffi::middle::{Arg as FfiArg, CodePtr, Type};
use libloading::Library;
use neon::prelude::*;
use std::any::Any;
use std::cell::OnceCell;
use std::cell::RefCell;
use std::ffi::c_void;
use std::ffi::CStr;
use std::sync::atomic::AtomicBool;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::mpsc;

const APP_OBJECT_ID: usize = 0;

thread_local! {
    static GTK4_LIBRARY: OnceCell<Library> = OnceCell::new();

    static OBJECT_MAP: RefCell<std::collections::HashMap<usize, Box<dyn Any>>> =
        RefCell::new(std::collections::HashMap::new());

    static APP_HOLD_GUARD: RefCell<Option<gtk4::gio::ApplicationHoldGuard>> =
        RefCell::new(None);

    static NEXT_OBJECT_ID: AtomicUsize = AtomicUsize::new(1);
}

static IS_APP_RUNNING: AtomicBool = AtomicBool::new(false);

#[derive(Debug)]
struct ObjectId(usize);

impl ObjectId {
    fn new() -> Self {
        let id = NEXT_OBJECT_ID.with(|id| id.fetch_add(1, Ordering::SeqCst));
        ObjectId(id)
    }
}

impl Finalize for ObjectId {
    fn finalize<'a, C: Context<'a>>(self, _cx: &mut C) {
        if !IS_APP_RUNNING.load(Ordering::SeqCst) {
            return;
        }

        glib::idle_add_once(move || {
            OBJECT_MAP.with(|map| {
                let mut map = map.borrow_mut();
                map.remove(&self.0);
            });
        });
    }
}

#[derive(Debug)]
struct Custom {
    ptr: *mut c_void,
    unref: String,
}

impl Custom {
    fn new(ptr: *mut c_void, unref: String) -> Self {
        Custom { ptr, unref }
    }
}

impl Drop for Custom {
    fn drop(&mut self) {
        let unref = self.unref.clone();
        let ptr = self.ptr;

        GTK4_LIBRARY.with(|lib| {
            let symbol: libloading::Symbol<unsafe extern "C" fn(*mut c_void)> =
                unsafe { lib.get().unwrap().get(unref.as_bytes()).unwrap() };
            unsafe { symbol(ptr) };
        });
    }
}

#[derive(Debug)]
enum IntegerSize {
    _8,
    _16,
    _32,
    _64,
}

#[derive(Debug)]
enum IntegerSign {
    Unsigned,
    Signed,
}

#[derive(Debug)]
enum FloatSize {
    _32,
    _64,
}

#[derive(Debug)]
enum Arg {
    Integer(i64, IntegerSize, IntegerSign),
    Float(f64, FloatSize),
    String(String),
    Boolean(bool),
    Object(usize),
    IntegerArray(Vec<i64>, IntegerSize, IntegerSign),
    FloatArray(Vec<f64>, FloatSize),
    StringArray(Vec<String>),
    BooleanArray(Vec<bool>),
}

#[derive(Debug)]
enum CifArg {
    U8(u8),
    U16(u16),
    U32(u32),
    U64(u64),
    I8(i8),
    I16(i16),
    I32(i32),
    I64(i64),
    F32(f32),
    F64(f64),
    Boolean(u8),
    String(Box<CStr>),
    Pointer(*const c_void),
    StringArray(Box<[Box<CStr>]>),
    U8Array(Vec<u8>),
    U16Array(Vec<u16>),
    U32Array(Vec<u32>),
    U64Array(Vec<u64>),
    I8Array(Vec<i8>),
    I16Array(Vec<i16>),
    I32Array(Vec<i32>),
    I64Array(Vec<i64>),
    F32Array(Vec<f32>),
    F64Array(Vec<f64>),
}

#[derive(Debug)]
enum Result {
    Void,
    Number(f64),
    String(String),
    Boolean(bool),
    Object(ObjectId),
}

fn start(mut cx: FunctionContext) -> JsResult<JsValue> {
    let app_id = cx.argument::<JsString>(0)?.value(&mut cx);
    let (send, recv) = mpsc::channel();

    std::thread::spawn(move || {
        let app = gtk4::Application::builder().application_id(app_id).build();

        GTK4_LIBRARY.with(|lib| {
            let _ = lib.set(unsafe { Library::new("libgtk-4.so.1").unwrap() });
        });

        OBJECT_MAP.with(|map| {
            let mut map = map.borrow_mut();
            map.insert(APP_OBJECT_ID, Box::new(app.clone()) as Box<dyn Any>);
        });

        app.connect_activate(move |app| {
            let send = send.clone();

            APP_HOLD_GUARD.with(|guard| {
                let mut guard = guard.borrow_mut();
                *guard = Some(app.hold());
            });

            IS_APP_RUNNING.store(true, Ordering::SeqCst);

            glib::idle_add_once(move || {
                send.send(()).unwrap();
            });
        });

        app.run_with_args::<&str>(&[]);
    });

    recv.recv().unwrap();

    Ok(cx.boxed(ObjectId(APP_OBJECT_ID)).upcast())
}

fn quit(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    if !IS_APP_RUNNING.load(Ordering::SeqCst) {
        panic!("Application is not running, cannot quit.");
    }

    let (send, recv) = mpsc::channel();

    glib::idle_add_once(move || {
        OBJECT_MAP.with(|map| {
            let map = map.borrow_mut();
            let app = map.get(&APP_OBJECT_ID).unwrap();
            let app = app.downcast_ref::<gtk4::Application>().unwrap();
            let send = send.clone();

            app.connect_shutdown(move |_| {
                OBJECT_MAP.with(|map| {
                    map.borrow_mut().clear();
                });

                NEXT_OBJECT_ID.with(|id| {
                    id.store(0, Ordering::SeqCst);
                });

                APP_HOLD_GUARD.with(|guard| {
                    let mut guard = guard.borrow_mut();
                    *guard = None;
                });

                IS_APP_RUNNING.store(false, Ordering::SeqCst);

                send.send(()).unwrap();
            });

            app.quit();
        });
    });

    recv.recv().unwrap();

    Ok(cx.undefined())
}

fn extract_args(cx: &mut FunctionContext, js_args: Handle<JsArray>) -> NeonResult<Vec<Arg>> {
    let args_len = js_args.len(cx);
    let mut args = Vec::with_capacity(args_len as usize);

    for i in 0..args_len {
        let arg_obj = js_args
            .get::<JsValue, _, _>(cx, i)?
            .downcast_or_throw::<JsObject, _>(cx)?;
        let arg_type_value = arg_obj.get::<JsString, _, _>(cx, "type")?;
        let arg_type = arg_type_value.value(cx);
        let value = arg_obj.get::<JsValue, _, _>(cx, "value")?;

        match arg_type.as_str() {
            "uint" | "int" => {
                let size = arg_obj.get::<JsNumber, _, _>(cx, "size")?;
                let size_value = size.value(cx) as u8;
                let num_value = value.downcast_or_throw::<JsNumber, _>(cx)?.value(cx) as i64;

                let integer_size = match size_value {
                    8 => IntegerSize::_8,
                    16 => IntegerSize::_16,
                    32 => IntegerSize::_32,
                    64 => IntegerSize::_64,
                    _ => panic!("Invalid integer size"),
                };

                let integer_sign = if arg_type == "uint" {
                    IntegerSign::Unsigned
                } else {
                    IntegerSign::Signed
                };

                args.push(Arg::Integer(num_value, integer_size, integer_sign));
            }
            "float" => {
                let size = arg_obj.get::<JsNumber, _, _>(cx, "size")?;
                let size_value = size.value(cx) as u8;
                let num_value = value.downcast_or_throw::<JsNumber, _>(cx)?.value(cx);

                let float_size = match size_value {
                    32 => FloatSize::_32,
                    64 => FloatSize::_64,
                    _ => panic!("Invalid float size"),
                };

                args.push(Arg::Float(num_value, float_size));
            }
            "boolean" => {
                let bool_value = value.downcast_or_throw::<JsBoolean, _>(cx)?.value(cx);
                args.push(Arg::Boolean(bool_value));
            }
            "string" => {
                let string_value = value.downcast_or_throw::<JsString, _>(cx)?.value(cx);
                args.push(Arg::String(string_value));
            }
            "object" => {
                if value.is_a::<JsBox<ObjectId>, _>(cx) {
                    let obj_id = value.downcast_or_throw::<JsBox<ObjectId>, _>(cx)?;
                    args.push(Arg::Object(obj_id.0));
                } else {
                    panic!("Expected an object ID");
                }
            }
            "array" => {
                let array = value.downcast_or_throw::<JsArray, _>(cx)?;
                let array_length = array.len(cx);
                let element_type = arg_obj.get::<JsObject, _, _>(cx, "elementType")?;
                let element_type_value = element_type.get::<JsString, _, _>(cx, "type")?;
                let element_type_str = element_type_value.value(cx);

                match element_type_str.as_str() {
                    "uint" | "int" => {
                        let size = element_type.get::<JsNumber, _, _>(cx, "size")?;
                        let size_value = size.value(cx) as u8;
                        let integer_size = match size_value {
                            8 => IntegerSize::_8,
                            16 => IntegerSize::_16,
                            32 => IntegerSize::_32,
                            64 => IntegerSize::_64,
                            _ => panic!("Invalid integer size"),
                        };

                        let integer_sign = if element_type_str == "uint" {
                            IntegerSign::Unsigned
                        } else {
                            IntegerSign::Signed
                        };

                        let mut values = Vec::with_capacity(array_length as usize);
                        for i in 0..array_length {
                            let element = array.get::<JsValue, _, _>(cx, i)?;
                            let value =
                                element.downcast_or_throw::<JsNumber, _>(cx)?.value(cx) as i64;
                            values.push(value);
                        }

                        args.push(Arg::IntegerArray(values, integer_size, integer_sign));
                    }
                    "float" => {
                        let size = element_type.get::<JsNumber, _, _>(cx, "size")?;
                        let size_value = size.value(cx) as u8;
                        let float_size = match size_value {
                            32 => FloatSize::_32,
                            64 => FloatSize::_64,
                            _ => panic!("Invalid float size"),
                        };

                        let mut values = Vec::with_capacity(array_length as usize);
                        for i in 0..array_length {
                            let element = array.get::<JsValue, _, _>(cx, i)?;
                            let value = element.downcast_or_throw::<JsNumber, _>(cx)?.value(cx);
                            values.push(value);
                        }

                        args.push(Arg::FloatArray(values, float_size));
                    }
                    "boolean" => {
                        let mut values = Vec::with_capacity(array_length as usize);
                        for i in 0..array_length {
                            let element = array.get::<JsValue, _, _>(cx, i)?;
                            let value = element.downcast_or_throw::<JsBoolean, _>(cx)?.value(cx);
                            values.push(value);
                        }

                        args.push(Arg::BooleanArray(values));
                    }
                    "string" => {
                        let mut values = Vec::with_capacity(array_length as usize);
                        for i in 0..array_length {
                            let element = array.get::<JsValue, _, _>(cx, i)?;
                            let value = element.downcast_or_throw::<JsString, _>(cx)?.value(cx);
                            values.push(value);
                        }

                        args.push(Arg::StringArray(values));
                    }
                    _ => {
                        panic!("Unsupported array element type: {}", element_type_str);
                    }
                }
            }
            _ => panic!("Unsupported argument type: {}", arg_type),
        }
    }

    Ok(args)
}

fn prepare_ffi_args(args: &[Arg]) -> (Vec<CifArg>, Vec<Type>) {
    let mut cif_args = Vec::with_capacity(args.len());
    let mut arg_types = Vec::with_capacity(args.len());

    for arg in args {
        match arg {
            Arg::Integer(value, size, sign) => match (size, sign) {
                (IntegerSize::_8, IntegerSign::Unsigned) => {
                    cif_args.push(CifArg::U8(*value as u8));
                    arg_types.push(Type::u8());
                }
                (IntegerSize::_8, IntegerSign::Signed) => {
                    cif_args.push(CifArg::I8(*value as i8));
                    arg_types.push(Type::i8());
                }
                (IntegerSize::_16, IntegerSign::Unsigned) => {
                    cif_args.push(CifArg::U16(*value as u16));
                    arg_types.push(Type::u16());
                }
                (IntegerSize::_16, IntegerSign::Signed) => {
                    cif_args.push(CifArg::I16(*value as i16));
                    arg_types.push(Type::i16());
                }
                (IntegerSize::_32, IntegerSign::Unsigned) => {
                    cif_args.push(CifArg::U32(*value as u32));
                    arg_types.push(Type::u32());
                }
                (IntegerSize::_32, IntegerSign::Signed) => {
                    cif_args.push(CifArg::I32(*value as i32));
                    arg_types.push(Type::i32());
                }
                (IntegerSize::_64, IntegerSign::Unsigned) => {
                    cif_args.push(CifArg::U64(*value as u64));
                    arg_types.push(Type::u64());
                }
                (IntegerSize::_64, IntegerSign::Signed) => {
                    cif_args.push(CifArg::I64(*value));
                    arg_types.push(Type::i64());
                }
            },
            Arg::Float(value, size) => match size {
                FloatSize::_32 => {
                    cif_args.push(CifArg::F32(*value as f32));
                    arg_types.push(Type::f32());
                }
                FloatSize::_64 => {
                    cif_args.push(CifArg::F64(*value));
                    arg_types.push(Type::f64());
                }
            },
            Arg::String(value) => {
                cif_args.push(CifArg::String(
                    std::ffi::CString::new(value.clone())
                        .unwrap()
                        .into_boxed_c_str(),
                ));
                arg_types.push(Type::pointer());
            }
            Arg::Boolean(value) => {
                cif_args.push(CifArg::Boolean(if *value { 1 } else { 0 }));
                arg_types.push(Type::u8());
            }
            Arg::Object(id) => {
                OBJECT_MAP.with(|map| {
                    let map = map.borrow();
                    let obj = map.get(id).expect("Object not found");

                    let ptr = if let Some(custom) = obj.downcast_ref::<Custom>() {
                        custom.ptr
                    } else if let Some(app) = obj.downcast_ref::<gtk4::Application>() {
                        app.as_ptr() as *mut c_void
                    } else if let Some(obj) = obj.downcast_ref::<glib::Object>() {
                        obj.as_ptr() as *mut c_void
                    } else {
                        panic!(
                            "Unknown object type: {}, type_name: {}",
                            std::any::type_name_of_val(&**obj),
                            std::any::type_name_of_val(&**obj)
                        );
                    };

                    cif_args.push(CifArg::Pointer(ptr));
                    arg_types.push(Type::pointer());
                });
            }
            Arg::IntegerArray(values, size, sign) => {
                match (size, sign) {
                    (IntegerSize::_8, IntegerSign::Unsigned) => {
                        let vec = values.iter().map(|&v| v as u8).collect();
                        cif_args.push(CifArg::U8Array(vec));
                    }
                    (IntegerSize::_8, IntegerSign::Signed) => {
                        let vec = values.iter().map(|&v| v as i8).collect();
                        cif_args.push(CifArg::I8Array(vec));
                    }
                    (IntegerSize::_16, IntegerSign::Unsigned) => {
                        let vec = values.iter().map(|&v| v as u16).collect();
                        cif_args.push(CifArg::U16Array(vec));
                    }
                    (IntegerSize::_16, IntegerSign::Signed) => {
                        let vec = values.iter().map(|&v| v as i16).collect();
                        cif_args.push(CifArg::I16Array(vec));
                    }
                    (IntegerSize::_32, IntegerSign::Unsigned) => {
                        let vec = values.iter().map(|&v| v as u32).collect();
                        cif_args.push(CifArg::U32Array(vec));
                    }
                    (IntegerSize::_32, IntegerSign::Signed) => {
                        let vec = values.iter().map(|&v| v as i32).collect();
                        cif_args.push(CifArg::I32Array(vec));
                    }
                    (IntegerSize::_64, IntegerSign::Unsigned) => {
                        let vec = values.iter().map(|&v| v as u64).collect();
                        cif_args.push(CifArg::U64Array(vec));
                    }
                    (IntegerSize::_64, IntegerSign::Signed) => {
                        let vec = values.iter().map(|&v| v as i64).collect();
                        cif_args.push(CifArg::I64Array(vec));
                    }
                }
                arg_types.push(Type::pointer());
            }
            Arg::FloatArray(values, size) => {
                match size {
                    FloatSize::_32 => {
                        let vec = values.iter().map(|&v| v as f32).collect();
                        cif_args.push(CifArg::F32Array(vec));
                    }
                    FloatSize::_64 => {
                        cif_args.push(CifArg::F64Array(values.clone()));
                    }
                }
                arg_types.push(Type::pointer());
            }
            Arg::StringArray(values) => {
                let cstrings: Vec<Box<CStr>> = values
                    .iter()
                    .map(|s| {
                        std::ffi::CString::new(s.clone())
                            .unwrap()
                            .into_boxed_c_str()
                    })
                    .collect();
                cif_args.push(CifArg::StringArray(cstrings.into_boxed_slice()));
                arg_types.push(Type::pointer());
            }
            Arg::BooleanArray(values) => {
                let vec = values.iter().map(|&v| if v { 1u8 } else { 0u8 }).collect();
                cif_args.push(CifArg::U8Array(vec));
                arg_types.push(Type::pointer());
            }
        }
    }

    (cif_args, arg_types)
}

fn get_ffi_args(cif_args: &[CifArg]) -> Vec<FfiArg> {
    let mut ffi_args = Vec::with_capacity(cif_args.len());

    for arg in cif_args {
        match arg {
            CifArg::U8(v) => ffi_args.push(FfiArg::new(v)),
            CifArg::U16(v) => ffi_args.push(FfiArg::new(v)),
            CifArg::U32(v) => ffi_args.push(FfiArg::new(v)),
            CifArg::U64(v) => ffi_args.push(FfiArg::new(v)),
            CifArg::I8(v) => ffi_args.push(FfiArg::new(v)),
            CifArg::I16(v) => ffi_args.push(FfiArg::new(v)),
            CifArg::I32(v) => ffi_args.push(FfiArg::new(v)),
            CifArg::I64(v) => ffi_args.push(FfiArg::new(v)),
            CifArg::F32(v) => ffi_args.push(FfiArg::new(v)),
            CifArg::F64(v) => ffi_args.push(FfiArg::new(v)),
            CifArg::Boolean(v) => ffi_args.push(FfiArg::new(v)),
            CifArg::String(v) => ffi_args.push(FfiArg::new(v)),
            CifArg::Pointer(v) => ffi_args.push(FfiArg::new(v)),
            CifArg::StringArray(v) => ffi_args.push(FfiArg::new(v)),
            CifArg::U8Array(v) => {
                let ptr = if v.is_empty() {
                    std::ptr::null()
                } else {
                    v.as_ptr()
                };
                ffi_args.push(FfiArg::new(&ptr));
            }
            CifArg::U16Array(v) => {
                let ptr = if v.is_empty() {
                    std::ptr::null()
                } else {
                    v.as_ptr()
                };
                ffi_args.push(FfiArg::new(&ptr));
            }
            CifArg::U32Array(v) => {
                let ptr = if v.is_empty() {
                    std::ptr::null()
                } else {
                    v.as_ptr()
                };
                ffi_args.push(FfiArg::new(&ptr));
            }
            CifArg::U64Array(v) => {
                let ptr = if v.is_empty() {
                    std::ptr::null()
                } else {
                    v.as_ptr()
                };
                ffi_args.push(FfiArg::new(&ptr));
            }
            CifArg::I8Array(v) => {
                let ptr = if v.is_empty() {
                    std::ptr::null()
                } else {
                    v.as_ptr()
                };
                ffi_args.push(FfiArg::new(&ptr));
            }
            CifArg::I16Array(v) => {
                let ptr = if v.is_empty() {
                    std::ptr::null()
                } else {
                    v.as_ptr()
                };
                ffi_args.push(FfiArg::new(&ptr));
            }
            CifArg::I32Array(v) => {
                let ptr = if v.is_empty() {
                    std::ptr::null()
                } else {
                    v.as_ptr()
                };
                ffi_args.push(FfiArg::new(&ptr));
            }
            CifArg::I64Array(v) => {
                let ptr = if v.is_empty() {
                    std::ptr::null()
                } else {
                    v.as_ptr()
                };
                ffi_args.push(FfiArg::new(&ptr));
            }
            CifArg::F32Array(v) => {
                let ptr = if v.is_empty() {
                    std::ptr::null()
                } else {
                    v.as_ptr()
                };
                ffi_args.push(FfiArg::new(&ptr));
            }
            CifArg::F64Array(v) => {
                let ptr = if v.is_empty() {
                    std::ptr::null()
                } else {
                    v.as_ptr()
                };
                ffi_args.push(FfiArg::new(&ptr));
            }
        }
    }

    ffi_args
}

fn call(mut cx: FunctionContext) -> JsResult<JsValue> {
    if !IS_APP_RUNNING.load(Ordering::SeqCst) {
        panic!("Application is not running, cannot call function.");
    }

    let fn_name = cx.argument::<JsString>(0)?.value(&mut cx);
    let js_args = cx.argument::<JsArray>(1)?;
    let js_return_type = cx.argument::<JsObject>(2)?;

    let args = match extract_args(&mut cx, js_args) {
        Ok(args) => args,
        Err(e) => return Err(e),
    };

    let return_type_value = js_return_type
        .get::<JsString, _, _>(&mut cx, "type")?
        .downcast_or_throw::<JsString, _>(&mut cx)?;
    let return_type_str = return_type_value.value(&mut cx);

    let return_size =
        if return_type_str == "uint" || return_type_str == "int" || return_type_str == "float" {
            Some(
                js_return_type
                    .get::<JsNumber, _, _>(&mut cx, "size")?
                    .downcast_or_throw::<JsNumber, _>(&mut cx)?
                    .value(&mut cx) as u8,
            )
        } else {
            None
        };

    let unref_fn = if return_type_str == "custom" {
        Some(
            js_return_type
                .get::<JsString, _, _>(&mut cx, "unref")?
                .downcast_or_throw::<JsString, _>(&mut cx)?
                .value(&mut cx),
        )
    } else {
        None
    };

    let (send, recv) = mpsc::channel();

    glib::idle_add_once(move || {
        let fn_ptr = GTK4_LIBRARY.with(|lib| {
            let symbol =
                unsafe { lib.get().unwrap().get::<*mut c_void>(fn_name.as_bytes()) }.unwrap();

            CodePtr::from_ptr(*symbol)
        });

        let (cif_args, arg_types) = prepare_ffi_args(&args);

        let return_type = match return_type_str.as_str() {
            "uint" | "int" => {
                let size_value = return_size.unwrap_or(32);

                match size_value {
                    8 => {
                        if return_type_str == "uint" {
                            Type::u8()
                        } else {
                            Type::i8()
                        }
                    }
                    16 => {
                        if return_type_str == "uint" {
                            Type::u16()
                        } else {
                            Type::i16()
                        }
                    }
                    32 => {
                        if return_type_str == "uint" {
                            Type::u32()
                        } else {
                            Type::i32()
                        }
                    }
                    64 => {
                        if return_type_str == "uint" {
                            Type::u64()
                        } else {
                            Type::i64()
                        }
                    }
                    _ => {
                        panic!("Invalid integer size");
                    }
                }
            }
            "float" => {
                let size_value = return_size.unwrap_or(64);

                match size_value {
                    32 => Type::f32(),
                    64 => Type::f64(),
                    _ => {
                        panic!("Invalid float size");
                    }
                }
            }
            "boolean" => Type::u8(),
            "string" => Type::pointer(),
            "gobject" => Type::pointer(),
            "custom" => Type::pointer(),
            "void" => Type::void(),
            _ => {
                panic!("Unsupported return type: {}", return_type_str);
            }
        };

        let cif = Cif::new(arg_types, return_type);
        let ffi_args = get_ffi_args(&cif_args);

        match return_type_str.as_str() {
            "void" => {
                unsafe { cif.call::<()>(fn_ptr, &ffi_args) };
                send.send(Result::Void).unwrap();
            }
            "uint" => {
                let size_value = return_size.unwrap_or(32);

                let result = match size_value {
                    8 => unsafe { cif.call::<u8>(fn_ptr, &ffi_args) as f64 },
                    16 => unsafe { cif.call::<u16>(fn_ptr, &ffi_args) as f64 },
                    32 => unsafe { cif.call::<u32>(fn_ptr, &ffi_args) as f64 },
                    64 => unsafe { cif.call::<u64>(fn_ptr, &ffi_args) as f64 },
                    _ => {
                        panic!("Invalid unsigned integer size");
                    }
                };

                send.send(Result::Number(result)).unwrap();
            }
            "int" => {
                let size_value = return_size.unwrap_or(32);

                let result = match size_value {
                    8 => unsafe { cif.call::<i8>(fn_ptr, &ffi_args) as f64 },
                    16 => unsafe { cif.call::<i16>(fn_ptr, &ffi_args) as f64 },
                    32 => unsafe { cif.call::<i32>(fn_ptr, &ffi_args) as f64 },
                    64 => unsafe { cif.call::<i64>(fn_ptr, &ffi_args) as f64 },
                    _ => {
                        panic!("Invalid signed integer size");
                    }
                };

                send.send(Result::Number(result)).unwrap();
            }
            "float" => {
                let size_value = return_size.unwrap_or(64);

                let result = match size_value {
                    32 => unsafe { cif.call::<f32>(fn_ptr, &ffi_args) as f64 },
                    64 => unsafe { cif.call::<f64>(fn_ptr, &ffi_args) },
                    _ => {
                        panic!("Invalid float size");
                    }
                };

                send.send(Result::Number(result)).unwrap();
            }
            "boolean" => {
                let result = unsafe { cif.call::<u8>(fn_ptr, &ffi_args) != 0 };
                send.send(Result::Boolean(result)).unwrap();
            }
            "string" => {
                let result = unsafe { cif.call::<*const i8>(fn_ptr, &ffi_args) };
                if result.is_null() {
                    send.send(Result::String("".to_string())).unwrap();
                } else {
                    let c_str = unsafe { std::ffi::CStr::from_ptr(result) };
                    let string = c_str.to_string_lossy().to_string();
                    send.send(Result::String(string)).unwrap();
                }
            }
            "gobject" => {
                let result = unsafe { cif.call::<*mut c_void>(fn_ptr, &ffi_args) };
                if result.is_null() {
                    panic!("Null pointer returned for GObject");
                } else {
                    let object = unsafe {
                        glib::Object::from_glib_full(result as *mut glib::gobject_ffi::GObject)
                    };
                    let obj_id = ObjectId::new();

                    OBJECT_MAP.with(|map| {
                        let mut map = map.borrow_mut();
                        map.insert(obj_id.0, Box::new(object));
                    });

                    send.send(Result::Object(obj_id)).unwrap();
                }
            }
            "custom" => {
                let result = unsafe { cif.call::<*mut c_void>(fn_ptr, &ffi_args) };
                if result.is_null() {
                    panic!("Null pointer returned for custom type");
                } else {
                    let unref = unref_fn.unwrap_or_else(|| "g_object_unref".to_string());
                    let custom = Custom::new(result, unref);
                    let obj_id = ObjectId::new();

                    OBJECT_MAP.with(|map| {
                        let mut map = map.borrow_mut();
                        map.insert(obj_id.0, Box::new(custom));
                    });

                    send.send(Result::Object(obj_id)).unwrap();
                }
            }
            _ => {
                panic!("Unsupported return type: {}", return_type_str);
            }
        }
    });

    let result = recv.recv().unwrap();

    match result {
        Result::Void => Ok(cx.undefined().upcast()),
        Result::Number(n) => Ok(cx.number(n).upcast()),
        Result::String(s) => Ok(cx.string(s).upcast()),
        Result::Boolean(b) => Ok(cx.boolean(b).upcast()),
        Result::Object(obj_id) => Ok(cx.boxed(obj_id).upcast()),
    }
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("start", start)?;
    cx.export_function("quit", quit)?;
    cx.export_function("call", call)?;
    Ok(())
}
