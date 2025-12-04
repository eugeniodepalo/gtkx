use std::ffi::c_void;

use gtk4::glib::{self, gobject_ffi, translate::ToGlibPtrMut as _};

unsafe extern "C" fn draw_func_trampoline(
    drawing_area: *mut c_void,
    cr: *mut c_void,
    width: i32,
    height: i32,
    user_data: *mut c_void,
) {
    unsafe {
        let closure_ptr = user_data as *mut gobject_ffi::GClosure;
        if closure_ptr.is_null() {
            return;
        }

        let mut args: [glib::Value; 4] = [
            glib::Value::from_type_unchecked(glib::types::Type::OBJECT),
            glib::Value::from_type_unchecked(glib::types::Type::U64),
            glib::Value::from_type_unchecked(glib::types::Type::I32),
            glib::Value::from_type_unchecked(glib::types::Type::I32),
        ];

        gobject_ffi::g_value_set_object(
            args[0].to_glib_none_mut().0,
            drawing_area as *mut gobject_ffi::GObject,
        );

        gobject_ffi::g_value_set_uint64(args[1].to_glib_none_mut().0, cr as u64);
        gobject_ffi::g_value_set_int(args[2].to_glib_none_mut().0, width);
        gobject_ffi::g_value_set_int(args[3].to_glib_none_mut().0, height);

        gobject_ffi::g_closure_invoke(
            closure_ptr,
            std::ptr::null_mut(),
            4,
            args[0].to_glib_none_mut().0,
            std::ptr::null_mut(),
        );
    }
}

pub fn get_draw_func_trampoline_ptr() -> *mut c_void {
    draw_func_trampoline as *mut c_void
}

unsafe extern "C" fn destroy_trampoline(user_data: *mut c_void) {
    unsafe {
        let closure_ptr = user_data as *mut gobject_ffi::GClosure;
        if closure_ptr.is_null() {
            return;
        }

        gobject_ffi::g_closure_invoke(
            closure_ptr,
            std::ptr::null_mut(),
            0,
            std::ptr::null(),
            std::ptr::null_mut(),
        );

        gobject_ffi::g_closure_unref(closure_ptr);
    }
}

pub fn get_destroy_trampoline_ptr() -> *mut c_void {
    destroy_trampoline as *mut c_void
}

unsafe extern "C" fn unref_closure_trampoline(user_data: *mut c_void) {
    unsafe {
        let closure_ptr = user_data as *mut gobject_ffi::GClosure;

        if closure_ptr.is_null() {
            return;
        }

        gobject_ffi::g_closure_unref(closure_ptr);
    }
}

pub fn get_unref_closure_trampoline_ptr() -> *mut c_void {
    unref_closure_trampoline as *mut c_void
}

unsafe extern "C" fn source_func_trampoline(user_data: *mut c_void) -> i32 {
    unsafe {
        let closure_ptr = user_data as *mut gobject_ffi::GClosure;

        if closure_ptr.is_null() {
            return 0;
        }

        let mut return_value = glib::Value::from_type_unchecked(glib::types::Type::BOOL);

        gobject_ffi::g_closure_invoke(
            closure_ptr,
            return_value.to_glib_none_mut().0,
            0,
            std::ptr::null(),
            std::ptr::null_mut(),
        );

        let result = return_value.get::<bool>().unwrap_or(false);

        if !result {
            gobject_ffi::g_closure_unref(closure_ptr);
        }

        i32::from(result)
    }
}

pub fn get_source_func_trampoline_ptr() -> *mut c_void {
    source_func_trampoline as *mut c_void
}
