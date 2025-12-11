//! Queue for FFI operations.
//!
//! This module provides a cross-thread queue for FFI operations.
//! Callbacks scheduled from the JS thread are dispatched on the GTK thread.
//! During signal handling, `dispatch_pending()` can process queued callbacks
//! without triggering the full GTK main loop iteration.

use std::collections::VecDeque;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};

use gtk4::glib;

type Callback = Box<dyn FnOnce() + Send + 'static>;

struct Queue {
    queue: Mutex<VecDeque<Callback>>,
    dispatch_scheduled: AtomicBool,
}

impl Queue {
    const fn new() -> Self {
        Self {
            queue: Mutex::new(VecDeque::new()),
            dispatch_scheduled: AtomicBool::new(false),
        }
    }

    fn push(&self, callback: Callback) {
        self.queue.lock().unwrap().push_back(callback);
    }

    fn pop(&self) -> Option<Callback> {
        self.queue.lock().unwrap().pop_front()
    }

    fn is_empty(&self) -> bool {
        self.queue.lock().unwrap().is_empty()
    }
}

static FFI_QUEUE: Queue = Queue::new();

/// Schedules a callback to be executed on the GTK thread.
///
/// The callback is added to a queue and will be dispatched either:
/// 1. By the GTK main loop via an idle source (normal path)
/// 2. By `dispatch_pending()` during signal handling (re-entrant path)
pub fn schedule<F>(callback: F)
where
    F: FnOnce() + Send + 'static,
{
    FFI_QUEUE.push(Box::new(callback));

    if FFI_QUEUE
        .dispatch_scheduled
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_ok()
    {
        glib::idle_add_once(dispatch_batch);
    }
}

fn dispatch_batch() {
    FFI_QUEUE.dispatch_scheduled.store(false, Ordering::Release);

    while let Some(callback) = FFI_QUEUE.pop() {
        callback();
    }

    if !FFI_QUEUE.is_empty()
        && FFI_QUEUE
            .dispatch_scheduled
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .is_ok()
    {
        glib::idle_add_once(dispatch_batch);
    }
}

/// Dispatches all pending FFI callbacks without processing other GTK events.
///
/// This is called from `wait_for_js_result` to process FFI callbacks that
/// were scheduled by JS during signal handling, without triggering the full
/// GTK main loop iteration.
///
/// Returns `true` if any callbacks were dispatched.
pub fn dispatch_pending() -> bool {
    let mut dispatched = false;

    while let Some(callback) = FFI_QUEUE.pop() {
        callback();
        dispatched = true;
    }

    dispatched
}
