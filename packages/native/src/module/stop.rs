//! GTK4 Application Termination
//!
//! This module provides the `stop` function that safely terminates a GTK4 application
//! and cleans up all associated resources including the application hold guard and
//! object references.

use std::sync::mpsc;

use gtk4::glib;
use neon::prelude::*;

use crate::state::ThreadState;

/// Stops a GTK4 application and cleans up associated resources.
///
/// This function safely terminates a GTK4 application that was previously started
/// with the `start` function. It removes the application from the object map,
/// releases the application hold guard, and ensures proper cleanup of all resources.
///
/// # Arguments
///
/// * `cx` - Function context from Neon providing access to JavaScript values
///
/// # Returns
///
/// Returns `JsUndefined` to indicate successful termination.
///
/// # Threading
///
/// The cleanup operation is scheduled to run on the GTK4 main thread using
/// `glib::idle_add_once` to ensure thread safety. The function blocks until
/// the cleanup is complete.
///
/// # Example
///
/// ```javascript
/// const appId = start("com.example.myapp");
/// // ... use the application ...
/// stop(); // Clean shutdown
/// ```
///
/// # Panics
///
/// This function will panic if:
/// - The provided ObjectId is not found in the object map
/// - The channel communication fails between threads
/// - The application hold guard is not present
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
