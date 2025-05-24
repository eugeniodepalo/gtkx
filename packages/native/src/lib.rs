use glib::translate::{FromGlibPtrFull, FromGlibPtrNone};
use gtk4::glib;
use gtk4::prelude::*;
use libloading::Library;
use neon::prelude::*;
use std::ffi::c_void;
use std::sync::{mpsc, OnceLock};

static GTK4_LIBRARY: OnceLock<Library> = OnceLock::new();
static MAIN_LOOP: OnceLock<glib::MainLoop> = OnceLock::new();

struct GPointer(*mut c_void);

impl Finalize for GPointer {
    fn finalize<'a, C: Context<'a>>(self, _cx: &mut C) {
        if !self.0.is_null() {
            unsafe {
                glib::ffi::g_free(self.0);
            }
        }
    }
}

#[allow(dead_code)]
struct GObjectWrapper(glib::Object);

impl Finalize for GObjectWrapper {
    fn finalize<'a, C: Context<'a>>(self, _cx: &mut C) {}
}

#[derive(Debug)]
enum CallArg {
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
    Boolean(bool),
    String(String),
    Pointer(usize),
    StringArray(Vec<String>),
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

#[allow(dead_code)]
enum FfiArg {
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
    String(std::ffi::CString),
    Pointer(*const c_void),
    StringArray(Vec<std::ffi::CString>),
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

impl FfiArg {
    fn from_call_arg(arg: &CallArg) -> Self {
        match arg {
            CallArg::U8(n) => FfiArg::U8(*n),
            CallArg::U16(n) => FfiArg::U16(*n),
            CallArg::U32(n) => FfiArg::U32(*n),
            CallArg::U64(n) => FfiArg::U64(*n),
            CallArg::I8(n) => FfiArg::I8(*n),
            CallArg::I16(n) => FfiArg::I16(*n),
            CallArg::I32(n) => FfiArg::I32(*n),
            CallArg::I64(n) => FfiArg::I64(*n),
            CallArg::F32(n) => FfiArg::F32(*n),
            CallArg::F64(n) => FfiArg::F64(*n),
            CallArg::String(s) => FfiArg::String(std::ffi::CString::new(s.as_str()).unwrap()),
            CallArg::Boolean(b) => FfiArg::Boolean(*b as u8),
            CallArg::Pointer(ptr) => FfiArg::Pointer(*ptr as *const c_void),
            CallArg::StringArray(arr) => {
                let c_strings: Vec<std::ffi::CString> = arr
                    .iter()
                    .map(|s| std::ffi::CString::new(s.as_str()).unwrap())
                    .collect();
                FfiArg::StringArray(c_strings)
            }
            CallArg::U8Array(arr) => {
                let c_bytes: Vec<u8> = arr.iter().map(|b| *b).collect();
                FfiArg::U8Array(c_bytes)
            }
            CallArg::U16Array(arr) => {
                let c_bytes: Vec<u16> = arr.iter().map(|b| *b).collect();
                FfiArg::U16Array(c_bytes)
            }
            CallArg::U32Array(arr) => {
                let c_bytes: Vec<u32> = arr.iter().map(|b| *b).collect();
                FfiArg::U32Array(c_bytes)
            }
            CallArg::U64Array(arr) => {
                let c_bytes: Vec<u64> = arr.iter().map(|b| *b).collect();
                FfiArg::U64Array(c_bytes)
            }
            CallArg::I8Array(arr) => {
                let c_bytes: Vec<i8> = arr.iter().map(|b| *b).collect();
                FfiArg::I8Array(c_bytes)
            }
            CallArg::I16Array(arr) => {
                let c_bytes: Vec<i16> = arr.iter().map(|b| *b).collect();
                FfiArg::I16Array(c_bytes)
            }
            CallArg::I32Array(arr) => {
                let c_bytes: Vec<i32> = arr.iter().map(|b| *b).collect();
                FfiArg::I32Array(c_bytes)
            }
            CallArg::I64Array(arr) => {
                let c_bytes: Vec<i64> = arr.iter().map(|b| *b).collect();
                FfiArg::I64Array(c_bytes)
            }
            CallArg::F32Array(arr) => {
                let c_bytes: Vec<f32> = arr.iter().map(|b| *b).collect();
                FfiArg::F32Array(c_bytes)
            }
            CallArg::F64Array(arr) => {
                let c_bytes: Vec<f64> = arr.iter().map(|b| *b).collect();
                FfiArg::F64Array(c_bytes)
            }
        }
    }

