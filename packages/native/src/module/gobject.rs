//! `GObject` runtime helpers.
//!
//! Provides direct access to `GObject` class metadata so that JavaScript does
//! not need to traverse the `GTypeInstance` → `GTypeClass` → `GObjectClass`
//! chain through several individual FFI dispatches.

use std::ffi::{CString, c_char, c_void};
use std::sync::Arc;
use std::sync::atomic::AtomicPtr;

use gtk4::glib::{self, gobject_ffi};
use napi::bindgen_prelude::*;
use napi::{Env, JsFunction, JsObject, NapiValue as _};
use napi_derive::napi;

use super::handler::{ModuleRequest, dispatch_request};
use crate::dispatch::Mailbox;
use crate::error_reporter::NativeErrorReporter;
use crate::managed::NativeHandle;
use crate::trampoline::{TrampolineData, TrampolineState};
use crate::types::Type;
use crate::value::{self, JsCallbackRef};

struct FindObjectPropertyRequest {
    instance_addr: usize,
    property_name: CString,
}

impl ModuleRequest for FindObjectPropertyRequest {
    type Output = Option<NativeHandle>;

    fn execute(self) -> anyhow::Result<Option<NativeHandle>> {
        if self.instance_addr == 0 {
            anyhow::bail!("instance handle has a null pointer");
        }

        let instance = self.instance_addr as *mut gobject_ffi::GTypeInstance;
        let object_class = unsafe { (*instance).g_class.cast::<gobject_ffi::GObjectClass>() };
        if object_class.is_null() {
            anyhow::bail!("instance has no resolved class");
        }

        let pspec = unsafe {
            gobject_ffi::g_object_class_find_property(object_class, self.property_name.as_ptr())
        };

        if pspec.is_null() {
            return Ok(None);
        }

        Ok(Some(NativeHandle::borrowed(pspec.cast::<c_void>())))
    }

    fn error_context() -> &'static str {
        "find_object_property"
    }
}

#[napi]
pub fn find_object_property<'env>(
    env: &'env Env,
    handle: &External<NativeHandle>,
    property_name: String,
) -> napi::Result<Unknown<'env>> {
    let property_name = CString::new(property_name)
        .map_err(|err| napi::Error::new(napi::Status::InvalidArg, err.to_string()))?;
    dispatch_request(
        env,
        FindObjectPropertyRequest {
            instance_addr: handle.ptr_as_usize(),
            property_name,
        },
    )
}

struct GetInstanceGtypeRequest {
    instance_addr: usize,
}

impl ModuleRequest for GetInstanceGtypeRequest {
    type Output = u64;

    fn execute(self) -> anyhow::Result<u64> {
        if self.instance_addr == 0 {
            return Ok(0);
        }
        let instance = self.instance_addr as *mut gobject_ffi::GTypeInstance;
        let g_class = unsafe { (*instance).g_class };
        if g_class.is_null() {
            return Ok(0);
        }
        let gtype = unsafe { (*g_class).g_type };
        Ok(gtype as u64)
    }

    fn error_context() -> &'static str {
        "get_instance_gtype"
    }
}

#[napi]
pub fn get_instance_gtype<'env>(
    env: &'env Env,
    handle: &External<NativeHandle>,
) -> napi::Result<Unknown<'env>> {
    dispatch_request(
        env,
        GetInstanceGtypeRequest {
            instance_addr: handle.ptr_as_usize(),
        },
    )
}

/// JS-thread parse output for a signal default handler.
///
/// Carries only `Send` data so the enclosing [`RawClassData`] can cross the
/// `JS → GLib` thread boundary without a manual `Send` assertion. The
/// `glib::Closure` is constructed from these fields on the `GLib` thread inside
/// [`RawSignal::into_built`].
struct RawDefaultHandler {
    js_func: Arc<JsCallbackRef>,
    arg_types: Vec<Type>,
    return_type: Type,
}

/// JS-thread parse output for a signal definition.
struct RawSignal {
    name: CString,
    flags: gobject_ffi::GSignalFlags,
    return_gtype: usize,
    param_gtypes: Vec<usize>,
    default_handler: Option<RawDefaultHandler>,
}

