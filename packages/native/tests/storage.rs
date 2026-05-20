mod common;

use std::ffi::{CString, c_void};
use std::ptr::NonNull;
use std::sync::{
    Arc,
    atomic::{AtomicBool, Ordering},
};

use glib::translate::ToGlibPtr as _;
use gtk4::glib;
use native::ffi::{
    FfiStorage, FfiStorageKind, GArrayData, GByteArrayData, GListData, GSListData, HashTableData,
    StringGListData, StringGSListData,
};
use native::types::IntegerKind;

fn create_test_closure() -> NonNull<glib::gobject_ffi::GClosure> {
    common::ensure_gtk_init();

    let closure = glib::Closure::new(move |_| None::<glib::Value>);
    let ptr: *mut glib::gobject_ffi::GClosure = closure.to_glib_full();
    std::mem::forget(closure);
    NonNull::new(ptr).expect("closure pointer should not be null")
}

fn create_test_closure_with_flag(flag: Arc<AtomicBool>) -> NonNull<glib::gobject_ffi::GClosure> {
    common::ensure_gtk_init();

    let closure = glib::Closure::new(move |_| {
        flag.store(true, Ordering::SeqCst);
        None::<glib::Value>
    });
    let ptr: *mut glib::gobject_ffi::GClosure = closure.to_glib_full();
    std::mem::forget(closure);
    NonNull::new(ptr).expect("closure pointer should not be null")
}

#[test]
fn closure_storage_unrefs_on_drop() {
    let closure_ptr = create_test_closure();

    unsafe { glib::gobject_ffi::g_closure_ref(closure_ptr.as_ptr()) };
    let ref_before = common::get_closure_refcount(closure_ptr.as_ptr());

    {
        let _storage = FfiStorage::closure(closure_ptr.as_ptr());
    }

    let ref_after = common::get_closure_refcount(closure_ptr.as_ptr());
    assert_eq!(ref_after, ref_before - 1);

    unsafe { glib::gobject_ffi::g_closure_unref(closure_ptr.as_ptr()) };
}

#[test]
fn closure_storage_null_ptr_safe_on_drop() {
    {
        let _storage = FfiStorage::closure(std::ptr::null_mut());
    }
}

#[test]
fn closure_storage_ptr_returns_closure_ptr() {
    let closure_ptr = create_test_closure();

    let storage = FfiStorage::closure(closure_ptr.as_ptr());
    assert_eq!(storage.ptr(), closure_ptr.as_ptr() as *mut c_void);

    unsafe { glib::gobject_ffi::g_closure_unref(closure_ptr.as_ptr()) };
}

#[test]
fn closure_storage_kind_is_gclosure() {
    let closure_ptr = create_test_closure();

    let storage = FfiStorage::closure(closure_ptr.as_ptr());
    assert!(matches!(storage.kind(), FfiStorageKind::GClosure));

    unsafe { glib::gobject_ffi::g_closure_unref(closure_ptr.as_ptr()) };
}

#[test]
fn unit_storage_does_not_unref_closure() {
    let closure_ptr = create_test_closure();

    unsafe { glib::gobject_ffi::g_closure_ref(closure_ptr.as_ptr()) };
    let ref_before = common::get_closure_refcount(closure_ptr.as_ptr());

    {
        let _storage = FfiStorage::unit(closure_ptr.as_ptr() as *mut c_void);
    }

    let ref_after = common::get_closure_refcount(closure_ptr.as_ptr());
    assert_eq!(ref_after, ref_before);

    unsafe {
        glib::gobject_ffi::g_closure_unref(closure_ptr.as_ptr());
        glib::gobject_ffi::g_closure_unref(closure_ptr.as_ptr());
    };
}

#[test]
fn hashtable_storage_unrefs_on_drop() {
    common::run(|| {
        let hash_table = unsafe {
            glib::ffi::g_hash_table_new_full(
                Some(glib::ffi::g_direct_hash),
                Some(glib::ffi::g_direct_equal),
                None,
                None,
            )
        };

        unsafe { glib::ffi::g_hash_table_ref(hash_table) };

        {
            let _storage = FfiStorage::new(
                hash_table as *mut c_void,
                FfiStorageKind::HashTable(HashTableData {
                    handle: hash_table,
                    should_free: true,
                }),
            );
        }

        unsafe { glib::ffi::g_hash_table_unref(hash_table) };
    });
}

#[test]
fn hashtable_storage_null_handle_safe_on_drop() {
    {
        let _storage = FfiStorage::new(
            std::ptr::null_mut(),
            FfiStorageKind::HashTable(HashTableData {
                handle: std::ptr::null_mut(),
                should_free: true,
            }),
        );
    }
}

