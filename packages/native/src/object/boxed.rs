//! Boxed Type Management
//!
//! This module provides the `Boxed` struct for managing GTK4 boxed types.
//! Boxed types are simple structs that use GLib's reference counting system
//! for memory management. This module ensures proper lifetime management
//! and safe conversion between owned and borrowed references.

use std::ffi::c_void;

use gtk4::glib::{self, translate::IntoGlib as _};

/// Represents a GTK4 boxed type with automatic memory management.
///
/// Boxed types in GTK4 are simple data structures that use GLib's boxed
/// type system for memory management. This struct provides safe Rust
/// wrappers around these types, ensuring proper reference counting and
/// automatic cleanup.
#[derive(Debug)]
pub struct Boxed {
    /// Raw pointer to the boxed data
    ptr: *mut c_void,
    /// GLib type information for the boxed type
    type_: glib::Type,
}

impl Boxed {
    /// Creates a Boxed from a transferred (owned) GLib pointer.
    ///
    /// This constructor takes ownership of the provided pointer and will
    /// automatically free it when the Boxed is dropped.
    ///
    /// # Arguments
    ///
    /// * `type_` - GLib type information for the boxed type
    /// * `ptr` - Raw pointer to the boxed data (ownership transferred)
    ///
    /// # Returns
    ///
    /// Returns a new Boxed instance that owns the provided pointer.
    ///
    /// # Safety
    ///
    /// The caller must ensure that:
    /// - The pointer is valid and points to data of the specified type
    /// - The pointer ownership is transferred to this Boxed instance
    /// - The pointer was allocated by GLib's boxed type system
    pub fn from_glib_full(type_: glib::Type, ptr: *mut c_void) -> Self {
        Boxed { ptr, type_ }
    }

    /// Creates a Boxed from a borrowed GLib pointer.
    ///
    /// This constructor creates a copy of the boxed data, leaving the
    /// original pointer unchanged. The new Boxed instance owns its copy
    /// and will automatically free it when dropped.
    ///
    /// # Arguments
    ///
    /// * `type_` - GLib type information for the boxed type
    /// * `ptr` - Raw pointer to the boxed data (borrowed, not transferred)
    ///
    /// # Returns
    ///
    /// Returns a new Boxed instance that owns a copy of the provided data.
    ///
    /// # Safety
    ///
    /// The caller must ensure that:
    /// - The pointer is valid and points to data of the specified type
    /// - The pointer remains valid during the copy operation
    /// - The type supports GLib's boxed copy operation
    pub fn from_glib_none(type_: glib::Type, ptr: *mut c_void) -> Self {
        let cloned_ptr = unsafe { glib::gobject_ffi::g_boxed_copy(type_.into_glib(), ptr) };

        Boxed {
            ptr: cloned_ptr,
            type_,
        }
    }
}

impl AsRef<*mut c_void> for Boxed {
    /// Returns a reference to the raw pointer.
    ///
    /// This method provides access to the underlying raw pointer for use
    /// in FFI calls. The pointer remains owned by the Boxed instance.
    fn as_ref(&self) -> &*mut c_void {
        &self.ptr
    }
}

impl Clone for Boxed {
    /// Creates a copy of the Boxed instance.
    ///
    /// This method uses GLib's boxed copy mechanism to create a new
    /// independent copy of the boxed data. Both the original and the
    /// copy have their own ownership and will be freed independently.
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
    /// Automatically frees the boxed data when the instance is dropped.
    ///
    /// This method uses GLib's boxed free mechanism to properly deallocate
    /// the boxed data. It ensures that no memory leaks occur and that the
    /// data is properly cleaned up according to the type's requirements.
    fn drop(&mut self) {
        unsafe {
            glib::gobject_ffi::g_boxed_free(self.type_.into_glib(), self.ptr);
        }
    }
}