/// JS-thread parse output for a vfunc.
///
/// The libffi closure is built on the `GLib` thread inside
/// [`RawVfunc::into_built`], where the trampoline will eventually fire.
struct RawVfunc {
    byte_offset: usize,
    js_func: Arc<JsCallbackRef>,
    arg_types: Vec<Type>,
    return_type: Type,
}

/// JS-thread parse output for an interface implementation.
struct RawInterface {
    gtype: usize,
    vfuncs: Vec<RawVfunc>,
}

/// JS-thread parse output for a class registration payload.
///
/// Constructed on the JS thread by [`parse_class_data`] and converted into a
/// [`ClassData`] on the `GLib` thread inside [`RawClassData::into_built`].
struct RawClassData {
    properties: Vec<PreparedProperty>,
    signals: Vec<RawSignal>,
    vfuncs: Vec<RawVfunc>,
}

impl RawClassData {
    fn into_built(self) -> ClassData {
        let Self {
            properties,
            signals,
            vfuncs,
        } = self;
        ClassData {
            properties,
            signals: signals.into_iter().map(RawSignal::into_built).collect(),
            vfuncs: vfuncs.into_iter().map(RawVfunc::into_built).collect(),
        }
    }
}

impl RawSignal {
    fn into_built(self) -> PreparedSignal {
        let Self {
            name,
            flags,
            return_gtype,
            param_gtypes,
            default_handler,
        } = self;
        let default_handler = default_handler
            .map(|h| build_signal_default_closure(h.js_func, h.arg_types, h.return_type));
        PreparedSignal {
            name,
            flags,
            return_gtype,
            param_gtypes,
            default_handler,
        }
    }
}

impl RawVfunc {
    fn into_built(self) -> PreparedVfunc {
        let Self {
            byte_offset,
            js_func,
            arg_types,
            return_type,
        } = self;
        let data = TrampolineData {
            js_func,
            arg_types,
            return_type,
            user_data_index: None,
            is_oneshot: false,
            oneshot_state_ptr: AtomicPtr::new(std::ptr::null_mut()),
        };
        let state = Box::new(TrampolineState::create(data));
        let code_ptr = state.code_ptr;
        PreparedVfunc {
            byte_offset,
            code_ptr,
            state,
        }
    }
}

impl RawInterface {
    fn into_built(self) -> PreparedInterface {
        PreparedInterface {
            gtype: self.gtype,
            vfuncs: self.vfuncs.into_iter().map(RawVfunc::into_built).collect(),
        }
    }
}

/// Borrowed `GParamSpec` pointer to install on the new class.
///
/// `g_object_class_install_property` takes a reference; the caller's
/// `NativeHandle` retains ownership.
struct PreparedProperty {
    pspec_addr: usize,
}

/// Built signal definition with optional default class closure.
struct PreparedSignal {
    name: CString,
    flags: gobject_ffi::GSignalFlags,
    return_gtype: usize,
    param_gtypes: Vec<usize>,
    default_handler: Option<glib::Closure>,
}

/// Built vfunc trampoline waiting to be written into the class struct.
///
/// `code_ptr` is the libffi-generated C function pointer; `state` retains the
/// `TrampolineData` and libffi closure for the lifetime of the type registration.
struct PreparedVfunc {
    byte_offset: usize,
    code_ptr: *mut c_void,
    state: Box<TrampolineState>,
}

/// Built interface implementation. Each entry produces a single
/// `g_type_add_interface_static` call after the new class type has been
/// registered. The vfunc pointers are written into the iface struct by
/// `interface_init_trampoline` when `GLib` invokes it during interface
/// attachment.
struct PreparedInterface {
    gtype: usize,
    vfuncs: Vec<PreparedVfunc>,
}

/// Class-registration payload threaded into `GTypeInfo.class_data`.
///
/// Built on the `GLib` thread, leaked into `GTypeInfo.class_data` immediately
/// before `g_type_register_static`, and consumed by `class_init_trampoline`
/// which reclaims it via `Box::from_raw` and forgets the contained vfunc
/// states so they live for the process lifetime alongside the new `GType`.
struct ClassData {
    properties: Vec<PreparedProperty>,
    signals: Vec<PreparedSignal>,
    vfuncs: Vec<PreparedVfunc>,
}

