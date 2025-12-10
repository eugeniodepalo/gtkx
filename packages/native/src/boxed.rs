//! GLib boxed type wrapper with ownership tracking.
//!
//! Boxed types in GLib are heap-allocated structs that can be copied and freed.
//! This module provides a wrapper that tracks ownership and properly frees
//! the memory when dropped.

use std::ffi::c_void;

use gtk4::glib::{self, translate::IntoGlib as _};

/// A wrapper around a GLib boxed type pointer.
///
/// Tracks whether we own the memory (and thus should free it on drop) or
/// whether it's borrowed from another owner.
#[derive(Debug)]
pub struct Boxed {
    ptr: *mut c_void,
    type_: Option<glib::Type>,
    is_owned: bool,
}

impl Boxed {
    /// Creates a Boxed from a pointer with full ownership transfer.
    ///
    /// The caller transfers ownership of the memory to this Boxed, which will
    /// free it when dropped.
    pub fn from_glib_full(type_: Option<glib::Type>, ptr: *mut c_void) -> Self {
        Self {
            ptr,
            type_,
            is_owned: true,
        }
    }

    /// Creates a Boxed from a borrowed pointer.
    ///
    /// If the type is known, creates a copy using `g_boxed_copy`. Otherwise,
    /// stores the pointer without ownership (caller must ensure it stays valid).
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
        if self.is_owned
            && !self.ptr.is_null()
            && let Some(gtype) = self.type_
        {
            unsafe {
                glib::gobject_ffi::g_boxed_free(gtype.into_glib(), self.ptr);
            }
        }
    }
}
