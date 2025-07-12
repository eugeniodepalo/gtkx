use std::ffi::c_void;

use gtk4::glib;
use gtk4::glib::object::ObjectType as _;
use neon::prelude::*;

use crate::object::Object;
use crate::state::GtkThreadState;

#[derive(Debug, Clone, Copy)]
pub struct ObjectId(pub usize);

impl ObjectId {
    pub fn new(object: Object) -> Self {
        GtkThreadState::with(|state| {
            let id = state.next_object_id;
            state.next_object_id += 1;
            state.object_map.insert(id, object.clone());
            ObjectId(id)
        })
    }

    pub fn as_ptr(&self) -> *mut c_void {
        GtkThreadState::with(|state| {
            let object = state.object_map.get(&self.0).unwrap();

            match object {
                Object::GObject(obj) => obj.as_ptr() as *mut c_void,
                Object::Boxed(boxed) => boxed.as_ptr(),
            }
        })
    }
}

impl Finalize for ObjectId {
    fn finalize<'a, C: Context<'a>>(self, _cx: &mut C) {
        glib::idle_add_once(move || {
            GtkThreadState::with(|state| {
                state.object_map.remove(&self.0);
            });
        });
    }
}
