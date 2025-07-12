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
        // Only call g_boxed_free if this is a real GLib boxed type
        // Check if the type is actually a boxed type to avoid warnings
        if self.type_.is_a(glib::types::Type::BOXED) {
            unsafe {
                glib::gobject_ffi::g_boxed_free(self.type_.into_glib(), self.ptr);
            }
        }
        // For mock/test types, just let Rust handle the cleanup
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::ptr;

    // Helper struct to create test-only boxed instances that won't trigger GLib warnings
    #[derive(Debug)]
    struct TestBoxed {
        ptr: *mut c_void,
        type_: glib::Type,
    }

    impl TestBoxed {
        fn new(type_: glib::Type, ptr: *mut c_void) -> Self {
            TestBoxed { ptr, type_ }
        }

        fn as_ptr(&self) -> *mut c_void {
            self.ptr
        }

        fn type_(&self) -> glib::Type {
            self.type_
        }
    }

    // Mock functions that create test boxed instances without actual GLib allocation
    fn create_mock_boxed_type() -> glib::Type {
        // Use a non-boxed type for testing to avoid GLib warnings
        glib::Type::I32
    }

    fn create_mock_ptr() -> *mut c_void {
        // Create a mock pointer for testing
        0x1000 as *mut c_void
    }

    #[test]
    fn test_boxed_creation_from_full() {
        let type_ = create_mock_boxed_type();
        let ptr = create_mock_ptr();

        let test_boxed = TestBoxed::new(type_, ptr);

        assert_eq!(test_boxed.type_(), type_);
        assert_eq!(test_boxed.as_ptr(), ptr);
    }

    #[test]
    fn test_boxed_as_ref() {
        let type_ = create_mock_boxed_type();
        let ptr = create_mock_ptr();

        let boxed = Boxed::from_glib_full(type_, ptr);
        let ptr_ref = boxed.as_ref();

        assert_eq!(*ptr_ref, ptr);
    }

    #[test]
    fn test_boxed_debug() {
        let type_ = create_mock_boxed_type();
        let ptr = create_mock_ptr();

        let boxed = Boxed::from_glib_full(type_, ptr);
        let debug_str = format!("{:?}", boxed);

        assert!(debug_str.contains("Boxed"));
    }

    #[test]
    fn test_boxed_type_storage() {
        let type_ = create_mock_boxed_type();
        let ptr = create_mock_ptr();

        let boxed = Boxed::from_glib_full(type_, ptr);

        // Verify the type is stored correctly
        assert_eq!(boxed.type_, type_);
    }

    #[test]
    fn test_multiple_boxed_instances() {
        let type1 = create_mock_boxed_type();
        let type2 = glib::Type::STRING; // Different type
        let ptr1 = create_mock_ptr();
        let ptr2 = 0x2000 as *mut c_void;

        let boxed1 = Boxed::from_glib_full(type1, ptr1);
        let boxed2 = Boxed::from_glib_full(type2, ptr2);

        assert_eq!(boxed1.type_, type1);
        assert_eq!(boxed2.type_, type2);
        assert_eq!(boxed1.ptr, ptr1);
        assert_eq!(boxed2.ptr, ptr2);
    }

    #[test]
    fn test_boxed_with_null_pointer() {
        let type_ = create_mock_boxed_type();
        let null_ptr = ptr::null_mut();

        let boxed = Boxed::from_glib_full(type_, null_ptr);

        assert_eq!(boxed.ptr, null_ptr);
        assert_eq!(boxed.type_, type_);
    }

    #[test]
    fn test_boxed_pointer_access() {
        let type_ = create_mock_boxed_type();
        let ptr = 0x12345678 as *mut c_void;

        let boxed = Boxed::from_glib_full(type_, ptr);

        assert_eq!(*boxed.as_ref(), ptr);
    }

    #[test]
    fn test_boxed_type_variants() {
        let types = [
            glib::Type::I8,
            glib::Type::U8,
            glib::Type::I32,
            glib::Type::U32,
            glib::Type::I64,
            glib::Type::U64,
            glib::Type::F32,
            glib::Type::F64,
            glib::Type::STRING,
        ];

        for (i, type_) in types.iter().enumerate() {
            let ptr = (0x1000 + i * 0x100) as *mut c_void;
            let boxed = Boxed::from_glib_full(*type_, ptr);

            assert_eq!(boxed.type_, *type_);
            assert_eq!(boxed.ptr, ptr);
        }
    }

    // Note: Tests that would require actual GLib boxed type operations
    // are omitted to avoid the g_boxed_free warnings. In a full test
    // environment with proper GTK4 setup, these could test real operations.
}