#[test]
fn multiple_closures_all_unreffed() {
    let closures: Vec<_> = (0..5).map(|_| create_test_closure()).collect();

    for closure_ptr in &closures {
        unsafe { glib::gobject_ffi::g_closure_ref(closure_ptr.as_ptr()) };
    }

    let refs_before: Vec<_> = closures
        .iter()
        .map(|c| common::get_closure_refcount(c.as_ptr()))
        .collect();

    {
        let storages: Vec<_> = closures
            .iter()
            .map(|c| FfiStorage::closure(c.as_ptr()))
            .collect();
        drop(storages);
    }

    for (i, closure_ptr) in closures.iter().enumerate() {
        let ref_after = common::get_closure_refcount(closure_ptr.as_ptr());
        assert_eq!(ref_after, refs_before[i] - 1);
        unsafe { glib::gobject_ffi::g_closure_unref(closure_ptr.as_ptr()) };
    }
}

#[test]
fn closure_with_captured_state_properly_cleaned_up() {
    let flag = Arc::new(AtomicBool::new(false));
    let closure_ptr = create_test_closure_with_flag(flag.clone());

    {
        let storage = FfiStorage::closure(closure_ptr.as_ptr());

        unsafe {
            glib::gobject_ffi::g_closure_invoke(
                closure_ptr.as_ptr(),
                std::ptr::null_mut(),
                0,
                std::ptr::null(),
                std::ptr::null_mut(),
            );
        }

        assert!(flag.load(Ordering::SeqCst));
        drop(storage);
    }
}

#[test]
fn unit_storage_carries_provided_pointer() {
    let ptr = std::ptr::without_provenance_mut::<c_void>(0x10);
    let storage = FfiStorage::unit(ptr);
    assert_eq!(storage.ptr(), ptr);
    assert!(matches!(storage.kind(), FfiStorageKind::Unit));
}

#[test]
fn storage_ptr_ref_borrows_the_pointer() {
    let storage: FfiStorage = vec![1u8].into();
    assert_eq!(*storage.ptr_ref(), storage.ptr());
}

#[test]
fn as_numeric_slice_matches_every_integer_kind() {
    let cases: [(IntegerKind, FfiStorage); 8] = [
        (IntegerKind::U8, vec![1u8, 2].into()),
        (IntegerKind::I8, vec![-1i8, 2].into()),
        (IntegerKind::U16, vec![1u16, 2].into()),
        (IntegerKind::I16, vec![-1i16, 2].into()),
        (IntegerKind::U32, vec![1u32, 2].into()),
        (IntegerKind::I32, vec![-1i32, 2].into()),
        (IntegerKind::U64, vec![1u64, 2].into()),
        (IntegerKind::I64, vec![-1i64, 2].into()),
    ];
    for (kind, storage) in &cases {
        let slice = storage.as_numeric_slice(*kind).expect("kind should match");
        assert_eq!(slice.len(), 2);
    }
}

#[test]
fn as_numeric_slice_rejects_mismatched_kind() {
    let storage: FfiStorage = vec![1u8].into();
    assert!(storage.as_numeric_slice(IntegerKind::I64).is_err());
}

#[test]
fn as_f32_slice_success_and_mismatch() {
    let f32_storage: FfiStorage = vec![1.0f32, 2.0].into();
    assert_eq!(f32_storage.as_f32_slice().unwrap(), &[1.0f32, 2.0]);

    let other: FfiStorage = vec![1u8].into();
    assert!(other.as_f32_slice().is_err());
}

#[test]
fn as_f64_slice_success_and_mismatch() {
    let f64_storage: FfiStorage = vec![1.0f64, 2.0].into();
    assert_eq!(f64_storage.as_f64_slice().unwrap(), &[1.0f64, 2.0]);

    let other: FfiStorage = vec![1u8].into();
    assert!(other.as_f64_slice().is_err());
}

#[test]
fn as_cstring_array_success_and_mismatch() {
    let strings = vec![CString::new("a").unwrap()];
    let ptrs: Vec<*mut c_void> = strings.iter().map(|s| s.as_ptr() as *mut c_void).collect();
    let storage = FfiStorage::new(
        ptrs.as_ptr() as *mut c_void,
        FfiStorageKind::StringArray(strings, ptrs),
    );
    assert_eq!(storage.as_cstring_array().unwrap().len(), 1);

    let other: FfiStorage = vec![1u8].into();
    assert!(other.as_cstring_array().is_err());
}

