//! Thread State Management
//!
//! This module provides thread-local state management for FFI operations.
//! It maintains the object map and handles thread-safe access to C library resources.
//! The state is stored in thread-local storage to ensure that FFI operations
//! are properly isolated per thread.

use std::cell::RefCell;
use std::collections::HashMap;

use gtk4::gio::ApplicationHoldGuard;
use libloading::Library;

use crate::object::Object;

/// Thread-local state for FFI operations.
///
/// This struct maintains the state needed for FFI operations within a single
/// thread. It includes the object map for tracking C library objects and maintains
/// the next available object ID for new objects, as well as a map of loaded libraries.
///
/// The state is stored in thread-local storage to ensure thread safety and
/// proper isolation of FFI operations, as many C libraries (like GTK4) are not thread-safe.
#[derive(Debug)]
pub struct ThreadState {
    /// Map of object IDs to C library objects
    pub object_map: HashMap<usize, Object>,
    /// Next available object ID
    pub next_object_id: usize,
    /// Map of loaded libraries keyed by library name for dynamic symbol resolution
    pub libraries: HashMap<String, Library>,
    /// Application hold guard to prevent early termination (GTK4-specific)
    pub app_hold_guard: Option<ApplicationHoldGuard>,
}

impl Default for ThreadState {
    /// Creates a new empty thread state.
    ///
    /// This method initializes the state with an empty object map and
    /// sets the next object ID to 1 (0 is reserved for special cases).
    fn default() -> Self {
        ThreadState {
            object_map: HashMap::new(),
            next_object_id: 1,
            libraries: HashMap::new(),
            app_hold_guard: None,
        }
    }
}