unsafe extern "C" fn interface_init_trampoline(g_iface: *mut c_void, iface_data: *mut c_void) {
    if iface_data.is_null() {
        return;
    }
    let prepared = unsafe { Box::from_raw(iface_data.cast::<PreparedInterface>()) };
    for vfunc in prepared.vfuncs {
        unsafe {
            let slot = (g_iface.cast::<u8>())
                .add(vfunc.byte_offset)
                .cast::<*mut c_void>();
            slot.write(vfunc.code_ptr);
        }
        std::mem::forget(vfunc.state);
    }
}

unsafe extern "C" fn class_init_trampoline(g_class: *mut c_void, class_data: *mut c_void) {
    if class_data.is_null() {
        return;
    }
    let data = unsafe { Box::from_raw(class_data.cast::<ClassData>()) };
    let object_class = g_class.cast::<gobject_ffi::GObjectClass>();
    let new_gtype = unsafe { (*g_class.cast::<gobject_ffi::GTypeClass>()).g_type };

    for vfunc in data.vfuncs {
        unsafe {
            let slot = (g_class.cast::<u8>())
                .add(vfunc.byte_offset)
                .cast::<*mut c_void>();
            slot.write(vfunc.code_ptr);
        }
        std::mem::forget(vfunc.state);
    }

    for (index, property) in data.properties.iter().enumerate() {
        if property.pspec_addr == 0 {
            NativeErrorReporter::global().report_str(&format!(
                "register_class: skipping null pspec at property index {index}"
            ));
            continue;
        }
        let property_id = (index + 1) as u32;
        unsafe {
            gobject_ffi::g_object_class_install_property(
                object_class,
                property_id,
                property.pspec_addr as *mut gobject_ffi::GParamSpec,
            );
        }
    }

    for signal in data.signals {
        let class_closure_ptr: *mut gobject_ffi::GClosure = signal.default_handler.as_ref().map_or(
            std::ptr::null_mut(),
            gtk4::glib::translate::ToGlibPtr::to_glib_full,
        );
        let mut param_gtypes = signal.param_gtypes;
        let signal_id = unsafe {
            gobject_ffi::g_signal_newv(
                signal.name.as_ptr(),
                new_gtype,
                signal.flags,
                class_closure_ptr,
                None,
                std::ptr::null_mut(),
                None,
                signal.return_gtype,
                param_gtypes.len() as u32,
                if param_gtypes.is_empty() {
                    std::ptr::null_mut()
                } else {
                    param_gtypes.as_mut_ptr()
                },
            )
        };
        match (signal_id, signal.default_handler) {
            (0, Some(_)) if !class_closure_ptr.is_null() => unsafe {
                gobject_ffi::g_closure_unref(class_closure_ptr);
            },
            (_, Some(closure)) => std::mem::forget(closure),
            _ => {}
        }
        if signal_id == 0 {
            NativeErrorReporter::global().report_str(&format!(
                "register_class: g_signal_newv returned 0 for signal '{}'",
                signal.name.to_string_lossy()
            ));
        }
    }
}

struct RegisterClassRequest {
    name: CString,
    parent_gtype: usize,
    class_data: RawClassData,
    interfaces: Vec<RawInterface>,
}

impl RegisterClassRequest {
    fn query_parent_gtype(&self) -> anyhow::Result<gobject_ffi::GTypeQuery> {
        if self.parent_gtype == 0 {
            anyhow::bail!("parent gtype is invalid (G_TYPE_INVALID)");
        }

        let existing = unsafe { gobject_ffi::g_type_from_name(self.name.as_ptr()) };
        if existing != 0 {
            anyhow::bail!(
                "GType name '{}' is already registered",
                self.name.to_string_lossy()
            );
        }

        let mut query: gobject_ffi::GTypeQuery = unsafe { std::mem::zeroed() };
        unsafe { gobject_ffi::g_type_query(self.parent_gtype, &mut query) };
        if query.type_ == 0 {
            anyhow::bail!("parent gtype could not be queried");
        }
        Ok(query)
    }

