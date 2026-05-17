//! Cross-thread message dispatch between the JavaScript and `GLib` threads.
//!
//! This module owns the JS↔GLib bridge as a single [`Mailbox`] singleton that
//! exposes two queues:
//!
//! - `glib_inbox`: tasks pushed by the JS thread for execution on the `GLib` thread.
//! - `node_inbox`: callbacks pushed by the `GLib` thread for execution in the JS context.
//!
//! Each thread parks on its own wake signal while waiting for a response.
//! Re-entrance falls out of the call stack: while a thread is parked waiting for
//! a response from the other side, the wait loop also services any incoming
//! requests on its own inbox. Cross-boundary calls therefore nest naturally
//! to arbitrary depth without any explicit driver state, depth counter, or
//! correlation id.
//!
//! The [`Mailbox`] methods that cross into the JavaScript runtime — invoking JS
//! callbacks, converting values through a [`napi::Env`], and the wake
//! threadsafe function — live in the [`js_bridge`] submodule.
//!
//! ## Freeze mode
//!
//! React's commit phase brackets a batch of mutations with [`Mailbox::freeze`] /
//! [`Mailbox::unfreeze`]. While frozen, the `GLib` thread runs a tight loop
//! (`run_freeze_loop`) that drains incoming tasks without yielding to the `GLib`
//! main loop, ensuring the frame clock cannot fire mid-commit. Nested freeze
//! pairs are no-ops; only the outermost pair starts and stops the loop.
//!
//! ## Lifecycle
//!
//! [`Mailbox::mark_stopped`] is set during the orchestrated shutdown task,
//! after which new tasks are silently dropped so callers blocked in
//! [`Mailbox::dispatch_to_glib_and_wait`] do not deadlock waiting on a
//! result from the dying main loop.

mod js_bridge;

use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, OnceLock, mpsc};

use gtk4::glib;
use napi::threadsafe_function::ThreadsafeFunction;
use napi::{JsFunction, Status};

use crate::value::{JsRef, Value};
use crate::wait_signal::WaitSignal;

type GlibTask = Box<dyn FnOnce() + Send + 'static>;

pub type WakeJsTsfn = ThreadsafeFunction<(), (), (), Status, false, true>;

struct NodeCallback {
    callback: Arc<JsRef<JsFunction>>,
    args: Vec<Value>,
    capture_result: bool,
    result_tx: mpsc::Sender<anyhow::Result<Value>>,
}

/// Bidirectional message queues coordinating the JS and `GLib` threads.
///
/// Holds two inboxes — one for tasks bound for the `GLib` thread, one for
/// callbacks bound for the JS thread — plus the wake primitives that park
/// each thread when its inbox is empty.
pub struct Mailbox {
    glib_inbox: Mutex<VecDeque<GlibTask>>,
    node_inbox: Mutex<VecDeque<NodeCallback>>,

    wake_js: WaitSignal,
    wake_glib: WaitSignal,

    wake_js_tsfn: OnceLock<Arc<WakeJsTsfn>>,

    stopped: AtomicBool,

    freeze_depth: AtomicUsize,
    freeze_loop_active: AtomicBool,
    freeze_wake: WaitSignal,
}

impl std::fmt::Debug for Mailbox {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Mailbox")
            .field("stopped", &self.stopped)
            .field("freeze_depth", &self.freeze_depth)
            .finish_non_exhaustive()
    }
}

static MAILBOX: OnceLock<Mailbox> = OnceLock::new();