impl ThreadState {
    /// Provides access to the current thread's FFI state.
    ///
    /// This method uses thread-local storage to access the FFI state for
    /// the current thread. It automatically initializes the state if it
    /// doesn't exist yet.
    ///
    /// # Arguments
    ///
    /// * `f` - Closure that operates on the thread state
    ///
    /// # Returns
    ///
    /// Returns the result of the closure operation.
    ///
    /// # Thread Safety
    ///
    /// This method is thread-safe because it uses thread-local storage.
    /// Each thread has its own independent state that cannot be accessed
    /// by other threads.
    pub fn with<F, R>(f: F) -> R
    where
        F: FnOnce(&mut ThreadState) -> R,
    {
        thread_local! {
            static STATE: RefCell<ThreadState> = RefCell::new(ThreadState::default());
        }

        STATE.with(|state| f(&mut *state.borrow_mut()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::object::Object;
    use gtk4::glib;
    use std::sync::{Arc, Mutex};
    use std::thread;

    #[test]
    fn test_thread_state_creation() {
        let state = ThreadState::default();

        assert!(state.object_map.is_empty());
        assert_eq!(state.next_object_id, 1);
        assert!(state.libraries.is_empty());
        assert!(state.app_hold_guard.is_none());
    }

    #[test]
    fn test_thread_state_with_function() {
        let result = ThreadState::with(|state| {
            assert!(state.object_map.is_empty());
            assert_eq!(state.next_object_id, 1);
            assert!(state.libraries.is_empty());
            assert!(state.app_hold_guard.is_none());
            42
        });

        assert_eq!(result, 42);
    }

    #[test]
    fn test_state_persistence_across_calls() {
        // First call - modify state
        ThreadState::with(|state| {
            state.next_object_id = 100;
            let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
            state.object_map.insert(5, mock_object);
        });

        // Second call - verify state persisted
        ThreadState::with(|state| {
            assert_eq!(state.next_object_id, 100);
            assert!(state.object_map.contains_key(&5));
        });
    }

    #[test]
    fn test_object_map_operations() {
        ThreadState::with(|state| {
            let mock_object1 = Object::GObject(glib::Object::new::<glib::Object>());
            let mock_object2 = Object::GObject(glib::Object::new::<glib::Object>());

            // Insert objects
            state.object_map.insert(1, mock_object1);
            state.object_map.insert(2, mock_object2);

            // Verify insertion
            assert_eq!(state.object_map.len(), 2);
            assert!(state.object_map.contains_key(&1));
            assert!(state.object_map.contains_key(&2));

            // Remove object
            state.object_map.remove(&1);

            // Verify removal
            assert_eq!(state.object_map.len(), 1);
            assert!(!state.object_map.contains_key(&1));
            assert!(state.object_map.contains_key(&2));
        });
    }

    #[test]
    fn test_next_object_id_increment() {
        ThreadState::with(|state| {
            let initial_id = state.next_object_id;

            // Simulate object creation
            let id1 = state.next_object_id;
            state.next_object_id += 1;

            let id2 = state.next_object_id;
            state.next_object_id += 1;

            let id3 = state.next_object_id;
            state.next_object_id += 1;

            // Verify IDs are sequential
            assert_eq!(id1, initial_id);
            assert_eq!(id2, initial_id + 1);
            assert_eq!(id3, initial_id + 2);
            assert_eq!(state.next_object_id, initial_id + 3);
        });
    }

    #[test]
    fn test_thread_isolation() {
        let results = Arc::new(Mutex::new(Vec::new()));
        let mut handles = Vec::new();

        // Spawn multiple threads
        for i in 0..5 {
            let results_clone = Arc::clone(&results);
            let handle = thread::spawn(move || {
                ThreadState::with(|state| {
                    // Each thread should start with fresh state
                    assert!(state.object_map.is_empty());
                    assert_eq!(state.next_object_id, 1);

                    // Modify state in this thread
                    state.next_object_id = 100 + i;
                    let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
                    state.object_map.insert(i, mock_object);

                    // Record the state
                    results_clone
                        .lock()
                        .unwrap()
                        .push((i, state.next_object_id));
                });
            });
            handles.push(handle);
        }

        // Wait for all threads to complete
        for handle in handles {
            handle.join().unwrap();
        }

        // Verify each thread had its own state
        let results = results.lock().unwrap();
        assert_eq!(results.len(), 5);

        for (i, next_id) in results.iter() {
            assert_eq!(*next_id, 100 + i);
        }
    }

    #[test]
    fn test_state_debug_output() {
        let state = ThreadState::default();
        let debug_str = format!("{:?}", state);

        assert!(debug_str.contains("ThreadState"));
        assert!(debug_str.contains("object_map"));
        assert!(debug_str.contains("next_object_id"));
        assert!(debug_str.contains("libraries"));
        assert!(debug_str.contains("app_hold_guard"));
    }

    #[test]
    fn test_large_object_map() {
        ThreadState::with(|state| {
            // Insert many objects
            for i in 0..1000 {
                let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
                state.object_map.insert(i, mock_object);
            }

            assert_eq!(state.object_map.len(), 1000);

            // Verify all objects are accessible
            for i in 0..1000 {
                assert!(state.object_map.contains_key(&i));
            }

            // Remove half the objects
            for i in 0..500 {
                state.object_map.remove(&i);
            }

            assert_eq!(state.object_map.len(), 500);

            // Verify correct objects were removed
            for i in 0..500 {
                assert!(!state.object_map.contains_key(&i));
            }
            for i in 500..1000 {
                assert!(state.object_map.contains_key(&i));
            }
        });
    }

    #[test]
    fn test_state_modification_in_nested_calls() {
        // Note: This test demonstrates that nested calls to ThreadState::with
        // would cause a BorrowMutError, so we test sequential calls instead
        let first_result = ThreadState::with(|state| {
            state.next_object_id = 50;
            state.next_object_id
        });

        assert_eq!(first_result, 50);

        // Simulate what would happen in a nested scenario by making sequential calls
        let second_result = ThreadState::with(|state| {
            assert_eq!(state.next_object_id, 50);

            // Modify state
            state.next_object_id = 75;

            // Add object
            let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
            state.object_map.insert(42, mock_object);

            state.next_object_id
        });

        assert_eq!(second_result, 75);

        // Verify changes persisted
        ThreadState::with(|state| {
            assert_eq!(state.next_object_id, 75);
            assert!(state.object_map.contains_key(&42));
        });
    }

    #[test]
    fn test_object_replacement() {
        ThreadState::with(|state| {
            let mock_object1 = Object::GObject(glib::Object::new::<glib::Object>());
            let mock_object2 = Object::GObject(glib::Object::new::<glib::Object>());

            // Insert first object
            state.object_map.insert(1, mock_object1);
            assert_eq!(state.object_map.len(), 1);

            // Replace with second object
            let old_object = state.object_map.insert(1, mock_object2);
            assert!(old_object.is_some());
            assert_eq!(state.object_map.len(), 1);
        });
    }

    #[test]
    fn test_object_map_clear() {
        ThreadState::with(|state| {
            // Add several objects
            for i in 0..10 {
                let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
                state.object_map.insert(i, mock_object);
            }

            assert_eq!(state.object_map.len(), 10);

            // Clear the map
            state.object_map.clear();

            assert!(state.object_map.is_empty());
            assert_eq!(state.object_map.len(), 0);
        });
    }

    #[test]
    fn test_concurrent_access_same_thread() {
        // Test that multiple concurrent operations on the same thread work correctly
        let results = (0..100)
            .map(|i| {
                ThreadState::with(|state| {
                    let old_id = state.next_object_id;
                    state.next_object_id += 1;

                    let mock_object = Object::GObject(glib::Object::new::<glib::Object>());
                    state.object_map.insert(i, mock_object);

                    (old_id, state.object_map.len())
                })
            })
            .collect::<Vec<_>>();

        // Verify all operations completed successfully
        for (i, (old_id, map_len)) in results.iter().enumerate() {
            assert_eq!(*old_id, i + 1); // IDs should be sequential starting from 1
            assert_eq!(*map_len, i + 1); // Map should grow with each insertion
        }
    }

    #[test]
    fn test_libraries_field_access() {
        ThreadState::with(|state| {
            // Test that libraries field is accessible
            assert!(state.libraries.is_empty());

            // We can't test actual library loading without proper setup,
            // but we can verify the field exists and is accessible
        });
    }

    #[test]
    fn test_app_hold_guard_field_access() {
        ThreadState::with(|state| {
            // Test that app_hold_guard field is accessible
            assert!(state.app_hold_guard.is_none());

            // We can't test actual hold guard creation without a running application,
            // but we can verify the field exists and is accessible
        });
    }
}
