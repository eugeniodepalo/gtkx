mod common;

use std::ffi::c_void;
use std::ptr::NonNull;
use std::sync::{
    Arc,
    atomic::{AtomicBool, Ordering},
};

use gtk4::glib;
use gtk4::glib::translate::FromGlibPtrFull as _;
use gtk4::glib::value::ToValue as _;

use native::trampoline::{
    ClosureCallbackData, ClosureGuard, async_ready_trampoline, destroy_trampoline,
};

fn create_test_closure_with_flag(flag: Arc<AtomicBool>) -> NonNull<glib::gobject_ffi::GClosure> {
    common::ensure_gtk_init();

    let closure = glib::Closure::new(move |_| {
        flag.store(true, Ordering::SeqCst);
        None::<glib::Value>
    });

    use glib::translate::ToGlibPtr as _;
    let ptr: *mut glib::gobject_ffi::GClosure = closure.to_glib_full();
    std::mem::forget(closure);
    NonNull::new(ptr).expect("closure pointer should not be null")
}

#[test]
fn draw_func_trampoline_null_closure_safe() {
    common::ensure_gtk_init();

    unsafe {
        ClosureCallbackData::draw_func(
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            100,
            100,
            std::ptr::null_mut(),
        );
    }
}

#[test]
fn draw_func_trampoline_invokes_closure() {
    let invoked = Arc::new(AtomicBool::new(false));
    let closure_ptr = create_test_closure_with_flag(invoked.clone());

    let data = Box::new(ClosureCallbackData::new(closure_ptr));
    let data_ptr = Box::into_raw(data);

    unsafe {
        ClosureCallbackData::draw_func(
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            100,
            100,
            data_ptr as *mut c_void,
        );
    }

    assert!(invoked.load(Ordering::SeqCst));

    unsafe {
        ClosureCallbackData::release(data_ptr as *mut c_void);
    }
}

#[test]
fn destroy_trampoline_null_closure_safe() {
    common::ensure_gtk_init();

    unsafe {
        destroy_trampoline(std::ptr::null_mut());
    }
}

#[test]
fn destroy_trampoline_invokes_and_unrefs() {
    let invoked = Arc::new(AtomicBool::new(false));
    let closure_ptr = create_test_closure_with_flag(invoked.clone());

    unsafe {
        destroy_trampoline(closure_ptr.as_ptr() as *mut c_void);
    }

    assert!(invoked.load(Ordering::SeqCst));
}

#[test]
fn async_ready_trampoline_null_safe() {
    common::ensure_gtk_init();

    unsafe {
        async_ready_trampoline(
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
        );
    }
}

#[test]
fn get_trampoline_ptrs_not_null() {
    assert!((ClosureCallbackData::draw_func as *mut c_void) != std::ptr::null_mut());
    assert!((ClosureCallbackData::release as *mut c_void) != std::ptr::null_mut());
    assert!((ClosureCallbackData::shortcut_func as *mut c_void) != std::ptr::null_mut());
    assert!(
        (ClosureCallbackData::tree_list_model_create_func as *mut c_void) != std::ptr::null_mut()
    );
}

#[test]
fn shortcut_func_trampoline_null_safe() {
    common::ensure_gtk_init();

    unsafe {
        let result = ClosureCallbackData::shortcut_func(
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
        );
        assert_eq!(result, glib::ffi::GFALSE);
    }
}

fn create_bool_returning_closure(return_val: bool) -> NonNull<glib::gobject_ffi::GClosure> {
    common::ensure_gtk_init();

    let closure = glib::Closure::new(move |_| Some(return_val.to_value()));

    use glib::translate::ToGlibPtr as _;
    let ptr: *mut glib::gobject_ffi::GClosure = closure.to_glib_full();
    std::mem::forget(closure);
    NonNull::new(ptr).expect("closure pointer should not be null")
}

#[test]
fn shortcut_func_trampoline_invokes_closure_returns_true() {
    let closure_ptr = create_bool_returning_closure(true);

    let data = Box::new(ClosureCallbackData::new(closure_ptr));
    let data_ptr = Box::into_raw(data);

    unsafe {
        let result = ClosureCallbackData::shortcut_func(
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            data_ptr as *mut c_void,
        );
        assert_eq!(result, glib::ffi::GTRUE);

        ClosureCallbackData::release(data_ptr as *mut c_void);
    }
}

#[test]
fn shortcut_func_trampoline_invokes_closure_returns_false() {
    let closure_ptr = create_bool_returning_closure(false);

    let data = Box::new(ClosureCallbackData::new(closure_ptr));
    let data_ptr = Box::into_raw(data);

    unsafe {
        let result = ClosureCallbackData::shortcut_func(
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            data_ptr as *mut c_void,
        );
        assert_eq!(result, glib::ffi::GFALSE);

        ClosureCallbackData::release(data_ptr as *mut c_void);
    }
}