    fn validate_vfunc_offset(
        byte_offset: usize,
        pointer_align: usize,
        pointer_size: usize,
        class_size: Option<u32>,
        label: &str,
    ) -> anyhow::Result<()> {
        if !byte_offset.is_multiple_of(pointer_align) {
            anyhow::bail!(
                "{label} byte_offset {byte_offset} is not aligned to a pointer ({pointer_align})"
            );
        }
        let end = byte_offset
            .checked_add(pointer_size)
            .ok_or_else(|| anyhow::anyhow!("{label} byte_offset overflow"))?;
        if let Some(class_size) = class_size
            && end > class_size as usize
        {
            anyhow::bail!("{label} byte_offset {byte_offset} exceeds class size {class_size}");
        }
        Ok(())
    }

    fn validate_layout(&self, query: &gobject_ffi::GTypeQuery) -> anyhow::Result<()> {
        let pointer_align = std::mem::align_of::<*mut c_void>();
        let pointer_size = std::mem::size_of::<*mut c_void>();

        for vfunc in &self.class_data.vfuncs {
            Self::validate_vfunc_offset(
                vfunc.byte_offset,
                pointer_align,
                pointer_size,
                Some(query.class_size),
                "vfunc",
            )?;
        }

        for iface in &self.interfaces {
            if iface.gtype == 0 {
                anyhow::bail!("interface gtype is invalid (G_TYPE_INVALID)");
            }
            for vfunc in &iface.vfuncs {
                Self::validate_vfunc_offset(
                    vfunc.byte_offset,
                    pointer_align,
                    pointer_size,
                    None,
                    "interface vfunc",
                )?;
            }
        }
        Ok(())
    }
}

fn register_class_with_interfaces(
    parent_gtype: usize,
    name_ptr: *const c_char,
    class_data_ptr: *mut c_void,
    interfaces: Vec<PreparedInterface>,
    class_size: u16,
    instance_size: u16,
) -> anyhow::Result<usize> {
    let info = gobject_ffi::GTypeInfo {
        class_size,
        base_init: None,
        base_finalize: None,
        class_init: Some(class_init_trampoline),
        class_finalize: None,
        class_data: class_data_ptr,
        instance_size,
        n_preallocs: 0,
        instance_init: None,
        value_table: std::ptr::null(),
    };

    let new_gtype =
        unsafe { gobject_ffi::g_type_register_static(parent_gtype, name_ptr, &info, 0) };

    if new_gtype == 0 {
        drop(unsafe { Box::from_raw(class_data_ptr.cast::<ClassData>()) });
        anyhow::bail!("g_type_register_static returned G_TYPE_INVALID");
    }

    for iface in interfaces {
        let iface_gtype = iface.gtype;
        let prepared_ptr = Box::into_raw(Box::new(iface));
        let info = gobject_ffi::GInterfaceInfo {
            interface_init: Some(interface_init_trampoline),
            interface_finalize: None,
            interface_data: prepared_ptr.cast::<c_void>(),
        };
        unsafe {
            gobject_ffi::g_type_add_interface_static(new_gtype, iface_gtype, &info);
        }
    }

    unsafe { gobject_ffi::g_type_class_ref(new_gtype) };

    Ok(new_gtype)
}

impl ModuleRequest for RegisterClassRequest {
    type Output = u64;

    fn execute(self) -> anyhow::Result<u64> {
        let query = self.query_parent_gtype()?;
        self.validate_layout(&query)?;

        let class_size = query.class_size as u16;
        let instance_size = query.instance_size as u16;
        let class_data = self.class_data.into_built();
        let interfaces: Vec<PreparedInterface> = self
            .interfaces
            .into_iter()
            .map(RawInterface::into_built)
            .collect();
        let class_data_ptr = Box::into_raw(Box::new(class_data)).cast::<c_void>();

        let new_gtype = register_class_with_interfaces(
            self.parent_gtype,
            self.name.as_ptr(),
            class_data_ptr,
            interfaces,
            class_size,
            instance_size,
        )?;

        Ok(new_gtype as u64)
    }

    fn error_context() -> &'static str {
        "register_class"
    }
}

