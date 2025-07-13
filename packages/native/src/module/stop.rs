use std::sync::mpsc;

use gtk4::glib;
use neon::prelude::*;

use crate::state::ThreadState;

pub fn stop(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let (tx, rx) = mpsc::channel::<()>();

    // Schedule cleanup on the GTK4 main thread
    glib::idle_add_once(move || {
        ThreadState::with(|state| {
            // Release the application hold guard, allowing the app to terminate
            let _ = state.app_hold_guard.take().unwrap();
        });

        // Signal completion
        tx.send(()).unwrap();
    });

    // Wait for cleanup to complete
    rx.recv().unwrap();

    Ok(cx.undefined())
}
