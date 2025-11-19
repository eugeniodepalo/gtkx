use std::{cell::RefCell, collections::HashMap};

use gtk4::gio::ApplicationHoldGuard;
use libloading::Library;

use crate::object::Object;

#[derive(Debug)]
pub struct GtkThreadState {
    pub object_map: HashMap<usize, Object>,
    pub next_object_id: usize,
    pub libraries: HashMap<String, Library>,
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
    pub fn with<F, R>(f: F) -> R
    where
        F: FnOnce(&mut GtkThreadState) -> R,
    {
        thread_local! {
            static STATE: RefCell<GtkThreadState> = RefCell::new(GtkThreadState::default());
        }

        STATE.with(|state| f(&mut *state.borrow_mut()))
    }

    pub fn get_library(&mut self, name: &str) -> anyhow::Result<&Library> {
        if !self.libraries.contains_key(name) {
            match unsafe { Library::new(name) } {
                Ok(lib) => {
                    self.libraries.insert(name.to_string(), lib);
                }
                Err(err) => {
                    anyhow::bail!("Failed to load library '{}': {}", name, err);
                }
            }
        }

        self.libraries
            .get(name)
            .ok_or(anyhow::anyhow!("Library '{}' not loaded", name))
    }
}