#[test]
fn as_bool_slice_success_and_mismatch() {
    let bool_storage: FfiStorage = vec![1i32, 0].into();
    assert_eq!(bool_storage.as_bool_slice().unwrap(), &[1i32, 0]);

    let other: FfiStorage = vec![1u8].into();
    assert!(other.as_bool_slice().is_err());
}

#[test]
fn as_object_array_success_and_mismatch() {
    let handles: Vec<native::NativeHandle> = Vec::new();
    let ptrs: Vec<*mut c_void> = Vec::new();
    let storage = FfiStorage::new(
        std::ptr::null_mut(),
        FfiStorageKind::ObjectArray(handles, ptrs),
    );
    assert!(storage.as_object_array().unwrap().is_empty());

    let other: FfiStorage = vec![1u8].into();
    assert!(other.as_object_array().is_err());
}

#[test]
fn from_vec_covers_every_integer_and_float_type() {
    let u8s: FfiStorage = vec![1u8].into();
    assert!(matches!(u8s.kind(), FfiStorageKind::U8Vec(_)));
    let i8s: FfiStorage = vec![1i8].into();
    assert!(matches!(i8s.kind(), FfiStorageKind::I8Vec(_)));
    let u16s: FfiStorage = vec![1u16].into();
    assert!(matches!(u16s.kind(), FfiStorageKind::U16Vec(_)));
    let i16s: FfiStorage = vec![1i16].into();
    assert!(matches!(i16s.kind(), FfiStorageKind::I16Vec(_)));
    let u32s: FfiStorage = vec![1u32].into();
    assert!(matches!(u32s.kind(), FfiStorageKind::U32Vec(_)));
    let i32s: FfiStorage = vec![1i32].into();
    assert!(matches!(i32s.kind(), FfiStorageKind::I32Vec(_)));
    let u64s: FfiStorage = vec![1u64].into();
    assert!(matches!(u64s.kind(), FfiStorageKind::U64Vec(_)));
    let i64s: FfiStorage = vec![1i64].into();
    assert!(matches!(i64s.kind(), FfiStorageKind::I64Vec(_)));
    let f32s: FfiStorage = vec![1.0f32].into();
    assert!(matches!(f32s.kind(), FfiStorageKind::F32Vec(_)));
    let f64s: FfiStorage = vec![1.0f64].into();
    assert!(matches!(f64s.kind(), FfiStorageKind::F64Vec(_)));
}

#[test]
fn drop_no_op_kinds_do_not_crash() {
    let unit = FfiStorage::unit(std::ptr::null_mut());
    drop(unit);
    let cstring = FfiStorage::new(
        std::ptr::null_mut(),
        FfiStorageKind::CString(CString::new("x").unwrap()),
    );
    drop(cstring);
    let buffer = FfiStorage::new(std::ptr::null_mut(), FfiStorageKind::Buffer(vec![1u8]));
    drop(buffer);
    let boxed = FfiStorage::new(
        std::ptr::null_mut(),
        FfiStorageKind::BoxedValue(Box::new(native::ffi::FfiValue::Void)),
    );
    drop(boxed);
    let ptr_storage = FfiStorage::new(
        std::ptr::null_mut(),
        FfiStorageKind::PtrStorage(Box::new(std::ptr::null_mut())),
    );
    drop(ptr_storage);
}

#[test]
fn glist_storage_frees_when_should_free() {
    common::run(|| {
        let list = unsafe {
            glib::ffi::g_list_append(std::ptr::null_mut(), std::ptr::without_provenance_mut(1))
        };
        {
            let _storage = FfiStorage::new(
                list as *mut c_void,
                FfiStorageKind::GList(GListData {
                    handles: Vec::new(),
                    list_ptr: list,
                    should_free: true,
                }),
            );
        }
    });
}

#[test]
fn glist_storage_keeps_when_not_freed() {
    common::run(|| {
        let list = unsafe {
            glib::ffi::g_list_append(std::ptr::null_mut(), std::ptr::without_provenance_mut(1))
        };
        {
            let _storage = FfiStorage::new(
                list as *mut c_void,
                FfiStorageKind::GList(GListData {
                    handles: Vec::new(),
                    list_ptr: list,
                    should_free: false,
                }),
            );
        }
        let len = unsafe { glib::ffi::g_list_length(list) };
        assert_eq!(len, 1);
        unsafe { glib::ffi::g_list_free(list) };
    });
}

#[test]
fn glist_storage_null_ptr_safe_on_drop() {
    let _storage = FfiStorage::new(
        std::ptr::null_mut(),
        FfiStorageKind::GList(GListData {
            handles: Vec::new(),
            list_ptr: std::ptr::null_mut(),
            should_free: true,
        }),
    );
}

