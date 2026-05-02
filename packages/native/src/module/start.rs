//! GTK application initialization and thread spawning.
//!
//! The [`start`] function creates a GTK `Application`, spawns a dedicated
//! `GLib` thread, and waits for the application to activate before returning.
//!
//! ## Startup Sequence
//!
//! 1. Parse application ID and optional flags from JavaScript
//! 2. Spawn a new OS thread that runs the `GLib` main loop
//! 3. Create the `GtkApplication` and connect the activate signal
//! 4. Acquire an application hold guard to prevent auto-shutdown
//! 5. Start the main loop with `app.run_with_args`
//! 6. When activate fires, send the application's `NativeHandle` back to JS
//! 7. Return the `NativeHandle` to JavaScript

use std::sync::Arc;
use std::sync::mpsc;

use gtk4::{gio::ApplicationFlags, prelude::*};
use napi::Env;
use napi::bindgen_prelude::*;
use napi::sys;
use napi_derive::napi;

use crate::dispatch::{Mailbox, WakeJsTsfn};
use crate::error_reporter::{ErrorReporterTsfn, NativeErrorReporter};
use crate::glib_log_handler::GlibLogHandler;
use crate::managed::{NativeHandle, NativeValue};
use crate::state::{GtkThread, GtkThreadState};

#[napi]
pub fn start(env: Env, app_id: String, flags: Option<f64>) -> napi::Result<External<NativeHandle>> {
    let flags = flags.map_or(ApplicationFlags::FLAGS_NONE, |f| {
        ApplicationFlags::from_bits_truncate(f as u32)
    });

    let wake_js_fn = env.create_function_from_closure::<(), _, _>("gtkx_wake_js", |ctx| {
        Mailbox::global().process_node_pending(*ctx.env);
        Ok(())
    })?;

    let wake_tsfn: WakeJsTsfn = wake_js_fn
        .build_threadsafe_function::<()>()
        .weak::<true>()
        .callee_handled::<false>()
        .build()?;

    Mailbox::global().set_wake_tsfn(Arc::new(wake_tsfn));

    let error_fn =
        env.create_function_from_closure::<String, (), _>("gtkx_report_error", |ctx| {
            let msg: String = ctx.get(0)?;
            emit_unhandled_rejection(ctx.env, &msg);
            Ok(())
        })?;

    let error_tsfn: ErrorReporterTsfn = error_fn
        .build_threadsafe_function::<String>()
        .weak::<true>()
        .callee_handled::<false>()
        .build()?;

    NativeErrorReporter::global().initialize(Arc::new(error_tsfn));

    let (tx, rx) = mpsc::channel::<NativeHandle>();

    let handle = std::thread::spawn(move || {
        GlibLogHandler::install();

        let app = gtk4::Application::builder()
            .application_id(app_id)
            .flags(flags)
            .build();

        let app_handle: NativeHandle = NativeValue::GObject(app.clone().into()).into();

        GtkThreadState::with(|state| {
            state.app_hold_guard = Some(app.hold());
        });

        app.connect_activate(move |_| {
            if tx.send(app_handle.clone()).is_err() {
                NativeErrorReporter::global()
                    .report_str("GTK application activated but startup channel was already closed");
            }
        });

        app.run_with_args::<&str>(&[]);
    });

    GtkThread::global().set_handle(handle);

    let app_handle = rx.recv().map_err(|err| {
        napi::Error::new(
            napi::Status::GenericFailure,
            format!("Error starting GTK thread: {err}"),
        )
    })?;

    Mailbox::global().mark_started();

    Ok(External::new(app_handle))
}

/// Emits an `unhandledRejection` event on the Node.js process with a synthesized
/// `Error` whose message is `msg`. The event flows through Node's standard
/// rejection handling so userland code can suppress or redirect it via
/// `process.on('unhandledRejection', ...)`.
fn emit_unhandled_rejection(env: &Env, msg: &str) {
    let raw_env = env.raw();
    unsafe {
        let mut global = std::ptr::null_mut();
        if sys::napi_get_global(raw_env, &mut global) != sys::Status::napi_ok {
            eprintln!("[gtkx] ERROR: {msg}");
            return;
        }

        let mut process = std::ptr::null_mut();
        if sys::napi_get_named_property(raw_env, global, c"process".as_ptr(), &mut process)
            != sys::Status::napi_ok
        {
            eprintln!("[gtkx] ERROR: {msg}");
            return;
        }

        let mut emit = std::ptr::null_mut();
        if sys::napi_get_named_property(raw_env, process, c"emit".as_ptr(), &mut emit)
            != sys::Status::napi_ok
        {
            eprintln!("[gtkx] ERROR: {msg}");
            return;
        }

        let Ok(event_name) = String::to_napi_value(raw_env, "unhandledRejection".to_owned()) else {
            eprintln!("[gtkx] ERROR: {msg}");
            return;
        };

        let Some(error_obj) = make_error_object(raw_env, msg) else {
            eprintln!("[gtkx] ERROR: {msg}");
            return;
        };

        let Some(promise) = make_resolved_promise(raw_env) else {
            eprintln!("[gtkx] ERROR: {msg}");
            return;
        };

        let args = [event_name, error_obj, promise];
        let mut result = std::ptr::null_mut();
        let _ = sys::napi_call_function(
            raw_env,
            process,
            emit,
            args.len(),
            args.as_ptr(),
            &mut result,
        );

        let mut had_exception = false;
        sys::napi_is_exception_pending(raw_env, &mut had_exception);
        if had_exception {
            let mut exc = std::ptr::null_mut();
            sys::napi_get_and_clear_last_exception(raw_env, &mut exc);
        }
    }
}

unsafe fn make_error_object(env: sys::napi_env, msg: &str) -> Option<sys::napi_value> {
    unsafe {
        let mut msg_value = std::ptr::null_mut();
        let bytes = msg.as_bytes();
        if sys::napi_create_string_utf8(
            env,
            bytes.as_ptr().cast(),
            bytes.len() as isize,
            &mut msg_value,
        ) != sys::Status::napi_ok
        {
            return None;
        }
        let mut error = std::ptr::null_mut();
        if sys::napi_create_error(env, std::ptr::null_mut(), msg_value, &mut error)
            != sys::Status::napi_ok
        {
            return None;
        }
        Some(error)
    }
}

unsafe fn make_resolved_promise(env: sys::napi_env) -> Option<sys::napi_value> {
    unsafe {
        let mut deferred = std::ptr::null_mut();
        let mut promise = std::ptr::null_mut();
        if sys::napi_create_promise(env, &mut deferred, &mut promise) != sys::Status::napi_ok {
            return None;
        }
        let mut undefined = std::ptr::null_mut();
        sys::napi_get_undefined(env, &mut undefined);
        sys::napi_resolve_deferred(env, deferred, undefined);
        Some(promise)
    }
}
