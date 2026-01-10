//! Graceful GTK application shutdown.
//!
//! The [`stop`] function releases the application hold guard, marks the
//! dispatch queue as stopped, and joins the GTK thread.
//!
//! ## Shutdown Sequence
//!
//! 1. Schedule a task on the GTK thread to:
//!    - Mark the dispatch queue as stopped (no new tasks accepted)
//!    - Clear the handle map (prevents callbacks during TLS destruction)
//!    - Release the application hold guard (allows GTK main loop to exit)
//! 2. Wait for confirmation that the task completed
//! 3. Join the GTK thread, waiting for it to fully terminate

use neon::prelude::*;

use crate::{
    gtk_dispatch,
    state::{GtkThread, GtkThreadState},
};

pub fn stop(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let rx = gtk_dispatch::GtkDispatcher::global().run_on_gtk_thread(|| {
        gtk_dispatch::GtkDispatcher::global().mark_stopped();

        let (old_handles, _guard) = GtkThreadState::with(|state| {
            let old_handles = std::mem::take(&mut state.handle_map);
            let guard = state.app_hold_guard.take();
            (old_handles, guard)
        });
        drop(old_handles);
    });

    rx.recv()
        .or_else(|err| cx.throw_error(format!("Error stopping GTK thread: {err}")))?;

    GtkThread::global().join();

    Ok(cx.undefined())
}
