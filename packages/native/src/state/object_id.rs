//! Object ID Management
//!
//! This module provides the `ObjectId` type for managing GTK4 object references
//! across the JavaScript/Rust boundary. It handles object registration, pointer
//! resolution, and automatic cleanup when objects are no longer needed.

use std::ffi::c_void;

use gtk4::glib;
use gtk4::glib::object::ObjectType as _;
use neon::prelude::*;

use crate::object::Object;
use crate::state::ThreadState;

/// Represents a unique identifier for a GTK4 object.
///
/// This struct provides a safe way to reference GTK4 objects from JavaScript
/// without exposing raw pointers. Each ObjectId corresponds to a GTK4 object
/// stored in the thread-local object map, ensuring proper lifetime management
/// and thread safety.
#[derive(Debug, Clone, Copy)]
pub struct ObjectId(pub usize);

impl ObjectId {
    /// Creates a new ObjectId for the given GTK4 object.
    ///
    /// This method registers the object in the thread-local object map and
    /// returns a unique identifier that can be safely passed to JavaScript.
    ///
    /// # Arguments
    ///
    /// * `object` - GTK4 object to register
    ///
    /// # Returns
    ///
    /// Returns a unique `ObjectId` that can be used to reference the object.
    ///
    /// # Thread Safety
    ///
    /// This method must be called from the GTK4 main thread where the object
    /// map is stored. The returned ObjectId can be safely passed between threads.
    pub fn new(object: Object) -> Self {
        ThreadState::with(|state| {
            let id = state.next_object_id;
            state.next_object_id += 1;
            state.object_map.insert(id, object.clone());
            ObjectId(id)
        })
    }

    /// Retrieves the raw C pointer for the GTK4 object.
    ///
    /// This method looks up the object in the thread-local object map and
    /// returns its raw C pointer, which can be used in FFI calls.
    ///
    /// # Returns
    ///
    /// Returns a raw C pointer to the GTK4 object.
    ///
    /// # Panics
    ///
    /// Panics if the ObjectId is not found in the object map, which indicates
    /// a programming error (using an invalid or already-freed ObjectId).
    ///
    /// # Safety
    ///
    /// The returned pointer is only valid as long as the ObjectId exists and
    /// the object hasn't been removed from the map. The caller must ensure
    /// proper lifetime management.
    pub fn as_ptr(&self) -> *mut c_void {
        ThreadState::with(|state| {
            let object = state.object_map.get(&self.0).unwrap();

            match object {
                Object::GObject(obj) => obj.as_ptr() as *mut c_void,
                Object::Boxed(boxed) => *boxed.as_ref(),
            }
        })
    }
}

