//! GTK main loop shutdown.

use std::sync::mpsc;

use gtk4::glib;
use neon::prelude::*;

use crate::state::GtkThreadState;

/// Stops the GTK main loop.
///
/// JavaScript signature: `stop() => void`
///
/// Releases the application hold guard, allowing the GTK main loop to exit.
pub fn stop(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let (tx, rx) = mpsc::channel::<()>();

    glib::idle_add_once(move || {
        GtkThreadState::with(|state| {
            // Release the hold guard to allow GTK's main loop to exit
            state.app_hold_guard.take();
        });

        let _ = tx.send(());
    });

    rx.recv()
        .or_else(|err| cx.throw_error(format!("Error stopping GTK thread: {err}")))?;

    Ok(cx.undefined())
}
