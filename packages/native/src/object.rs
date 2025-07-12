//! Object Management
//!
//! This module provides safe wrapper types for GTK4 objects that can be passed
//! between threads and managed from JavaScript. It handles both GObject instances
//! and boxed types with proper reference counting and memory management.

use gtk4::glib;

mod boxed;

pub use boxed::*;

/// Represents a GTK4 object that can be safely managed from JavaScript.
///
/// This enum wraps both GObject instances (standard GTK4 objects) and boxed types
/// (simple structs that use GLib's boxed type system for memory management).
/// All objects are reference-counted and can be safely passed between threads.
#[derive(Debug)]
pub enum Object {
    /// A standard GTK4 GObject with automatic reference counting
    GObject(glib::Object),
    /// A boxed type managed by GLib's boxed type system
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