#[test]
fn gslist_storage_frees_when_should_free() {
    common::run(|| {
        let list = unsafe {
            glib::ffi::g_slist_append(std::ptr::null_mut(), std::ptr::without_provenance_mut(1))
        };
        {
            let _storage = FfiStorage::new(
                list as *mut c_void,
                FfiStorageKind::GSList(GSListData {
                    handles: Vec::new(),
                    list_ptr: list,
                    should_free: true,
                }),
            );
        }
    });
}

#[test]
fn gslist_storage_keeps_when_not_freed() {
    common::run(|| {
        let list = unsafe {
            glib::ffi::g_slist_append(std::ptr::null_mut(), std::ptr::without_provenance_mut(1))
        };
        {
            let _storage = FfiStorage::new(
                list as *mut c_void,
                FfiStorageKind::GSList(GSListData {
                    handles: Vec::new(),
                    list_ptr: list,
                    should_free: false,
                }),
            );
        }
        unsafe { glib::ffi::g_slist_free(list) };
    });
}

#[test]
fn gslist_storage_null_ptr_safe_on_drop() {
    let _storage = FfiStorage::new(
        std::ptr::null_mut(),
        FfiStorageKind::GSList(GSListData {
            handles: Vec::new(),
            list_ptr: std::ptr::null_mut(),
            should_free: true,
        }),
    );
}

#[test]
fn garray_storage_unrefs_when_should_free() {
    common::run(|| {
        let array = unsafe { glib::ffi::g_array_sized_new(0, 0, size_of::<i32>() as u32, 0) };
        {
            let _storage = FfiStorage::new(
                array as *mut c_void,
                FfiStorageKind::GArray(GArrayData {
                    array_ptr: array,
                    should_free: true,
                }),
            );
        }
    });
}

#[test]
fn garray_storage_keeps_when_not_freed() {
    common::run(|| {
        let array = unsafe { glib::ffi::g_array_sized_new(0, 0, size_of::<i32>() as u32, 0) };
        {
            let _storage = FfiStorage::new(
                array as *mut c_void,
                FfiStorageKind::GArray(GArrayData {
                    array_ptr: array,
                    should_free: false,
                }),
            );
        }
        unsafe { glib::ffi::g_array_unref(array) };
    });
}

#[test]
fn garray_storage_null_ptr_safe_on_drop() {
    let _storage = FfiStorage::new(
        std::ptr::null_mut(),
        FfiStorageKind::GArray(GArrayData {
            array_ptr: std::ptr::null_mut(),
            should_free: true,
        }),
    );
}

#[test]
fn gbytearray_storage_unrefs_when_should_free() {
    common::run(|| {
        let array = unsafe { glib::ffi::g_byte_array_sized_new(0) };
        {
            let _storage = FfiStorage::new(
                array as *mut c_void,
                FfiStorageKind::GByteArray(GByteArrayData {
                    array_ptr: array,
                    should_free: true,
                }),
            );
        }
    });
}

#[test]
fn gbytearray_storage_keeps_when_not_freed() {
    common::run(|| {
        let array = unsafe { glib::ffi::g_byte_array_sized_new(0) };
        {
            let _storage = FfiStorage::new(
                array as *mut c_void,
                FfiStorageKind::GByteArray(GByteArrayData {
                    array_ptr: array,
                    should_free: false,
                }),
            );
        }
        unsafe { glib::ffi::g_byte_array_unref(array) };
    });
}

#[test]
fn gbytearray_storage_null_ptr_safe_on_drop() {
    let _storage = FfiStorage::new(
        std::ptr::null_mut(),
        FfiStorageKind::GByteArray(GByteArrayData {
            array_ptr: std::ptr::null_mut(),
            should_free: true,
        }),
    );
}

#[test]
fn hashtable_storage_keeps_when_not_freed() {
    common::run(|| {
        let hash_table = unsafe {
            glib::ffi::g_hash_table_new_full(
                Some(glib::ffi::g_direct_hash),
                Some(glib::ffi::g_direct_equal),
                None,
                None,
            )
        };
        {
            let _storage = FfiStorage::new(
                hash_table as *mut c_void,
                FfiStorageKind::HashTable(HashTableData {
                    handle: hash_table,
                    should_free: false,
                }),
            );
        }
        unsafe { glib::ffi::g_hash_table_unref(hash_table) };
    });
}

