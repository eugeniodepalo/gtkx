use std::ffi::c_void;

use gtk4::glib::{self, translate::IntoGlib as _};

#[derive(Debug)]
pub struct Boxed {
    ptr: *mut c_void,
    type_: Option<glib::Type>,
    is_owned: bool,
}

impl Boxed {
    pub fn from_glib_full(type_: Option<glib::Type>, ptr: *mut c_void) -> Self {
        Self {
            ptr,
            type_,
            is_owned: true,
        }
    }

    pub fn from_glib_none(type_: Option<glib::Type>, ptr: *mut c_void) -> Self {
        if ptr.is_null() {
            return Self {
                ptr,
                type_,
                is_owned: false,
            };
        }

        match type_ {
            Some(gtype) => {
                let cloned_ptr = unsafe { glib::gobject_ffi::g_boxed_copy(gtype.into_glib(), ptr) };
                Self {
                    ptr: cloned_ptr,
                    type_,
                    is_owned: true,
                }
            }
            None => Self {
                ptr,
                type_: None,
                is_owned: false,
            },
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
        Self::from_glib_none(self.type_, self.ptr)
    }
}

impl Drop for Boxed {
    fn drop(&mut self) {
        if self.is_owned && !self.ptr.is_null()
            && let Some(gtype) = self.type_ {
                unsafe {
                    glib::gobject_ffi::g_boxed_free(gtype.into_glib(), self.ptr);
                }
            }
    }
}
