use std::ffi::c_void;

use gtk4::glib;
use gtk4::glib::object::ObjectType as _;
use neon::prelude::*;

use crate::object::Object;
use crate::state::ThreadState;

#[derive(Debug, Clone, Copy)]
pub struct ObjectId(pub usize);

impl ObjectId {
    pub fn new(object: Object) -> Self {
        ThreadState::with(|state| {
            let id = state.next_object_id;
            state.next_object_id += 1;
            state.object_map.insert(id, object.clone());
            ObjectId(id)
        })
    }

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
    fn finalize<'a, C: Context<'a>>(self, _cx: &mut C) {
        glib::idle_add_once(move || {
            ThreadState::with(|state| {
                state.object_map.remove(&self.0);
            });
        });
    }
}