fn parse_property(env: &Env, item: Unknown<'_>) -> napi::Result<PreparedProperty> {
    let obj = unsafe { JsObject::from_napi_value(env.raw(), item.raw())? };
    let pspec_ext: &External<NativeHandle> = obj.get_named_property("pspec")?;
    let pspec_addr = pspec_ext.ptr() as usize;
    if pspec_addr == 0 {
        return Err(napi::Error::new(
            napi::Status::InvalidArg,
            "register_class: property pspec handle is null",
        ));
    }
    Ok(PreparedProperty { pspec_addr })
}

fn parse_js_array<T>(
    env: &Env,
    prop: Unknown<'_>,
    description: &str,
    mut convert: impl FnMut(&Env, Unknown<'_>) -> napi::Result<T>,
) -> napi::Result<Vec<T>> {
    if !prop.is_array()? {
        return Err(napi::Error::new(
            napi::Status::InvalidArg,
            format!("register_class: expected an array of {description}"),
        ));
    }
    let arr: Array = unsafe { Array::from_napi_value(env.raw(), prop.raw())? };
    let len = arr.len();
    let mut out = Vec::with_capacity(len as usize);
    for i in 0..len {
        let item: Unknown<'_> = arr.get(i)?.ok_or_else(|| {
            napi::Error::new(
                napi::Status::GenericFailure,
                format!("register_class: missing {description} at index {i}"),
            )
        })?;
        out.push(convert(env, item)?);
    }
    Ok(out)
}

#[allow(clippy::trivially_copy_pass_by_ref)]
fn parse_type_array(env: &Env, prop: Unknown<'_>) -> napi::Result<Vec<Type>> {
    parse_js_array(env, prop, "types", Type::from_js_value)
}

#[allow(clippy::trivially_copy_pass_by_ref)]
fn parse_gtype_array(env: &Env, prop: Unknown<'_>) -> napi::Result<Vec<usize>> {
    parse_js_array(env, prop, "GTypes", |env, item| {
        let big = unsafe { BigInt::from_napi_value(env.raw(), item.raw())? };
        let (_, value, _) = big.get_u64();
        Ok(value as usize)
    })
}

fn build_signal_default_closure(
    js_func: Arc<JsCallbackRef>,
    arg_types: Vec<Type>,
    return_type: Type,
) -> glib::Closure {
    glib::Closure::new(move |args: &[glib::Value]| {
        if args.len() != arg_types.len() {
            NativeErrorReporter::global().report_str(&format!(
                "signal default handler: argument count mismatch (got {}, expected {})",
                args.len(),
                arg_types.len(),
            ));
            return value::Value::Undefined.into_glib_value_with_default(Some(&return_type));
        }
        let values = match value::Value::from_glib_values(args, &arg_types) {
            Ok(v) => v,
            Err(e) => {
                NativeErrorReporter::global().report(
                    &e.context("register_class signal default handler: argument conversion"),
                );
                return None;
            }
        };
        let capture = !matches!(return_type, Type::Void(_));
        let result = Mailbox::global().invoke_node_and_wait(&js_func, values, capture);
        match result {
            Ok(v) => v.into_glib_value_with_default(Some(&return_type)),
            Err(e) => {
                NativeErrorReporter::global()
                    .report(&anyhow::anyhow!("signal default handler: {e:#}"));
                value::Value::Undefined.into_glib_value_with_default(Some(&return_type))
            }
        }
    })
}

fn parse_signal(env: &Env, item: Unknown<'_>) -> napi::Result<RawSignal> {
    let obj = unsafe { JsObject::from_napi_value(env.raw(), item.raw())? };
    let raw_name: String = obj.get_named_property("name")?;
    let name = CString::new(raw_name)
        .map_err(|err| napi::Error::new(napi::Status::InvalidArg, err.to_string()))?;
    let (_, flags, _) = obj.get_named_property::<BigInt>("flags")?.get_u64();
    let (_, return_gtype, _) = obj.get_named_property::<BigInt>("returnGtype")?.get_u64();
    let param_types_prop: Unknown<'_> = obj.get_named_property("paramGtypes")?;
    let param_gtypes = parse_gtype_array(env, param_types_prop)?;
    let default_handler = parse_signal_default_handler(env, &obj)?;

    Ok(RawSignal {
        name,
        flags: flags as gobject_ffi::GSignalFlags,
        return_gtype: return_gtype as usize,
        param_gtypes,
        default_handler,
    })
}

