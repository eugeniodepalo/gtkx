//! Dynamic `GType` registration.
//!
//! Registers new `GObject` subclasses at runtime from a JavaScript class
//! descriptor: parses vfunc and inherited-interface overrides, builds a libffi
//! trampoline for each handler, and writes the resulting function pointers into
//! the new class's vtable (via [`class_init_trampoline`]) and its copies of any
//! inherited interface vtables (via [`install_interface_vfuncs`]).

use std::ffi::{CString, c_char, c_void};
use std::sync::Arc;
use std::sync::atomic::AtomicPtr;

use gtk4::glib::gobject_ffi;
use napi::bindgen_prelude::*;
use napi::{Env, JsFunction, JsObject, NapiValue as _};
use napi_derive::napi;

use super::handler::{ModuleRequest, dispatch_request};
use crate::error_reporter::NativeErrorReporter;
use crate::trampoline::{TrampolineData, TrampolineState};
use crate::types::Type;
use crate::value::{JsRef, map_js_array};

/// JS-thread parse output for a vfunc override.
///
/// The libffi closure is built on the `GLib` thread inside
/// [`RawVfunc::into_built`], where the trampoline will eventually fire.
#[cfg_attr(test, allow(dead_code))]
struct RawVfunc {
    byte_offset: usize,
    js_func: Arc<JsRef<JsFunction>>,
    arg_types: Vec<Type>,
    return_type: Type,
}

/// JS-thread parse output for the vfunc overrides of one interface that the
/// new class inherits from its parent.
#[cfg_attr(test, allow(dead_code))]
struct RawInterface {
    gtype: usize,
    vfuncs: Vec<RawVfunc>,
}

impl RawVfunc {
    #[cfg_attr(test, allow(dead_code))]
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
    #[cfg_attr(test, allow(dead_code))]
    fn into_built(self) -> PreparedInterface {
        PreparedInterface {
            gtype: self.gtype,
            vfuncs: self.vfuncs.into_iter().map(RawVfunc::into_built).collect(),
        }
    }
}

/// Built vfunc trampoline waiting to be written into a vtable.
///
/// `code_ptr` is the libffi-generated C function pointer; `state` retains the
/// `TrampolineData` and libffi closure for the lifetime of the type registration.
#[cfg_attr(test, allow(dead_code))]
struct PreparedVfunc {
    byte_offset: usize,
    code_ptr: *mut c_void,
    state: Box<TrampolineState>,
}

/// Built interface vfunc overrides for one inherited interface.
///
/// `gtype` identifies the interface; each vfunc's `byte_offset` is relative to
/// the interface struct base. The overrides are written into the new class's
/// own copy of the inherited interface vtable by [`install_interface_vfuncs`].
#[cfg_attr(test, allow(dead_code))]
struct PreparedInterface {
    gtype: usize,
    vfuncs: Vec<PreparedVfunc>,
}

/// Writes each prepared vfunc's trampoline pointer into the vtable rooted at
/// `vtable_base`, then leaks the trampoline state so its libffi closure
/// outlives the type registration.
#[cfg_attr(test, allow(dead_code))]
fn install_vfuncs(vtable_base: *mut c_void, vfuncs: Vec<PreparedVfunc>) {
    for vfunc in vfuncs {
        unsafe {
            let slot = vtable_base
                .cast::<u8>()
                .add(vfunc.byte_offset)
                .cast::<*mut c_void>();
            slot.write(vfunc.code_ptr);
        }
        std::mem::forget(vfunc.state);
    }
}

#[cfg_attr(test, allow(dead_code))]
unsafe extern "C" fn class_init_trampoline(g_class: *mut c_void, class_data: *mut c_void) {
    if class_data.is_null() {
        return;
    }
    let vfuncs = unsafe { Box::from_raw(class_data.cast::<Vec<PreparedVfunc>>()) };
    install_vfuncs(g_class, *vfuncs);
}

/// Writes interface vfunc overrides into the new class's copy of an inherited
/// interface vtable.
///
/// `g_type_class_ref` has already initialized the class, so `GLib` has
/// allocated a per-type copy of every inherited interface vtable. Writing into
/// that copy overrides the interface methods for the new type only, leaving the
/// parent's vtable untouched.
#[cfg_attr(test, allow(dead_code))]
fn install_interface_vfuncs(class_ptr: *mut c_void, iface: PreparedInterface) {
    let iface_vtable = unsafe { gobject_ffi::g_type_interface_peek(class_ptr, iface.gtype) };
    if iface_vtable.is_null() {
        NativeErrorReporter::global().report_str(&format!(
            "register_class: registered type does not conform to interface {:#x}",
            iface.gtype
        ));
        return;
    }
    install_vfuncs(iface_vtable, iface.vfuncs);
}

#[cfg_attr(test, allow(dead_code))]
struct RegisterClassRequest {
    name: CString,
    parent_gtype: usize,
    vfuncs: Vec<RawVfunc>,
    interfaces: Vec<RawInterface>,
}

impl RegisterClassRequest {
    #[cfg_attr(test, allow(dead_code))]
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