#[test]
fn callback_data_destroy_null_safe() {
    common::ensure_gtk_init();

    unsafe {
        ClosureCallbackData::release(std::ptr::null_mut());
    }
}

#[test]
fn callback_data_destroy_unrefs_closure() {
    let invoked = Arc::new(AtomicBool::new(false));
    let closure_ptr = create_test_closure_with_flag(invoked.clone());

    let data = Box::new(ClosureCallbackData::new(closure_ptr));
    let data_ptr = Box::into_raw(data);

    unsafe {
        ClosureCallbackData::release(data_ptr as *mut c_void);
    }
}

#[test]
fn tree_list_model_create_func_trampoline_null_safe() {
    common::ensure_gtk_init();

    unsafe {
        let result = ClosureCallbackData::tree_list_model_create_func(
            std::ptr::null_mut(),
            std::ptr::null_mut(),
        );
        assert!(result.is_null());
    }
}

fn create_object_returning_closure(return_object: bool) -> NonNull<glib::gobject_ffi::GClosure> {
    common::ensure_gtk_init();

    let closure = glib::Closure::new(move |_| {
        if return_object {
            let label: glib::Object = unsafe {
                let ptr =
                    gtk4::ffi::gtk_label_new(std::ptr::null()) as *mut glib::gobject_ffi::GObject;
                glib::gobject_ffi::g_object_ref_sink(ptr);
                glib::Object::from_glib_full(ptr)
            };
            Some(label.to_value())
        } else {
            Some(None::<glib::Object>.to_value())
        }
    });

    use glib::translate::ToGlibPtr as _;
    let ptr: *mut glib::gobject_ffi::GClosure = closure.to_glib_full();
    std::mem::forget(closure);
    NonNull::new(ptr).expect("closure pointer should not be null")
}

#[test]
fn tree_list_model_create_func_trampoline_invokes_closure_returns_null() {
    let closure_ptr = create_object_returning_closure(false);

    let data = Box::new(ClosureCallbackData::new(closure_ptr));
    let data_ptr = Box::into_raw(data);

    unsafe {
        let result = ClosureCallbackData::tree_list_model_create_func(
            std::ptr::null_mut(),
            data_ptr as *mut c_void,
        );
        assert!(result.is_null());

        ClosureCallbackData::release(data_ptr as *mut c_void);
    }
}

#[test]
fn tree_list_model_create_func_trampoline_invokes_closure_returns_object() {
    let closure_ptr = create_object_returning_closure(true);

    let data = Box::new(ClosureCallbackData::new(closure_ptr));
    let data_ptr = Box::into_raw(data);

    unsafe {
        let result = ClosureCallbackData::tree_list_model_create_func(
            std::ptr::null_mut(),
            data_ptr as *mut c_void,
        );
        assert!(!result.is_null());

        glib::gobject_ffi::g_object_unref(result as *mut _);

        ClosureCallbackData::release(data_ptr as *mut c_void);
    }
}

#[test]
fn tree_list_model_create_func_data_destroy_unrefs_closure() {
    let invoked = Arc::new(AtomicBool::new(false));
    let closure_ptr = create_test_closure_with_flag(invoked.clone());

    let data = Box::new(ClosureCallbackData::new(closure_ptr));
    let data_ptr = Box::into_raw(data);

    unsafe {
        ClosureCallbackData::release(data_ptr as *mut c_void);
    }
}

#[test]
fn closure_guard_refs_closure() {
    let closure_ptr = create_test_closure_with_flag(Arc::new(AtomicBool::new(false)));
    let initial_ref = common::get_closure_refcount(closure_ptr.as_ptr());

    let _guard = ClosureGuard::new(closure_ptr);

    let ref_after = common::get_closure_refcount(closure_ptr.as_ptr());
    assert_eq!(ref_after, initial_ref + 1);

    unsafe { glib::gobject_ffi::g_closure_unref(closure_ptr.as_ptr()) };
}

#[test]
fn closure_guard_unrefs_on_drop() {
    let closure_ptr = create_test_closure_with_flag(Arc::new(AtomicBool::new(false)));

    unsafe { glib::gobject_ffi::g_closure_ref(closure_ptr.as_ptr()) };
    let ref_with_extra = common::get_closure_refcount(closure_ptr.as_ptr());

    {
        let _guard = ClosureGuard::new(closure_ptr);
        assert_eq!(
            common::get_closure_refcount(closure_ptr.as_ptr()),
            ref_with_extra + 1
        );
    }

    assert_eq!(
        common::get_closure_refcount(closure_ptr.as_ptr()),
        ref_with_extra
    );

    unsafe {
        glib::gobject_ffi::g_closure_unref(closure_ptr.as_ptr());
        glib::gobject_ffi::g_closure_unref(closure_ptr.as_ptr());
    };
}