impl Mailbox {
    /// Returns the global mailbox singleton, initializing it on first access.
    pub fn global() -> &'static Self {
        MAILBOX.get_or_init(Self::new)
    }

    fn new() -> Self {
        Self {
            glib_inbox: Mutex::new(VecDeque::new()),
            node_inbox: Mutex::new(VecDeque::new()),
            wake_js: WaitSignal::new(),
            wake_glib: WaitSignal::new(),
            wake_js_tsfn: OnceLock::new(),
            stopped: AtomicBool::new(false),
            freeze_depth: AtomicUsize::new(0),
            freeze_loop_active: AtomicBool::new(false),
            freeze_wake: WaitSignal::new(),
        }
    }

    /// Marks the mailbox as shut down. Subsequent `dispatch_to_glib*` calls become no-ops.
    pub fn mark_stopped(&self) {
        self.stopped.store(true, Ordering::Release);
        self.wake_js.notify();
        self.wake_glib.notify();
    }

    /// Clears the stopped flag so the mailbox accepts tasks again. Intended
    /// for tests that need to restore the mailbox to a fresh state after
    /// exercising the shutdown path.
    pub fn reset_for_test(&self) {
        self.stopped.store(false, Ordering::Release);
    }

    /// Returns whether the mailbox has been shut down.
    pub fn is_stopped(&self) -> bool {
        self.stopped.load(Ordering::Acquire)
    }

    /// Increments the freeze depth. Returns true if this was the outermost call.
    pub fn freeze(&self) -> bool {
        self.freeze_depth.fetch_add(1, Ordering::AcqRel) == 0
    }

    /// Decrements the freeze depth. Wakes the freeze loop when depth reaches zero.
    pub fn unfreeze(&self) {
        if self.freeze_depth.fetch_sub(1, Ordering::AcqRel) == 1 {
            self.freeze_wake.notify();
        }
    }

    /// Drains all currently-queued `GLib` tasks until [`Self::unfreeze`] resets
    /// the freeze depth to zero. Runs on the `GLib` thread without yielding to
    /// the `GLib` main loop, preventing the frame clock from firing between
    /// individual mutations during a React commit.
    pub fn run_freeze_loop(&self) {
        self.freeze_loop_active.store(true, Ordering::Release);
        loop {
            self.dispatch_pending();
            if self.freeze_depth.load(Ordering::Acquire) == 0 {
                break;
            }
            self.freeze_wake.wait();
        }
        self.freeze_loop_active.store(false, Ordering::Release);
        self.dispatch_pending();
    }

    fn push_glib_task(&self, task: GlibTask) {
        self.glib_inbox
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .push_back(task);
        if self.freeze_loop_active.load(Ordering::Acquire) {
            self.freeze_wake.notify();
        }
        self.wake_glib.notify();
    }

    fn pop_glib_task(&self) -> Option<GlibTask> {
        self.glib_inbox
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .pop_front()
    }

    /// Pushes a fire-and-forget task onto the `GLib` inbox. The task runs on the
    /// `GLib` thread the next time the inbox is drained — either by the `GLib`
    /// main loop's idle source, by the freeze loop, or by another thread's
    /// wait loop dispatching pending tasks.
    pub fn schedule_glib(&self, task: Box<dyn FnOnce() + Send + 'static>) {
        if self.stopped.load(Ordering::Acquire) {
            return;
        }

        self.push_glib_task(task);

        if self.freeze_loop_active.load(Ordering::Acquire) {
            return;
        }

        glib::idle_add_full(glib::Priority::HIGH_IDLE, || {
            Self::global().dispatch_pending();
            glib::ControlFlow::Break
        });
    }

    /// Wakes the JS thread if it is parked in `wait_for_glib_result`.
    ///
    /// Callers running long-lived `GLib` tasks (e.g. the freeze loop, which does
    /// not return until [`Self::unfreeze`] is called) must invoke this after
    /// signalling their `Receiver` so the JS thread observes the value rather
    /// than blocking forever — the standard wake-after-drain in
    /// [`Self::dispatch_pending`] only fires once the task closure returns.
    pub fn notify_js(&self) {
        self.wake_js.notify();
    }

    /// Drains all queued `GLib` tasks. Returns whether any were executed.
    /// Intended to run on the `GLib` thread.
    pub fn dispatch_pending(&self) -> bool {
        let mut dispatched = false;

        while let Some(task) = self.pop_glib_task() {
            task();
            dispatched = true;
        }

        if dispatched {
            self.wake_js.notify();
        }

        dispatched
    }
}

/// Returned by [`Mailbox::dispatch_to_glib_and_wait`] when the underlying
/// result channel is dropped before producing a value, typically because the
/// `GLib` thread is shutting down.
#[derive(Debug, Clone, Copy)]
pub struct GlibDisconnectedError;

impl std::fmt::Display for GlibDisconnectedError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "GLib thread disconnected")
    }
}

impl std::error::Error for GlibDisconnectedError {}