fn build_string_glist(strings: &[CString], dup: bool) -> *mut glib::ffi::GList {
    let mut list: *mut glib::ffi::GList = std::ptr::null_mut();
    for s in strings {
        let ptr = if dup {
            unsafe { glib::ffi::g_strdup(s.as_ptr()) as *mut c_void }
        } else {
            s.as_ptr() as *mut c_void
        };
        list = unsafe { glib::ffi::g_list_append(list, ptr) };
    }
    list
}

#[test]
fn string_glist_storage_frees_duped_elements() {
    common::run(|| {
        let strings = vec![CString::new("a").unwrap(), CString::new("b").unwrap()];
        let list = build_string_glist(&strings, true);
        {
            let _storage = FfiStorage::new(
                list as *mut c_void,
                FfiStorageKind::StringGList(StringGListData {
                    strings,
                    list_ptr: list,
                    should_free: true,
                    elements_duped: true,
                }),
            );
        }
    });
}

#[test]
fn string_glist_storage_frees_shallow_when_not_duped() {
    common::run(|| {
        let strings = vec![CString::new("a").unwrap()];
        let list = build_string_glist(&strings, false);
        {
            let _storage = FfiStorage::new(
                list as *mut c_void,
                FfiStorageKind::StringGList(StringGListData {
                    strings,
                    list_ptr: list,
                    should_free: true,
                    elements_duped: false,
                }),
            );
        }
    });
}

#[test]
fn string_glist_storage_keeps_when_not_freed() {
    common::run(|| {
        let strings = vec![CString::new("a").unwrap()];
        let list = build_string_glist(&strings, false);
        {
            let _storage = FfiStorage::new(
                list as *mut c_void,
                FfiStorageKind::StringGList(StringGListData {
                    strings,
                    list_ptr: list,
                    should_free: false,
                    elements_duped: false,
                }),
            );
        }
        unsafe { glib::ffi::g_list_free(list) };
    });
}

#[test]
fn string_glist_storage_null_ptr_safe_on_drop() {
    let _storage = FfiStorage::new(
        std::ptr::null_mut(),
        FfiStorageKind::StringGList(StringGListData {
            strings: Vec::new(),
            list_ptr: std::ptr::null_mut(),
            should_free: true,
            elements_duped: true,
        }),
    );
}

fn build_string_gslist(strings: &[CString], dup: bool) -> *mut glib::ffi::GSList {
    let mut list: *mut glib::ffi::GSList = std::ptr::null_mut();
    for s in strings.iter().rev() {
        let ptr = if dup {
            unsafe { glib::ffi::g_strdup(s.as_ptr()) as *mut c_void }
        } else {
            s.as_ptr() as *mut c_void
        };
        list = unsafe { glib::ffi::g_slist_prepend(list, ptr) };
    }
    list
}

#[test]
fn string_gslist_storage_frees_duped_elements() {
    common::run(|| {
        let strings = vec![CString::new("a").unwrap(), CString::new("b").unwrap()];
        let list = build_string_gslist(&strings, true);
        {
            let _storage = FfiStorage::new(
                list as *mut c_void,
                FfiStorageKind::StringGSList(StringGSListData {
                    strings,
                    list_ptr: list,
                    should_free: true,
                    elements_duped: true,
                }),
            );
        }
    });
}

#[test]
fn string_gslist_storage_frees_shallow_when_not_duped() {
    common::run(|| {
        let strings = vec![CString::new("a").unwrap()];
        let list = build_string_gslist(&strings, false);
        {
            let _storage = FfiStorage::new(
                list as *mut c_void,
                FfiStorageKind::StringGSList(StringGSListData {
                    strings,
                    list_ptr: list,
                    should_free: true,
                    elements_duped: false,
                }),
            );
        }
    });
}

#[test]
fn string_gslist_storage_keeps_when_not_freed() {
    common::run(|| {
        let strings = vec![CString::new("a").unwrap()];
        let list = build_string_gslist(&strings, false);
        {
            let _storage = FfiStorage::new(
                list as *mut c_void,
                FfiStorageKind::StringGSList(StringGSListData {
                    strings,
                    list_ptr: list,
                    should_free: false,
                    elements_duped: false,
                }),
            );
        }
        unsafe { glib::ffi::g_slist_free(list) };
    });
}

#[test]
fn string_gslist_storage_null_ptr_safe_on_drop() {
    let _storage = FfiStorage::new(
        std::ptr::null_mut(),
        FfiStorageKind::StringGSList(StringGSListData {
            strings: Vec::new(),
            list_ptr: std::ptr::null_mut(),
            should_free: true,
            elements_duped: true,
        }),
    );
}

#[test]
fn storage_debug_renders_kind() {
    let storage: FfiStorage = vec![1u8].into();
    assert!(format!("{storage:?}").contains("FfiStorage"));
}
