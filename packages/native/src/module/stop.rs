//! Graceful GTK application shutdown.
//!
//! The [`stop`] function tears the runtime down in a single GLib-thread task
//! that runs while the main loop is still iterating, so any pending finalizer
//! work scheduled by [`crate::managed::NativeHandle`]'s drop runs before the
//! main loop exits.
//!
//! ## Shutdown Sequence
//!
//! 1. Mark the mailbox stopped, fencing further JS-side cleanup schedules.
//!    Subsequent JS-thread drops of [`crate::managed::NativeHandle`] hit the
//!    [`std::mem::forget`] branch instead of queuing onto a dying main loop.
//! 2. Drain all pending sources on the default main context, running queued
//!    cleanup callbacks while the `GLib` main loop is still alive.
//! 3. Release the application hold guard, allowing the main loop to exit.
//! 4. Join the `GLib` thread.
//!
//! JS handles that GC after the mark-stopped fence are intentionally leaked
//! via [`std::mem::forget`] — running `GLib` finalizers after the main loop
//! has exited can crash on libraries like `WebKit` that depend on the loop
//! for their own cleanup.

use gtk4::glib;
use napi::Env;
use napi_derive::napi;

use crate::dispatch::Mailbox;
use crate::state::{GtkThread, GtkThreadState};

#[napi]
pub fn stop(env: Env) -> napi::Result<()> {
    let mailbox = Mailbox::global();

    mailbox
        .dispatch_to_glib_and_wait(env, || {
            Mailbox::global().mark_stopped();
            drain_pending_sources();
            GtkThreadState::with(|state| {
                state.app_hold_guard.take();
            });
        })
        .map_err(|err| napi::Error::new(napi::Status::GenericFailure, err.to_string()))?;

    if let Some(panic_msg) = GtkThread::global().join() {
        return Err(napi::Error::new(
            napi::Status::GenericFailure,
            format!("GTK thread panicked: {panic_msg}"),
        ));
    }

    Ok(())
}

/// Repeatedly iterates the default main context until no more sources are
/// ready to dispatch. Runs all queued idle callbacks — including the
/// `glib::idle_add_once` finalizers scheduled by handle drops — while the
/// main loop is still iterating, so their `GLib` destructors execute before
/// the loop exits.
fn drain_pending_sources() {
    let context = glib::MainContext::default();
    while context.iteration(false) {}
}
