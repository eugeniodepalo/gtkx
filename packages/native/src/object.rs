use gtk4::glib;

mod boxed;

pub use boxed::*;

#[derive(Debug)]
pub enum Object {
    GObject(glib::Object),
    Boxed(Boxed),
}

impl Clone for Object {
    fn clone(&self) -> Self {
        match self {
            Object::GObject(obj) => Object::GObject(obj.clone()),
            Object::Boxed(boxed) => Object::Boxed(boxed.clone()),
        }
    }
}