    fn get_type(&self) -> libffi::middle::Type {
        match self {
            FfiArg::U8(_) => libffi::middle::Type::u8(),
            FfiArg::U16(_) => libffi::middle::Type::u16(),
            FfiArg::U32(_) => libffi::middle::Type::u32(),
            FfiArg::U64(_) => libffi::middle::Type::u64(),
            FfiArg::I8(_) => libffi::middle::Type::i8(),
            FfiArg::I16(_) => libffi::middle::Type::i16(),
            FfiArg::I32(_) => libffi::middle::Type::i32(),
            FfiArg::I64(_) => libffi::middle::Type::i64(),
            FfiArg::F32(_) => libffi::middle::Type::f32(),
            FfiArg::F64(_) => libffi::middle::Type::f64(),
            FfiArg::String(_) => libffi::middle::Type::pointer(),
            FfiArg::Boolean(_) => libffi::middle::Type::u8(),
            FfiArg::Pointer(_) => libffi::middle::Type::pointer(),
            FfiArg::StringArray(_) => libffi::middle::Type::pointer(),
            FfiArg::U8Array(_) => libffi::middle::Type::pointer(),
            FfiArg::U16Array(_) => libffi::middle::Type::pointer(),
            FfiArg::U32Array(_) => libffi::middle::Type::pointer(),
            FfiArg::U64Array(_) => libffi::middle::Type::pointer(),
            FfiArg::I8Array(_) => libffi::middle::Type::pointer(),
            FfiArg::I16Array(_) => libffi::middle::Type::pointer(),
            FfiArg::I32Array(_) => libffi::middle::Type::pointer(),
            FfiArg::I64Array(_) => libffi::middle::Type::pointer(),
            FfiArg::F32Array(_) => libffi::middle::Type::pointer(),
            FfiArg::F64Array(_) => libffi::middle::Type::pointer(),
        }
    }