#[test]
fn closure_guard_from_ptr_with_valid_ptr() {
    let closure_ptr = create_test_closure_with_flag(Arc::new(AtomicBool::new(false)));
    let initial_ref = common::get_closure_refcount(closure_ptr.as_ptr());

    let guard = ClosureGuard::from_ptr(closure_ptr.as_ptr());

    assert!(guard.is_some());
    assert_eq!(
        common::get_closure_refcount(closure_ptr.as_ptr()),
        initial_ref + 1
    );

    drop(guard);
    assert_eq!(
        common::get_closure_refcount(closure_ptr.as_ptr()),
        initial_ref
    );

    unsafe { glib::gobject_ffi::g_closure_unref(closure_ptr.as_ptr()) };
}

#[test]
fn closure_guard_from_ptr_with_null_returns_none() {
    let guard = ClosureGuard::from_ptr(std::ptr::null_mut());
    assert!(guard.is_none());
}

#[test]
fn animation_target_func_trampoline_null_safe() {
    common::ensure_gtk_init();

    unsafe {
        ClosureCallbackData::animation_target_func(0.5, std::ptr::null_mut());
    }
}

#[test]
fn animation_target_func_trampoline_invokes_closure() {
    let invoked = Arc::new(AtomicBool::new(false));
    let closure_ptr = create_test_closure_with_flag(invoked.clone());

    let data = Box::new(ClosureCallbackData::new(closure_ptr));
    let data_ptr = Box::into_raw(data);

    unsafe {
        ClosureCallbackData::animation_target_func(0.75, data_ptr as *mut c_void);
    }

    assert!(invoked.load(Ordering::SeqCst));

    unsafe {
        ClosureCallbackData::release(data_ptr as *mut c_void);
    }
}

#[test]
fn scale_format_value_func_trampoline_null_safe() {
    common::ensure_gtk_init();

    unsafe {
        let result = ClosureCallbackData::scale_format_value_func(
            std::ptr::null_mut(),
            5.0,
            std::ptr::null_mut(),
        );
        assert!(result.is_null());
    }
}

fn create_string_returning_closure(
    return_str: &'static str,
) -> NonNull<glib::gobject_ffi::GClosure> {
    common::ensure_gtk_init();

    let closure = glib::Closure::new(move |_| Some(return_str.to_value()));

    use glib::translate::ToGlibPtr as _;
    let ptr: *mut glib::gobject_ffi::GClosure = closure.to_glib_full();
    std::mem::forget(closure);
    NonNull::new(ptr).expect("closure pointer should not be null")
}

#[test]
fn scale_format_value_func_trampoline_returns_string() {
    let closure_ptr = create_string_returning_closure("50%");

    let data = Box::new(ClosureCallbackData::new(closure_ptr));
    let data_ptr = Box::into_raw(data);

    unsafe {
        let result = ClosureCallbackData::scale_format_value_func(
            std::ptr::null_mut(),
            0.5,
            data_ptr as *mut c_void,
        );

        assert!(!result.is_null());

        let result_str = std::ffi::CStr::from_ptr(result).to_str().unwrap();
        assert_eq!(result_str, "50%");

        glib::ffi::g_free(result as *mut _);
        ClosureCallbackData::release(data_ptr as *mut c_void);
    }
}

#[test]
fn tick_callback_trampoline_null_safe() {
    common::ensure_gtk_init();

    unsafe {
        let result = ClosureCallbackData::tick_callback(
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
        );
        assert_eq!(result, glib::ffi::GFALSE);
    }
}

#[test]
fn tick_callback_trampoline_invokes_closure_returns_true() {
    let closure_ptr = create_bool_returning_closure(true);

    let data = Box::new(ClosureCallbackData::new(closure_ptr));
    let data_ptr = Box::into_raw(data);

    unsafe {
        let result = ClosureCallbackData::tick_callback(
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            data_ptr as *mut c_void,
        );
        assert_eq!(result, glib::ffi::GTRUE);

        ClosureCallbackData::release(data_ptr as *mut c_void);
    }
}

#[test]
fn tick_callback_trampoline_invokes_closure_returns_false() {
    let closure_ptr = create_bool_returning_closure(false);

    let data = Box::new(ClosureCallbackData::new(closure_ptr));
    let data_ptr = Box::into_raw(data);

    unsafe {
        let result = ClosureCallbackData::tick_callback(
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            data_ptr as *mut c_void,
        );
        assert_eq!(result, glib::ffi::GFALSE);

        ClosureCallbackData::release(data_ptr as *mut c_void);
    }
}
