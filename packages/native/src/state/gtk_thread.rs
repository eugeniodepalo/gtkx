use std::{
    cell::{OnceCell, RefCell},
    collections::HashMap,
};

use crate::object::Object;
use gtk4::gio;

pub struct GtkThreadState(RefCell<OnceCell<GtkThreadStateInner>>);

impl GtkThreadState {
    pub fn new() -> Self {
        Self(RefCell::new(OnceCell::new()))
    }

    pub fn with<F, R>(f: F) -> R
    where
        F: FnOnce(&mut GtkThreadStateInner) -> R,
    {
        GTK_THREAD_STATE.with(|state| {
            let mut inner = state.0.borrow_mut();

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

pub struct GtkThreadStateInner {
    pub library: libloading::Library,
    pub next_object_id: usize,
    pub object_map: HashMap<usize, Object>,
    pub app_hold_guard: Option<gio::ApplicationHoldGuard>,
}

thread_local! {
    static GTK_THREAD_STATE: GtkThreadState = GtkThreadState::new();
}