    fn as_arg(&self) -> libffi::middle::Arg {
        match self {
            FfiArg::U8(n) => libffi::middle::Arg::new(n),
            FfiArg::U16(n) => libffi::middle::Arg::new(n),
            FfiArg::U32(n) => libffi::middle::Arg::new(n),
            FfiArg::U64(n) => libffi::middle::Arg::new(n),
            FfiArg::I8(n) => libffi::middle::Arg::new(n),
            FfiArg::I16(n) => libffi::middle::Arg::new(n),
            FfiArg::I32(n) => libffi::middle::Arg::new(n),
            FfiArg::I64(n) => libffi::middle::Arg::new(n),
            FfiArg::F32(n) => libffi::middle::Arg::new(n),
            FfiArg::F64(n) => libffi::middle::Arg::new(n),
            FfiArg::String(s) => {
                let ptr = s.as_ptr();
                libffi::middle::Arg::new(&ptr)
            }
            FfiArg::Boolean(b) => libffi::middle::Arg::new(b),
            FfiArg::Pointer(ptr) => libffi::middle::Arg::new(ptr),
            FfiArg::StringArray(arr) => {
                let ptr = arr.as_ptr();
                libffi::middle::Arg::new(&ptr)
            }
            FfiArg::U8Array(arr) => {
                let ptr = arr.as_ptr();
                libffi::middle::Arg::new(&ptr)
            }
            FfiArg::U16Array(arr) => {
                let ptr = arr.as_ptr();
                libffi::middle::Arg::new(&ptr)
            }
            FfiArg::U32Array(arr) => {
                let ptr = arr.as_ptr();
                libffi::middle::Arg::new(&ptr)
            }
            FfiArg::U64Array(arr) => {
                let ptr = arr.as_ptr();
                libffi::middle::Arg::new(&ptr)
            }
            FfiArg::I8Array(arr) => {
                let ptr = arr.as_ptr();
                libffi::middle::Arg::new(&ptr)
            }
            FfiArg::I16Array(arr) => {
                let ptr = arr.as_ptr();
                libffi::middle::Arg::new(&ptr)
            }
            FfiArg::I32Array(arr) => {
                let ptr = arr.as_ptr();
                libffi::middle::Arg::new(&ptr)
            }
            FfiArg::I64Array(arr) => {
                let ptr = arr.as_ptr();
                libffi::middle::Arg::new(&ptr)
            }
            FfiArg::F32Array(arr) => {
                let ptr = arr.as_ptr();
                libffi::middle::Arg::new(&ptr)
            }
            FfiArg::F64Array(arr) => {
                let ptr = arr.as_ptr();
                libffi::middle::Arg::new(&ptr)
            }
        }
    }
}

#[derive(Debug)]
enum CallResult {
    Number(f64),
    String(String),
    Boolean(bool),
    GPointer(usize),
    Void,
}

fn start(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let app_id = cx.argument::<JsString>(0)?.value(&mut cx);
    let (send, recv) = mpsc::channel();

    std::thread::spawn(move || {
        let app = gtk4::Application::builder().application_id(app_id).build();
        let _ = GTK4_LIBRARY.set(unsafe { Library::new("libgtk-4.so.1").unwrap() });

        app.connect_activate(move |_| {
            let send = send.clone();
            let main_loop = glib::MainLoop::new(None, false);
            let _ = MAIN_LOOP.set(main_loop);

            glib::idle_add_once(move || {
                send.send(()).unwrap();
            });

            MAIN_LOOP.get().unwrap().run();
        });

        app.run_with_args::<&str>(&[]);
    });

    recv.recv().unwrap();

    Ok(cx.undefined())
}

fn quit(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let (send, recv) = mpsc::channel();

    glib::idle_add_once(move || {
        MAIN_LOOP.get().unwrap().quit();
        send.send(()).unwrap();
    });

    recv.recv().unwrap();

    Ok(cx.undefined())
}

fn call(mut cx: FunctionContext) -> JsResult<JsValue> {
    let (send, recv) = mpsc::channel::<CallResult>();
    let symbol_name = cx.argument::<JsString>(0)?.value(&mut cx);
    let args = cx.argument::<JsArray>(1)?;
    let return_type = cx.argument::<JsString>(2)?.value(&mut cx);
    let return_type_for_conversion = return_type.clone();
    let mut call_args = Vec::<CallArg>::with_capacity(args.len(&mut cx) as usize);

    for i in 0..args.len(&mut cx) {
        let arg = args
            .get_value(&mut cx, i)
            .unwrap()
            .downcast::<JsObject, _>(&mut cx)
            .unwrap();
        let arg_type = arg
            .get_value(&mut cx, "type")
            .unwrap()
            .downcast::<JsString, _>(&mut cx)
            .unwrap()
            .value(&mut cx);
        let arg_value = arg
            .get_value(&mut cx, "value")
            .unwrap()
            .downcast::<JsValue, _>(&mut cx)
            .unwrap();

        match arg_type.as_str() {
            "u8" => {
                let value = arg_value
                    .downcast::<JsNumber, _>(&mut cx)
                    .unwrap()
                    .value(&mut cx);
                call_args.push(CallArg::U8(value as u8));
            }
            "u16" => {
                let value = arg_value
                    .downcast::<JsNumber, _>(&mut cx)
                    .unwrap()
                    .value(&mut cx);
                call_args.push(CallArg::U16(value as u16));
            }
            "u32" => {
                let value = arg_value
                    .downcast::<JsNumber, _>(&mut cx)
                    .unwrap()
                    .value(&mut cx);
                call_args.push(CallArg::U32(value as u32));
            }
            "u64" => {
                let value = arg_value
                    .downcast::<JsNumber, _>(&mut cx)
                    .unwrap()
                    .value(&mut cx);
                call_args.push(CallArg::U64(value as u64));
            }
            "i8" => {
                let value = arg_value
                    .downcast::<JsNumber, _>(&mut cx)
                    .unwrap()
                    .value(&mut cx);
                call_args.push(CallArg::I8(value as i8));
            }
            "i16" => {
                let value = arg_value
                    .downcast::<JsNumber, _>(&mut cx)
                    .unwrap()
                    .value(&mut cx);
                call_args.push(CallArg::I16(value as i16));
            }
            "i32" => {
                let value = arg_value
                    .downcast::<JsNumber, _>(&mut cx)
                    .unwrap()
                    .value(&mut cx);
                call_args.push(CallArg::I32(value as i32));
            }
            "i64" => {
                let value = arg_value
                    .downcast::<JsNumber, _>(&mut cx)
                    .unwrap()
                    .value(&mut cx);
                call_args.push(CallArg::I64(value as i64));
            }
            "f32" => {
                let value = arg_value
                    .downcast::<JsNumber, _>(&mut cx)
                    .unwrap()
                    .value(&mut cx);
                call_args.push(CallArg::F32(value as f32));
            }
            "f64" => {
                let value = arg_value
                    .downcast::<JsNumber, _>(&mut cx)
                    .unwrap()
                    .value(&mut cx);
                call_args.push(CallArg::F64(value as f64));
            }
            "string" => {
                let value = arg_value
                    .downcast::<JsString, _>(&mut cx)
                    .unwrap()
                    .value(&mut cx);
                call_args.push(CallArg::String(value));
            }
            "boolean" => {
                let value = arg_value
                    .downcast::<JsBoolean, _>(&mut cx)
                    .unwrap()
                    .value(&mut cx);
                call_args.push(CallArg::Boolean(value));
            }
            "gpointer" => {
                let value = arg_value
                    .downcast::<JsNumber, _>(&mut cx)
                    .unwrap()
                    .value(&mut cx);
                call_args.push(CallArg::Pointer(value as usize));
            }
            "string[]" => call_args.push(CallArg::StringArray(
                arg_value
                    .downcast::<JsArray, _>(&mut cx)
                    .unwrap()
                    .to_vec(&mut cx)
                    .unwrap()
                    .iter()
                    .map(|value| {
                        value
                            .downcast::<JsString, _>(&mut cx)
                            .unwrap()
                            .value(&mut cx)
                    })
                    .collect(),
            )),
            "u8[]" => call_args.push(CallArg::U8Array(
                arg_value
                    .downcast::<JsArray, _>(&mut cx)
                    .unwrap()
                    .to_vec(&mut cx)
                    .unwrap()
                    .iter()
                    .map(|value| {
                        value
                            .downcast::<JsNumber, _>(&mut cx)
                            .unwrap()
                            .value(&mut cx) as u8
                    })
                    .collect(),
            )),
            "u16[]" => call_args.push(CallArg::U16Array(
                arg_value
                    .downcast::<JsArray, _>(&mut cx)
                    .unwrap()
                    .to_vec(&mut cx)
                    .unwrap()
                    .iter()
                    .map(|value| {
                        value
                            .downcast::<JsNumber, _>(&mut cx)
                            .unwrap()
                            .value(&mut cx) as u16
                    })
                    .collect(),
            )),
            "u32[]" => call_args.push(CallArg::U32Array(
                arg_value
                    .downcast::<JsArray, _>(&mut cx)
                    .unwrap()
                    .to_vec(&mut cx)
                    .unwrap()
                    .iter()
                    .map(|value| {
                        value
                            .downcast::<JsNumber, _>(&mut cx)
                            .unwrap()
                            .value(&mut cx) as u32
                    })
                    .collect(),
            )),
            "u64[]" => call_args.push(CallArg::U64Array(
                arg_value
                    .downcast::<JsArray, _>(&mut cx)
                    .unwrap()
                    .to_vec(&mut cx)
                    .unwrap()
                    .iter()
                    .map(|value| {
                        value
                            .downcast::<JsNumber, _>(&mut cx)
                            .unwrap()
                            .value(&mut cx) as u64
                    })
                    .collect(),
            )),
            "i8[]" => call_args.push(CallArg::I8Array(
                arg_value
                    .downcast::<JsArray, _>(&mut cx)
                    .unwrap()
                    .to_vec(&mut cx)
                    .unwrap()
                    .iter()
                    .map(|value| {
                        value
                            .downcast::<JsNumber, _>(&mut cx)
                            .unwrap()
                            .value(&mut cx) as i8
                    })
                    .collect(),
            )),
            "i16[]" => call_args.push(CallArg::I16Array(
                arg_value
                    .downcast::<JsArray, _>(&mut cx)
                    .unwrap()
                    .to_vec(&mut cx)
                    .unwrap()
                    .iter()
                    .map(|value| {
                        value
                            .downcast::<JsNumber, _>(&mut cx)
                            .unwrap()
                            .value(&mut cx) as i16
                    })
                    .collect(),
            )),
            "i32[]" => call_args.push(CallArg::I32Array(
                arg_value
                    .downcast::<JsArray, _>(&mut cx)
                    .unwrap()
                    .to_vec(&mut cx)
                    .unwrap()
                    .iter()
                    .map(|value| {
                        value
                            .downcast::<JsNumber, _>(&mut cx)
                            .unwrap()
                            .value(&mut cx) as i32
                    })
                    .collect(),
            )),
            "i64[]" => call_args.push(CallArg::I64Array(
                arg_value
                    .downcast::<JsArray, _>(&mut cx)
                    .unwrap()
                    .to_vec(&mut cx)
                    .unwrap()
                    .iter()
                    .map(|value| {
                        value
                            .downcast::<JsNumber, _>(&mut cx)
                            .unwrap()
                            .value(&mut cx) as i64
                    })
                    .collect(),
            )),
            "f32[]" => call_args.push(CallArg::F32Array(
                arg_value
                    .downcast::<JsArray, _>(&mut cx)
                    .unwrap()
                    .to_vec(&mut cx)
                    .unwrap()
                    .iter()
                    .map(|value| {
                        value
                            .downcast::<JsNumber, _>(&mut cx)
                            .unwrap()
                            .value(&mut cx) as f32
                    })
                    .collect(),
            )),
            "f64[]" => call_args.push(CallArg::F64Array(
                arg_value
                    .downcast::<JsArray, _>(&mut cx)
                    .unwrap()
                    .to_vec(&mut cx)
                    .unwrap()
                    .iter()
                    .map(|value| {
                        value
                            .downcast::<JsNumber, _>(&mut cx)
                            .unwrap()
                            .value(&mut cx) as f64
                    })
                    .collect(),
            )),
            _ => unreachable!(),
        }
    }

    glib::idle_add_once(move || {
        let lib = GTK4_LIBRARY.get().unwrap();

        let result = unsafe {
            let symbol: libloading::Symbol<*const c_void> =
                lib.get(symbol_name.as_bytes()).unwrap();
            let func_ptr = *symbol as *mut c_void;

            let ffi_args: Vec<FfiArg> = call_args.iter().map(FfiArg::from_call_arg).collect();
            let arg_types: Vec<libffi::middle::Type> =
                ffi_args.iter().map(|a| a.get_type()).collect();
            let arg_values: Vec<libffi::middle::Arg> =
                ffi_args.iter().map(|a| a.as_arg()).collect();

            let ffi_return_type = match return_type.as_str() {
                "void" => libffi::middle::Type::void(),
                "u8" => libffi::middle::Type::u8(),
                "u16" => libffi::middle::Type::u16(),
                "u32" => libffi::middle::Type::u32(),
                "u64" => libffi::middle::Type::u64(),
                "i8" => libffi::middle::Type::i8(),
                "i16" => libffi::middle::Type::i16(),
                "i32" => libffi::middle::Type::i32(),
                "i64" => libffi::middle::Type::i64(),
                "f32" => libffi::middle::Type::f32(),
                "f64" => libffi::middle::Type::f64(),
                "string" => libffi::middle::Type::pointer(),
                "boolean" => libffi::middle::Type::u8(),
                "gpointer" | "gobject-borrowed" | "gobject" => libffi::middle::Type::pointer(),
                _ => unreachable!(),
            };

            let cif = libffi::middle::Cif::new(arg_types.into_iter(), ffi_return_type);

            match return_type.as_str() {
                "void" => {
                    cif.call::<()>(libffi::middle::CodePtr(func_ptr), &arg_values);
                    CallResult::Void
                }
                "u8" => {
                    let result = cif.call::<u8>(libffi::middle::CodePtr(func_ptr), &arg_values);
                    CallResult::Number(result as f64)
                }
                "u16" => {
                    let result = cif.call::<u16>(libffi::middle::CodePtr(func_ptr), &arg_values);
                    CallResult::Number(result as f64)
                }
                "u32" => {
                    let result = cif.call::<u32>(libffi::middle::CodePtr(func_ptr), &arg_values);
                    CallResult::Number(result as f64)
                }
                "u64" => {
                    let result = cif.call::<u64>(libffi::middle::CodePtr(func_ptr), &arg_values);
                    CallResult::Number(result as f64)
                }
                "i8" => {
                    let result = cif.call::<i8>(libffi::middle::CodePtr(func_ptr), &arg_values);
                    CallResult::Number(result as f64)
                }
                "i16" => {
                    let result = cif.call::<i16>(libffi::middle::CodePtr(func_ptr), &arg_values);
                    CallResult::Number(result as f64)
                }
                "i32" => {
                    let result = cif.call::<i32>(libffi::middle::CodePtr(func_ptr), &arg_values);
                    CallResult::Number(result as f64)
                }
                "i64" => {
                    let result = cif.call::<i64>(libffi::middle::CodePtr(func_ptr), &arg_values);
                    CallResult::Number(result as f64)
                }
                "f32" => {
                    let result = cif.call::<f32>(libffi::middle::CodePtr(func_ptr), &arg_values);
                    CallResult::Number(result as f64)
                }
                "f64" => {
                    let result = cif.call::<f64>(libffi::middle::CodePtr(func_ptr), &arg_values);
                    CallResult::Number(result)
                }
                "string" => {
                    let result =
                        cif.call::<*const i8>(libffi::middle::CodePtr(func_ptr), &arg_values);
                    if result.is_null() {
                        CallResult::String(String::new())
                    } else {
                        let c_str = std::ffi::CStr::from_ptr(result);
                        CallResult::String(c_str.to_string_lossy().to_string())
                    }
                }
                "boolean" => {
                    let result = cif.call::<u8>(libffi::middle::CodePtr(func_ptr), &arg_values);
                    CallResult::Boolean(result != 0)
                }
                "gpointer" | "gobject-borrowed" | "gobject" => {
                    let result =
                        cif.call::<*const c_void>(libffi::middle::CodePtr(func_ptr), &arg_values);
                    CallResult::GPointer(result as usize)
                }
                _ => unreachable!(),
            }
        };

        send.send(result).unwrap()
    });

    let result = recv.recv().unwrap();

    let res = match result {
        CallResult::Void => Ok(cx.undefined().upcast()),
        CallResult::Number(n) => Ok(cx.number(n).upcast()),
        CallResult::String(s) => Ok(cx.string(s).upcast()),
        CallResult::Boolean(b) => Ok(cx.boolean(b).upcast()),
        CallResult::GPointer(ptr) => match return_type_for_conversion.as_str() {
            "gobject-borrowed" => unsafe {
                let gobject = glib::Object::from_glib_none(ptr as *mut glib::gobject_ffi::GObject);
                Ok(cx.boxed(GObjectWrapper(gobject)).upcast())
            },
            "gobject" => unsafe {
                let gobject = glib::Object::from_glib_full(ptr as *mut glib::gobject_ffi::GObject);
                Ok(cx.boxed(GObjectWrapper(gobject)).upcast())
            },
            "gpointer" => {
                let boxed = cx.boxed(GPointer(ptr as *mut c_void));
                Ok(boxed.upcast())
            }
            _ => unreachable!(),
        },
    };

    res
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("start", start)?;
    cx.export_function("quit", quit)?;
    cx.export_function("call", call)?;
    Ok(())
}
