//! Graceful GTK application shutdown.
//!
//! The [`stop`] function releases the application hold guard, marks the
//! dispatch queue as stopped, and joins the GLib thread.
//!
//! ## Shutdown Sequence
//!
//! 1. Dispatch a task to the GLib thread that releases the application hold guard
//! 2. Mark stopped to reject any further scheduled tasks
//! 3. Join the GLib thread, waiting for it to fully terminate
//!
//! Note: The handle map is intentionally NOT cleared during stop. Handles are
//! stored in thread-local storage and will be dropped when the GLib thread exits.
//! Clearing them earlier could cause use-after-free if signal closures are still
//! being processed by the main loop.

use neon::prelude::*;

use super::handler::{JsThreadCommand, execute_js_command};
use crate::{
    dispatch::Mailbox,
    state::{GtkThread, GtkThreadState},
};

struct StopCommand;

impl JsThreadCommand for StopCommand {
    fn from_js(_cx: &mut FunctionContext) -> NeonResult<Self> {
        Ok(Self)
    }

    fn execute<'a>(self, cx: &mut FunctionContext<'a>) -> JsResult<'a, JsValue> {
        let mailbox = Mailbox::global();

        mailbox
            .dispatch_to_glib_and_wait(cx, || {
                GtkThreadState::with(|state| {
                    state.app_hold_guard.take();
                });
            })
            .or_else(|err| cx.throw_error(err.to_string()))?;

        mailbox.mark_stopped();

        if let Some(panic_msg) = GtkThread::global().join() {
            return cx.throw_error(format!("GTK thread panicked: {panic_msg}"));
        }

        Ok(cx.undefined().upcast())
    }
}

pub fn stop(mut cx: FunctionContext) -> JsResult<JsValue> {
    execute_js_command::<StopCommand>(&mut cx)
}
