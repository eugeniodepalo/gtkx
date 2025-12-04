use std::{cell::RefCell, collections::HashMap, mem::ManuallyDrop};

use gtk4::{
    gio::ApplicationHoldGuard,
    glib::{self, gobject_ffi, translate::ToGlibPtr},
};
use libloading::os::unix::{Library, RTLD_GLOBAL, RTLD_NOW};

use crate::object::Object;

pub struct GtkThreadState {
    pub object_map: HashMap<usize, Object>,
    pub next_object_id: usize,
    pub libraries: HashMap<String, ManuallyDrop<Library>>,
    pub app_hold_guard: Option<ApplicationHoldGuard>,
    closures: Vec<glib::Closure>,
}

impl Default for GtkThreadState {
    fn default() -> Self {
        GtkThreadState {
            object_map: HashMap::new(),
            next_object_id: 1,
            libraries: HashMap::new(),
            app_hold_guard: None,
            closures: Vec::new(),
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

        STATE.with(|state| f(&mut state.borrow_mut()))
    }

    pub fn get_library(&mut self, name: &str) -> anyhow::Result<&Library> {
        if !self.libraries.contains_key(name) {
            let lib_names: Vec<&str> = name.split(',').collect();
            let mut last_error = None;

            for lib_name in &lib_names {
                match unsafe { Library::open(Some(*lib_name), RTLD_NOW | RTLD_GLOBAL) } {
                    Ok(lib) => {
                        self.libraries
                            .insert(name.to_string(), ManuallyDrop::new(lib));
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
            .map(|lib| &**lib)
            .ok_or(anyhow::anyhow!("Library '{}' not loaded", name))
    }

    pub fn register_closure(&mut self, closure: glib::Closure) {
        self.closures.push(closure);
    }

    pub fn invalidate_all_closures(&mut self) {
        for closure in &self.closures {
            unsafe {
                let ptr: *mut gobject_ffi::GClosure = closure.to_glib_none().0;
                gobject_ffi::g_closure_invalidate(ptr);
            }
        }
        self.closures.clear();
    }
}
