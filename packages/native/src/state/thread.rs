use std::cell::RefCell;
use std::collections::HashMap;

use gtk4::gio::ApplicationHoldGuard;
use libloading::Library;

use crate::object::Object;

#[derive(Debug)]
pub struct ThreadState {
    pub object_map: HashMap<usize, Object>,
    pub next_object_id: usize,
    pub libraries: HashMap<String, Library>,
    pub app_hold_guard: Option<ApplicationHoldGuard>,
}

impl Default for ThreadState {
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