    #[cfg_attr(test, allow(dead_code))]
    fn validate_layout(&self, query: &gobject_ffi::GTypeQuery) -> anyhow::Result<()> {
        let pointer_align = std::mem::align_of::<*mut c_void>();
        let pointer_size = std::mem::size_of::<*mut c_void>();

        for vfunc in &self.vfuncs {
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

#[cfg_attr(test, allow(dead_code))]
fn register_class_type(
    parent_gtype: usize,
    name_ptr: *const c_char,
    class_vfuncs_ptr: *mut c_void,
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
        class_data: class_vfuncs_ptr,
        instance_size,
        n_preallocs: 0,
        instance_init: None,
        value_table: std::ptr::null(),
    };

    let new_gtype =
        unsafe { gobject_ffi::g_type_register_static(parent_gtype, name_ptr, &info, 0) };

    if new_gtype == 0 {
        drop(unsafe { Box::from_raw(class_vfuncs_ptr.cast::<Vec<PreparedVfunc>>()) });
        anyhow::bail!("g_type_register_static returned G_TYPE_INVALID");
    }

    let class_ptr = unsafe { gobject_ffi::g_type_class_ref(new_gtype) };

    for iface in interfaces {
        install_interface_vfuncs(class_ptr, iface);
    }

    Ok(new_gtype)
}

impl ModuleRequest for RegisterClassRequest {
    type Output = u64;

    fn execute(self) -> anyhow::Result<u64> {
        let query = self.query_parent_gtype()?;
        self.validate_layout(&query)?;

        let class_size = query.class_size as u16;
        let instance_size = query.instance_size as u16;
        let class_vfuncs: Vec<PreparedVfunc> =
            self.vfuncs.into_iter().map(RawVfunc::into_built).collect();
        let interfaces: Vec<PreparedInterface> = self
            .interfaces
            .into_iter()
            .map(RawInterface::into_built)
            .collect();
        let class_vfuncs_ptr = Box::into_raw(Box::new(class_vfuncs)).cast::<c_void>();

        let new_gtype = register_class_type(
            self.parent_gtype,
            self.name.as_ptr(),
            class_vfuncs_ptr,
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

#[allow(clippy::trivially_copy_pass_by_ref)]
#[cfg_attr(test, allow(dead_code))]
fn parse_js_array<T>(
    env: &Env,
    prop: Unknown<'_>,
    description: &str,
    convert: impl FnMut(&Env, Unknown<'_>) -> napi::Result<T>,
) -> napi::Result<Vec<T>> {
    if !prop.is_array()? {
        return Err(napi::Error::new(
            napi::Status::InvalidArg,
            format!("register_class: expected an array of {description}"),
        ));
    }
    let arr: Array = unsafe { Array::from_napi_value(env.raw(), prop.raw())? };
    map_js_array(env, &arr, convert)
}

#[allow(clippy::trivially_copy_pass_by_ref)]
#[cfg_attr(test, allow(dead_code))]
fn parse_type_array(env: &Env, prop: Unknown<'_>) -> napi::Result<Vec<Type>> {
    parse_js_array(env, prop, "types", Type::from_js_value)
}

#[cfg_attr(test, allow(dead_code))]
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
    let js_func = Arc::new(JsRef::from_js_value(env, &handler)?);

    Ok(RawVfunc {
        byte_offset: byte_offset as usize,
        js_func,
        arg_types,
        return_type,
    })
}

#[cfg_attr(test, allow(dead_code))]
fn parse_interface(env: &Env, item: Unknown<'_>) -> napi::Result<RawInterface> {
    let obj = unsafe { JsObject::from_napi_value(env.raw(), item.raw())? };
    let gtype = obj.get_named_property::<f64>("gtype")? as usize;
    if gtype == 0 {
        return Err(napi::Error::new(
            napi::Status::InvalidArg,
            "register_class: interface gtype must be non-zero",
        ));
    }
    let vfuncs_prop: Unknown<'_> = obj.get_named_property("vfuncs")?;
    let vfuncs = parse_js_array(env, vfuncs_prop, "interface vfuncs", parse_vfunc)?;
    Ok(RawInterface { gtype, vfuncs })
}

#[allow(clippy::trivially_copy_pass_by_ref)]
#[cfg_attr(test, allow(dead_code))]
fn parse_array_property<T>(
    env: &Env,
    options: &JsObject,
    name: &str,
    parser: impl FnMut(&Env, Unknown<'_>) -> napi::Result<T>,
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
    parse_js_array(env, prop, name, parser)
}

#[allow(clippy::trivially_copy_pass_by_ref)]
#[cfg_attr(test, allow(dead_code))]
fn parse_register_options(
    env: &Env,
    options: Option<JsObject>,
) -> napi::Result<(Vec<RawVfunc>, Vec<RawInterface>)> {
    let Some(options) = options else {
        return Ok((Vec::new(), Vec::new()));
    };

    let vfuncs = parse_array_property(env, &options, "vfuncs", parse_vfunc)?;
    let interfaces = parse_array_property(env, &options, "interfaceVfuncs", parse_interface)?;

    Ok((vfuncs, interfaces))
}

#[napi]
#[allow(clippy::needless_pass_by_value)]
#[cfg_attr(test, allow(dead_code))]
pub fn register_class(
    env: &Env,
    name: String,
    parent_gtype: f64,
    options: Option<JsObject>,
) -> napi::Result<Unknown<'_>> {
    let name = CString::new(name)
        .map_err(|err| napi::Error::new(napi::Status::InvalidArg, err.to_string()))?;
    let (vfuncs, interfaces) = parse_register_options(env, options)?;
    dispatch_request(
        env,
        RegisterClassRequest {
            name,
            parent_gtype: parent_gtype as usize,
            vfuncs,
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
