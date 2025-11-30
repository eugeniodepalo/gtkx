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
        Boxed {
            ptr,
            type_,
            is_owned: true,
        }
    }

    pub fn from_glib_none(type_: Option<glib::Type>, ptr: *mut c_void) -> Self {
        if ptr.is_null() {
            return Boxed {
                ptr,
                type_,
                is_owned: false,
            };
        }

        if let Some(gtype) = type_ {
            let cloned_ptr = unsafe { glib::gobject_ffi::g_boxed_copy(gtype.into_glib(), ptr) };
            Boxed {
                ptr: cloned_ptr,
                type_,
                is_owned: true,
            }
        } else {
            Boxed {
                ptr,
                type_: None,
                is_owned: false,
            }
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
        if self.ptr.is_null() {
            return Boxed {
                ptr: self.ptr,
                type_: self.type_,
                is_owned: false,
            };
        }

        if let Some(gtype) = self.type_ {
            let cloned_ptr =
                unsafe { glib::gobject_ffi::g_boxed_copy(gtype.into_glib(), self.ptr) };
            Boxed {
                ptr: cloned_ptr,
                type_: self.type_,
                is_owned: true,
            }
        } else {
            Boxed {
                ptr: self.ptr,
                type_: None,
                is_owned: false,
            }
        }
    }
}

impl Drop for Boxed {
    fn drop(&mut self) {
        if self.is_owned && !self.ptr.is_null() {
            if let Some(gtype) = self.type_ {
                unsafe {
                    glib::gobject_ffi::g_boxed_free(gtype.into_glib(), self.ptr);
                }
            }
        }
    }
}
