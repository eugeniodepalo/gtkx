//! Thread-local state management for the GTK thread.
//!
//! This module maintains the per-thread state needed for FFI operations,
//! including the object map for tracking native objects, loaded dynamic
//! libraries, and the application hold guard.

use std::{cell::RefCell, collections::HashMap};

use gtk4::gio::ApplicationHoldGuard;
use libloading::os::unix::{Library, RTLD_GLOBAL, RTLD_NOW};

use crate::object::Object;

/// Thread-local state for the GTK thread.
///
/// This struct holds all the mutable state that needs to persist across
/// FFI calls on the GTK thread.
pub struct GtkThreadState {
    /// Map from ObjectId values to their corresponding native objects.
    pub object_map: HashMap<usize, Object>,
    /// Counter for generating unique ObjectId values.
    pub next_object_id: usize,
    /// Cache of loaded dynamic libraries by name.
    pub libraries: HashMap<String, Library>,
    /// Hold guard that keeps the GTK application alive.
    pub app_hold_guard: Option<ApplicationHoldGuard>,
}

impl Default for GtkThreadState {
    fn default() -> Self {
        GtkThreadState {
            object_map: HashMap::new(),
            next_object_id: 1,
            libraries: HashMap::new(),
            app_hold_guard: None,
        }
    }
}

impl GtkThreadState {
    /// Executes a closure with access to the thread-local state.
    ///
    /// This is the primary way to access the GTK thread state. The closure
    /// receives a mutable reference to the state.
    pub fn with<F, R>(f: F) -> R
    where
        F: FnOnce(&mut GtkThreadState) -> R,
    {
        thread_local! {
            static STATE: RefCell<GtkThreadState> = RefCell::new(GtkThreadState::default());
        }

        STATE.with(|state| f(&mut state.borrow_mut()))
    }

    /// Gets or loads a dynamic library by name.
    ///
    /// Library names can be comma-separated to try multiple names (e.g.,
    /// for different library versions). Libraries are loaded with RTLD_NOW
    /// and RTLD_GLOBAL flags.
    ///
    /// # Errors
    ///
    /// Returns an error if no library variant could be loaded.
    pub fn get_library(&mut self, name: &str) -> anyhow::Result<&Library> {
        if !self.libraries.contains_key(name) {
            let lib_names: Vec<&str> = name.split(',').collect();
            let mut last_error = None;

            for lib_name in &lib_names {
                match unsafe { Library::open(Some(*lib_name), RTLD_NOW | RTLD_GLOBAL) } {
                    Ok(lib) => {
                        self.libraries.insert(name.to_string(), lib);
                        break;
                    }
                    Err(err) => {
                        last_error = Some(err);
                    }
                }
            }

            if !self.libraries.contains_key(name) {
                if let Some(err) = last_error {
                    anyhow::bail!("Failed to load library '{}': {}", name, err);
                } else {
                    anyhow::bail!("Failed to load library '{}': no libraries specified", name);
                }
            }
        }

        self.libraries
            .get(name)
            .ok_or(anyhow::anyhow!("Library '{}' not loaded", name))
    }
}
