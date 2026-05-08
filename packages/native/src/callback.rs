use gtk4::glib::{self, gobject_ffi, translate::FromGlibPtrNone as _};

#[derive(Debug)]
pub struct ClosureGuard {
    _closure: glib::Closure,
}

impl ClosureGuard {
    /// # Safety
    ///
    /// `closure` must be either null or point to a valid `GClosure`.
    #[must_use]
    pub fn from_ptr(closure: *mut gobject_ffi::GClosure) -> Option<Self> {
        if closure.is_null() {
            return None;
        }
        Some(Self {
            _closure: unsafe { glib::Closure::from_glib_none(closure) },
        })
    }
}
