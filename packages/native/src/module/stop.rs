//! Graceful GTK application shutdown.
//!
//! The [`stop`] function releases the application hold guard, marks the
//! dispatch queue as stopped, and joins the GTK thread.
//!
//! ## Shutdown Sequence
//!
//! 1. Schedule a task on the GTK thread to release the application hold guard
//! 2. Wait for the task using the standard waiting pattern (processing callbacks)
//! 3. Mark stopped to reject any further scheduled tasks
//! 4. Join the GTK thread, waiting for it to fully terminate
//!
//! Note: The handle map is intentionally NOT cleared during stop. Handles are
//! stored in thread-local storage and will be dropped when the GTK thread exits.
//! Clearing them earlier could cause use-after-free if signal closures are still
//! being processed by the GTK main loop.

use neon::prelude::*;

use crate::{
    gtk_dispatch,
    state::{GtkThread, GtkThreadState},
};

pub fn stop(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let dispatcher = gtk_dispatch::GtkDispatcher::global();

    dispatcher.enter_js_wait();

    let rx = dispatcher.run_on_gtk_thread(|| {
        GtkThreadState::with(|state| {
            state.app_hold_guard.take();
        });
    });

    dispatcher
        .wait_for_gtk_result(&mut cx, &rx)
        .or_else(|err| cx.throw_error(err.to_string()))?;

    dispatcher.mark_stopped();

    GtkThread::global().join();

    Ok(cx.undefined())
}
