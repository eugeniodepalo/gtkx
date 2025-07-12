//! GTK4 Thread State Management
//!
//! This module provides thread-local state management for the GTK4 main thread.
//! It handles the storage and access of shared resources including the GTK4 library,
//! object references, and application lifecycle management.

use std::{
    cell::{OnceCell, RefCell},
    collections::HashMap,
};

use crate::object::Object;
use gtk4::gio;

/// Thread-local wrapper for GTK4 thread state.
///
/// This struct provides a thread-safe way to access GTK4 thread-local state
/// using interior mutability. It ensures that the state is properly initialized
/// on first access and provides a safe API for accessing shared resources.
pub struct GtkThreadState(RefCell<OnceCell<GtkThreadStateInner>>);

impl GtkThreadState {
    /// Creates a new GTK4 thread state instance.
    ///
    /// The state is not initialized until first access via `with()`.
    pub fn new() -> Self {
        Self(RefCell::new(OnceCell::new()))
    }

    /// Executes a closure with access to the GTK4 thread state.
    ///
    /// This method provides controlled access to the thread-local GTK4 state.
    /// It initializes the state on first access and ensures thread safety
    /// through interior mutability.
    ///
    /// # Arguments
    ///
    /// * `f` - Closure that receives mutable access to the thread state
    ///
    /// # Returns
    ///
    /// Returns the result of the closure execution.
    ///
    /// # Panics
    ///
    /// Panics if the GTK4 library cannot be loaded or if the state is
    /// already borrowed mutably from another location.
    pub fn with<F, R>(f: F) -> R
    where
        F: FnOnce(&mut GtkThreadStateInner) -> R,
    {
        GTK_THREAD_STATE.with(|state| {
            let mut inner = state.0.borrow_mut();

            // Initialize the state on first access
            inner.get_or_init(|| GtkThreadStateInner {
                library: unsafe { libloading::Library::new("libgtk-4.so.1").unwrap() },
                next_object_id: 0,
                object_map: HashMap::new(),
                app_hold_guard: None,
            });

            f(inner.get_mut().unwrap())
        })
    }
}

/// Internal state for the GTK4 thread.
///
/// This struct contains all the shared state that needs to be accessible
/// from the GTK4 main thread. It manages object lifetimes, library symbols,
/// and application lifecycle.
pub struct GtkThreadStateInner {
    /// Dynamic library handle for GTK4 functions
    pub library: libloading::Library,
    /// Counter for generating unique object IDs
    pub next_object_id: usize,
    /// Map of object IDs to their corresponding GTK4 objects
    pub object_map: HashMap<usize, Object>,
    /// Application hold guard to prevent premature termination
    pub app_hold_guard: Option<gio::ApplicationHoldGuard>,
}

thread_local! {
    /// Thread-local storage for GTK4 state.
    ///
    /// This ensures that each thread has its own copy of the GTK4 state,
    /// which is important for thread safety with GTK4's requirements.
    static GTK_THREAD_STATE: GtkThreadState = GtkThreadState::new();
}