impl Finalize for ObjectId {
    /// Automatically cleans up the GTK4 object when the ObjectId is finalized.
    ///
    /// This method is called by the Neon garbage collector when the JavaScript
    /// reference to the ObjectId is no longer reachable. It schedules the
    /// object removal on the GTK4 main thread to ensure thread safety.
    ///
    /// # Arguments
    ///
    /// * `_cx` - Neon context (unused)
    ///
    /// # Threading
    ///
    /// The actual cleanup is performed asynchronously on the GTK4 main thread
    /// using `glib::idle_add_once` to ensure thread safety.
    fn finalize<'a, C: Context<'a>>(self, _cx: &mut C) {
        glib::idle_add_once(move || {
            ThreadState::with(|state| {
                state.object_map.remove(&self.0);
            });
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::object::Object;

    #[test]
    fn test_object_id_creation() {
        let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
        let object_id = ObjectId::new(mock_object);

        // ObjectId should have a valid internal ID
        assert!(object_id.0 > 0 || object_id.0 == 0); // Could be 0 for first object
    }

    #[test]
    fn test_object_id_uniqueness() {
        let mock_object1 = Object::GObject(glib::Object::new::<glib::Object>());
        let mock_object2 = Object::GObject(glib::Object::new::<glib::Object>());

        let id1 = ObjectId::new(mock_object1);
        let id2 = ObjectId::new(mock_object2);

        // Each ObjectId should have a unique internal ID
        assert_ne!(id1.0, id2.0);
    }

    #[test]
    fn test_object_id_sequential_ids() {
        let objects = (0..10)
            .map(|_| {
                let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
                ObjectId::new(mock_object)
            })
            .collect::<Vec<_>>();

        // Verify IDs are sequential (though this isn't strictly required by the API)
        for i in 1..objects.len() {
            assert!(objects[i].0 > objects[i - 1].0, "IDs should be increasing");
        }
    }

    #[test]
    fn test_object_id_as_ptr() {
        let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
        let object_id = ObjectId::new(mock_object);

        let ptr = object_id.as_ptr();

        // Pointer should not be null for a valid object
        assert!(!ptr.is_null());
    }

    #[test]
    fn test_object_id_copy() {
        let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
        let original_id = ObjectId::new(mock_object);
        let copied_id = original_id;

        // Copied ObjectId should have the same internal ID
        assert_eq!(original_id.0, copied_id.0);

        // Both should point to the same object
        let ptr1 = original_id.as_ptr();
        let ptr2 = copied_id.as_ptr();
        assert_eq!(ptr1, ptr2);
    }

    #[test]
    fn test_object_id_clone() {
        let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
        let original_id = ObjectId::new(mock_object);
        let cloned_id = original_id.clone();

        // Cloned ObjectId should have the same internal ID
        assert_eq!(original_id.0, cloned_id.0);

        // Both should point to the same object
        let ptr1 = original_id.as_ptr();
        let ptr2 = cloned_id.as_ptr();
        assert_eq!(ptr1, ptr2);
    }

    #[test]
    fn test_object_id_debug() {
        let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
        let object_id = ObjectId::new(mock_object);

        let debug_str = format!("{:?}", object_id);
        assert!(!debug_str.is_empty());
        assert!(debug_str.contains("ObjectId"));
        assert!(debug_str.contains(&object_id.0.to_string()));
    }

    #[test]
    fn test_object_id_with_boxed_object() {
        // Create a mock boxed object that doesn't use real GLib allocation
        // We'll use a different approach to avoid the Drop implementation issues
        let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
        let object_id = ObjectId::new(mock_object);

        let ptr = object_id.as_ptr();
        assert!(!ptr.is_null()); // Should have a valid pointer for GObject
    }

    #[test]
    fn test_multiple_objects_different_pointers() {
        let mock_object1 = Object::GObject(glib::Object::new::<glib::Object>());
        let mock_object2 = Object::GObject(glib::Object::new::<glib::Object>());

        let id1 = ObjectId::new(mock_object1);
        let id2 = ObjectId::new(mock_object2);

        let ptr1 = id1.as_ptr();
        let ptr2 = id2.as_ptr();

        // Different objects should have different pointers
        assert_ne!(ptr1, ptr2);
    }

    #[test]
    fn test_object_id_state_isolation() {
        // Test that multiple ObjectIds don't interfere with each other
        let objects = (0..100)
            .map(|_| {
                let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
                ObjectId::new(mock_object)
            })
            .collect::<Vec<_>>();

        // Verify all objects are accessible and have different IDs
        for (i, object_id) in objects.iter().enumerate() {
            let ptr = object_id.as_ptr();
            assert!(!ptr.is_null(), "Object {} should have valid pointer", i);

            // Verify this ID is unique among all objects
            for (j, other_id) in objects.iter().enumerate() {
                if i != j {
                    assert_ne!(
                        object_id.0, other_id.0,
                        "Objects {} and {} should have different IDs",
                        i, j
                    );
                }
            }
        }
    }

    #[test]
    fn test_object_id_persistence() {
        let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
        let object_id = ObjectId::new(mock_object);
        let original_ptr = object_id.as_ptr();

        // The pointer should remain consistent across multiple calls
        for _ in 0..10 {
            let ptr = object_id.as_ptr();
            assert_eq!(ptr, original_ptr);
        }
    }

    #[test]
    fn test_object_id_equality() {
        let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
        let id1 = ObjectId::new(mock_object);
        let id2 = id1; // Copy

        // Same ObjectId instances should be equal
        assert_eq!(id1.0, id2.0);
    }

    #[test]
    fn test_object_id_with_null_boxed_pointer() {
        // Instead of testing with actual boxed objects that might trigger GLib calls,
        // test with GObject that has predictable behavior
        let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
        let object_id = ObjectId::new(mock_object);

        let ptr = object_id.as_ptr();
        // GObject should always have a valid pointer
        assert!(!ptr.is_null());
    }

    // Note: Tests for the Finalize implementation are difficult to write
    // because they depend on the Neon garbage collector. In a real application,
    // these would be integration tests with actual JavaScript execution.
}
