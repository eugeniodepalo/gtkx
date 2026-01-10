//! Graceful GTK application shutdown.
//!
//! The [`stop`] function releases the application hold guard, marks the
//! dispatch queue as stopped, and joins the GTK thread.
//!
//! ## Shutdown Sequence
//!
//! 1. Mark stopped immediately on the JS thread (prevents new signal callbacks)
//! 2. Schedule a task on the GTK thread to release the application hold guard
//! 3. Wait for confirmation that the task completed
//! 4. Join the GTK thread, waiting for it to fully terminate
//!
//! Note: The handle map is intentionally NOT cleared during stop. Handles are
//! stored in thread-local storage and will be dropped when the GTK thread exits.
//! Clearing them earlier could cause use-after-free if signal closures are still
//! being processed by the GTK main loop.
//!
//! Note: We mark stopped BEFORE scheduling the cleanup task. This ensures that
//! any signal closures that fire during the cleanup see the stopped flag and
//! return early, avoiding deadlocks where the closure tries to invoke_and_wait
//! while JS is blocked waiting for GTK to finish.

use neon::prelude::*;

use crate::{
    gtk_dispatch,
    state::{GtkThread, GtkThreadState},
};

pub fn stop(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    gtk_dispatch::GtkDispatcher::global().mark_stopped();

    let rx = gtk_dispatch::GtkDispatcher::global().run_on_gtk_thread(|| {
        GtkThreadState::with(|state| {
            state.app_hold_guard.take();
        });
    });

    rx.recv()
        .or_else(|err| cx.throw_error(format!("Error stopping GTK thread: {err}")))?;

    GtkThread::global().join();

    Ok(cx.undefined())
}
