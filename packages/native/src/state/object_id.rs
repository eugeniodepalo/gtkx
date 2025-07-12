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
use crate::state::GtkThreadState;

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
        GtkThreadState::with(|state| {
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
        GtkThreadState::with(|state| {
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
            GtkThreadState::with(|state| {
                state.object_map.remove(&self.0);
            });
        });
    }
}
