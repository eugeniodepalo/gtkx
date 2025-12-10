//! Node.js libuv event loop integration.
//!
//! This module provides utilities for interacting with Node.js's libuv event
//! loop, which is necessary for proper async operation when blocking on the
//! GTK main thread.

use std::ffi::c_int;
use std::sync::mpsc::{Receiver, TryRecvError};

use neon::prelude::*;
use neon::sys::bindings as napi;

/// Opaque type representing a libuv event loop.
#[repr(C)]
pub struct UvLoop {
    _opaque: [u8; 0],
}

/// Run mode for libuv event loop iteration.
#[repr(C)]
#[allow(dead_code)]
pub enum UvRunMode {
    /// Run until no more active handles or requests.
    Default = 0,
    /// Run one iteration.
    Once = 1,
    /// Run one iteration without blocking.
    NoWait = 2,
}

unsafe extern "C" {
    fn napi_get_uv_event_loop(env: napi::Env, loop_: *mut *mut UvLoop) -> napi::Status;
    fn uv_run(loop_: *mut UvLoop, mode: UvRunMode) -> c_int;
}

/// Gets the libuv event loop from the Neon context.
///
/// # Panics
///
/// Panics if the N-API call fails (indicates a Node.js runtime error).
pub fn get_event_loop<'a, C: Context<'a>>(cx: &C) -> *mut UvLoop {
    let env = cx.to_raw();
    let mut uv_loop: *mut UvLoop = std::ptr::null_mut();
    let status = unsafe { napi_get_uv_event_loop(env, &mut uv_loop) };

    assert_eq!(
        status,
        napi::Status::Ok,
        "Failed to get uv event loop (N-API status: {:?}) - this indicates a Node.js runtime error",
        status
    );

    uv_loop
}

/// Runs one iteration of the event loop without blocking.
///
/// This processes any pending I/O events and returns immediately.
pub fn run_nowait(uv_loop: *mut UvLoop) {
    unsafe {
        uv_run(uv_loop, UvRunMode::NoWait);
    }
}

/// Waits for a result from a channel while pumping the event loop.
///
/// This function spins on the channel, running the libuv event loop in NoWait
/// mode between attempts. This allows JavaScript promises and other async
/// operations to make progress while waiting for the GTK thread.
///
/// # Panics
///
/// Panics if the channel is disconnected before receiving a result.
pub fn wait_for_result<T>(uv_loop: *mut UvLoop, rx: &Receiver<T>, error_message: &str) -> T {
    loop {
        match rx.try_recv() {
            Ok(result) => return result,
            Err(TryRecvError::Empty) => {
                run_nowait(uv_loop);
            }
            Err(TryRecvError::Disconnected) => {
                panic!("Channel disconnected: {}", error_message);
            }
        }
    }
}