fn parse_signal_default_handler(
    env: &Env,
    obj: &JsObject,
) -> napi::Result<Option<RawDefaultHandler>> {
    if !obj.has_named_property("defaultHandler")? {
        return Ok(None);
    }
    let handler_prop: Unknown<'_> = obj.get_named_property("defaultHandler")?;
    if matches!(
        handler_prop.get_type()?,
        napi::ValueType::Undefined | napi::ValueType::Null
    ) {
        return Ok(None);
    }
    let handler: JsFunction =
        unsafe { JsFunction::from_raw_unchecked(env.raw(), handler_prop.raw()) };
    let arg_types = parse_type_array(env, obj.get_named_property("defaultHandlerArgTypes")?)?;
    let return_type =
        Type::from_js_value(env, obj.get_named_property("defaultHandlerReturnType")?)?;
    let js_func = Arc::new(JsCallbackRef::from_js_function(env, &handler)?);
    Ok(Some(RawDefaultHandler {
        js_func,
        arg_types,
        return_type,
    }))
}

fn parse_vfunc(env: &Env, item: Unknown<'_>) -> napi::Result<RawVfunc> {
    let obj = unsafe { JsObject::from_napi_value(env.raw(), item.raw())? };
    let byte_offset: f64 = obj.get_named_property("byteOffset")?;
    if byte_offset < 0.0 {
        return Err(napi::Error::new(
            napi::Status::InvalidArg,
            "register_class: vfunc byteOffset must be non-negative",
        ));
    }
    let arg_types_prop: Unknown<'_> = obj.get_named_property("argTypes")?;
    let return_type_prop: Unknown<'_> = obj.get_named_property("returnType")?;
    let handler_prop: Unknown<'_> = obj.get_named_property("fn")?;
    if !matches!(handler_prop.get_type()?, napi::ValueType::Function) {
        return Err(napi::Error::new(
            napi::Status::InvalidArg,
            "register_class: vfunc 'fn' must be a function",
        ));
    }
    let handler: JsFunction =
        unsafe { JsFunction::from_raw_unchecked(env.raw(), handler_prop.raw()) };

    let arg_types = parse_type_array(env, arg_types_prop)?;
    let return_type = Type::from_js_value(env, return_type_prop)?;
    let js_func = Arc::new(JsCallbackRef::from_js_function(env, &handler)?);

    Ok(RawVfunc {
        byte_offset: byte_offset as usize,
        js_func,
        arg_types,
        return_type,
    })
}

fn parse_interface(env: &Env, item: Unknown<'_>) -> napi::Result<RawInterface> {
    let obj = unsafe { JsObject::from_napi_value(env.raw(), item.raw())? };
    let (_, gtype, _) = obj.get_named_property::<BigInt>("gtype")?.get_u64();
    if gtype == 0 {
        return Err(napi::Error::new(
            napi::Status::InvalidArg,
            "register_class: interface gtype must be non-zero",
        ));
    }
    let vfuncs_prop: Unknown<'_> = obj.get_named_property("vfuncs")?;
    let vfuncs = parse_js_array(env, vfuncs_prop, "interface vfuncs", parse_vfunc)?;
    Ok(RawInterface {
        gtype: gtype as usize,
        vfuncs,
    })
}

fn parse_array_property<T>(
    env: &Env,
    options: &JsObject,
    name: &str,
    parser: impl Fn(&Env, Unknown<'_>) -> napi::Result<T>,
) -> napi::Result<Vec<T>> {
    if !options.has_named_property(name)? {
        return Ok(Vec::new());
    }
    let prop: Unknown<'_> = options.get_named_property(name)?;
    if matches!(
        prop.get_type()?,
        napi::ValueType::Undefined | napi::ValueType::Null
    ) {
        return Ok(Vec::new());
    }
    if !prop.is_array()? {
        return Err(napi::Error::new(
            napi::Status::InvalidArg,
            format!("register_class: '{name}' must be an array"),
        ));
    }
    let arr: Array = unsafe { Array::from_napi_value(env.raw(), prop.raw())? };
    let len = arr.len();
    let mut out = Vec::with_capacity(len as usize);
    for i in 0..len {
        let item: Unknown<'_> = arr.get(i)?.ok_or_else(|| {
            napi::Error::new(
                napi::Status::GenericFailure,
                format!("register_class: missing '{name}' entry at index {i}"),
            )
        })?;
        out.push(parser(env, item)?);
    }
    Ok(out)
}

