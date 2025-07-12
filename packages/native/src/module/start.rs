//! GTK4 Application Initialization
//!
//! This module provides the `start` function that initializes a GTK4 application
//! in a separate thread and returns an object ID that can be used to reference
//! the application from JavaScript.

use std::sync::mpsc;

use gtk4::prelude::*;
use neon::prelude::*;

use crate::{
    object::Object,
    state::{ObjectId, ThreadState},
};

/// Starts a GTK4 application in a separate thread.
///
/// This function creates a new GTK4 application with the specified application ID,
/// spawns a dedicated thread for the GTK4 main loop, and returns an object ID
/// that can be used to reference the application from JavaScript.
///
/// # Arguments
///
/// * `cx` - Function context from Neon providing access to JavaScript values
///   - `app_id` - JavaScript string containing the GTK4 application ID
///
/// # Returns
///
/// Returns a `JsValue` containing a boxed `ObjectId` that represents the GTK4
/// application instance. This ID can be used in subsequent calls to interact
/// with the application.
///
/// # Threading
///
/// The GTK4 application runs in its own thread separate from the Node.js event loop.
/// Communication between threads is handled through channels, ensuring thread safety.
///
/// # Example
///
/// ```javascript
/// const appId = start("com.example.myapp");
/// // appId can now be used with other functions like call() and stop()
/// ```
///
/// # Panics
///
/// This function will panic if:
/// - The GTK4 library cannot be initialized
/// - The channel communication fails between threads
/// - The application ID is invalid
pub fn start(mut cx: FunctionContext) -> JsResult<JsValue> {
    let app_id = cx.argument::<JsString>(0)?.value(&mut cx);
    let (tx, rx) = mpsc::channel::<ObjectId>();

    // Spawn a dedicated thread for the GTK4 main loop
    std::thread::spawn(move || {
        let app = gtk4::Application::builder().application_id(app_id).build();
        let app_object_id = ObjectId::new(Object::GObject(app.clone().into()));

        // Hold the application to prevent it from terminating immediately
        ThreadState::with(|state| {
            state.app_hold_guard = Some(app.hold());
        });

        // Set up activation callback to signal when the app is ready
        app.connect_activate(move |_| {
            tx.send(app_object_id.clone()).unwrap();
        });

        // Run the GTK4 main loop
        app.run_with_args::<&str>(&[]);
    });

    // Wait for the application to be activated
    let app_object_id = rx.recv().unwrap();

    Ok(cx.boxed(app_object_id).upcast())
}
