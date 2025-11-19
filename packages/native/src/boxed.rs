use std::ffi::c_void;

use gtk4::glib::{self, translate::IntoGlib as _};

#[derive(Debug)]
pub struct Boxed {
    ptr: *mut c_void,
    type_: glib::Type,
}

impl Boxed {
    pub fn from_glib_full(type_: glib::Type, ptr: *mut c_void) -> Self {
        Boxed { ptr, type_ }
    }

    pub fn from_glib_none(type_: glib::Type, ptr: *mut c_void) -> Self {
        let cloned_ptr = unsafe { glib::gobject_ffi::g_boxed_copy(type_.into_glib(), ptr) };

        Boxed {
            ptr: cloned_ptr,
            type_,
        }
    }
}

impl AsRef<*mut c_void> for Boxed {
    fn as_ref(&self) -> &*mut c_void {
        &self.ptr
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