#[allow(clippy::trivially_copy_pass_by_ref)]
fn parse_class_data(
    env: &Env,
    options: Option<JsObject>,
) -> napi::Result<(RawClassData, Vec<RawInterface>)> {
    let Some(options) = options else {
        return Ok((
            RawClassData {
                properties: Vec::new(),
                signals: Vec::new(),
                vfuncs: Vec::new(),
            },
            Vec::new(),
        ));
    };

    let properties = parse_array_property(env, &options, "properties", parse_property)?;
    let signals = parse_array_property(env, &options, "signals", parse_signal)?;
    let vfuncs = parse_array_property(env, &options, "vfuncs", parse_vfunc)?;
    let interfaces = parse_array_property(env, &options, "interfaces", parse_interface)?;

    Ok((
        RawClassData {
            properties,
            signals,
            vfuncs,
        },
        interfaces,
    ))
}

#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn register_class(
    env: &Env,
    name: String,
    parent_gtype: BigInt,
    options: Option<JsObject>,
) -> napi::Result<Unknown<'_>> {
    let name = CString::new(name)
        .map_err(|err| napi::Error::new(napi::Status::InvalidArg, err.to_string()))?;
    let (_, parent_gtype_value, _) = parent_gtype.get_u64();
    let (class_data, interfaces) = parse_class_data(env, options)?;
    dispatch_request(
        env,
        RegisterClassRequest {
            name,
            parent_gtype: parent_gtype_value as usize,
            class_data,
            interfaces,
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    const POINTER_ALIGN: usize = 8;
    const POINTER_SIZE: usize = 8;

    #[test]
    fn validate_vfunc_offset_accepts_aligned_offset_within_class() {
        let result = RegisterClassRequest::validate_vfunc_offset(
            16,
            POINTER_ALIGN,
            POINTER_SIZE,
            Some(64),
            "vfunc",
        );
        assert!(result.is_ok());
    }

    #[test]
    fn validate_vfunc_offset_accepts_offset_when_class_size_unknown() {
        let result = RegisterClassRequest::validate_vfunc_offset(
            64,
            POINTER_ALIGN,
            POINTER_SIZE,
            None,
            "interface vfunc",
        );
        assert!(result.is_ok());
    }

    #[test]
    fn validate_vfunc_offset_rejects_misaligned_offset() {
        let result = RegisterClassRequest::validate_vfunc_offset(
            7,
            POINTER_ALIGN,
            POINTER_SIZE,
            Some(64),
            "vfunc",
        );
        let err = result.expect_err("misaligned offset should fail validation");
        let message = err.to_string();
        assert!(message.contains("vfunc"));
        assert!(message.contains("not aligned"));
    }

    #[test]
    fn validate_vfunc_offset_rejects_offset_overflowing_class_size() {
        let result = RegisterClassRequest::validate_vfunc_offset(
            64,
            POINTER_ALIGN,
            POINTER_SIZE,
            Some(64),
            "vfunc",
        );
        let err = result.expect_err("offset past class size should fail validation");
        assert!(err.to_string().contains("exceeds class size"));
    }

    #[test]
    fn validate_vfunc_offset_rejects_arithmetic_overflow() {
        let aligned_max = usize::MAX & !(POINTER_ALIGN - 1);
        let result = RegisterClassRequest::validate_vfunc_offset(
            aligned_max,
            POINTER_ALIGN,
            POINTER_SIZE,
            None,
            "interface vfunc",
        );
        let err = result.expect_err("usize overflow should fail validation");
        assert!(err.to_string().contains("overflow"));
    }
}
