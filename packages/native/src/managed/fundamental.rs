use std::ffi::c_void;

use super::OwnedPtr;

pub type UnrefFn = unsafe extern "C" fn(*mut c_void);
pub type RefFn = unsafe extern "C" fn(*mut c_void) -> *mut c_void;

#[derive(Debug)]
pub struct Fundamental {
    inner: OwnedPtr,
    ref_fn: Option<RefFn>,
    unref_fn: Option<UnrefFn>,
}

impl Fundamental {
    #[must_use]
    pub fn from_glib_full(
        ptr: *mut c_void,
        ref_fn: Option<RefFn>,
        unref_fn: Option<UnrefFn>,
    ) -> Self {
        Self {
            inner: OwnedPtr::from_full(ptr),
            ref_fn,
            unref_fn,
        }
    }

    #[must_use]
    #[allow(clippy::not_unsafe_ptr_arg_deref)]
    pub fn from_glib_none(
        ptr: *mut c_void,
        ref_fn: Option<RefFn>,
        unref_fn: Option<UnrefFn>,
    ) -> Self {
        if ptr.is_null() {
            return Self {
                inner: OwnedPtr::null(),
                ref_fn,
                unref_fn,
            };
        }

        // For copy-based types (like PangoAttribute), ref_fn returns a NEW pointer.
        // For ref-counted types, ref_fn returns the same pointer with incremented count.
        // In both cases, we must use the returned pointer.
        let owned_ptr = if let Some(do_ref) = ref_fn {
            unsafe { do_ref(ptr) }
        } else {
            ptr
        };

        Self {
            inner: OwnedPtr::from_full(owned_ptr),
            ref_fn,
            unref_fn,
        }
    }

    #[inline]
    #[must_use]
    pub fn as_ptr(&self) -> *mut c_void {
        self.inner.as_ptr()
    }

    #[must_use]
    pub fn is_owned(&self) -> bool {
        self.inner.is_owned()
    }
}

impl Clone for Fundamental {
    fn clone(&self) -> Self {
        if self.inner.is_null() {
            return Self {
                inner: OwnedPtr::null(),
                ref_fn: self.ref_fn,
                unref_fn: self.unref_fn,
            };
        }

        // For copy-based types (like PangoAttribute), ref_fn returns a NEW pointer.
        // For ref-counted types, ref_fn returns the same pointer with incremented count.
        // In both cases, we must use the returned pointer.
        let cloned_ptr = if let Some(ref_fn) = self.ref_fn {
            unsafe { ref_fn(self.inner.as_ptr()) }
        } else {
            self.inner.as_ptr()
        };

        Self {
            inner: OwnedPtr::from_full(cloned_ptr),
            ref_fn: self.ref_fn,
            unref_fn: self.unref_fn,
        }
    }
}

impl Drop for Fundamental {
    fn drop(&mut self) {
        if self.inner.should_free()
            && let Some(unref_fn) = self.unref_fn
        {
            unsafe { unref_fn(self.inner.as_ptr()) };
        }
    }
}
