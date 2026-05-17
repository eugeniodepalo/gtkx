//! [`Mailbox`] methods that cross into the JavaScript runtime.
//!
//! Every function here either invokes a JavaScript callback, converts values
//! through a live [`napi::Env`], or drives the wake threadsafe function. None
//! of it can run without a Node.js runtime, so it is excluded from coverage
//! instrumentation — there is no JavaScript engine or libuv event loop in a
//! `cargo test` process to exercise it against.

use std::sync::{Arc, mpsc};

use napi::bindgen_prelude::{FromNapiValue, Unknown};
use napi::threadsafe_function::ThreadsafeFunctionCallMode;
use napi::{Env, JsFunction};

use super::{GlibDisconnectedError, Mailbox, NodeCallback, WakeJsTsfn};
use crate::error_reporter::NativeErrorReporter;
use crate::value::{JsRef, Value};

impl Mailbox {
    /// Stores the threadsafe function used to wake the JS thread from arbitrary
    /// other threads. Set once during `start()` and invoked by the `GLib` thread
    /// when callbacks are pushed onto the node inbox.
    #[cfg_attr(coverage_nightly, coverage(off))]
    pub fn set_wake_tsfn(&self, tsfn: Arc<WakeJsTsfn>) {
        let _ = self.wake_js_tsfn.set(tsfn);
    }

    #[cfg_attr(coverage_nightly, coverage(off))]
    fn push_node_callback(&self, callback: NodeCallback) {
        self.node_inbox
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .push_back(callback);
        self.wake_js.notify();
    }

    #[cfg_attr(coverage_nightly, coverage(off))]
    fn pop_node_callback(&self) -> Option<NodeCallback> {
        self.node_inbox
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .pop_front()
    }

    /// Schedules a task on the `GLib` thread and blocks the JS thread until the
    /// task completes. While blocked, drains any callbacks pushed onto the
    /// node inbox so re-entrant `GLib → JS → GLib` calls progress.
    #[cfg_attr(coverage_nightly, coverage(off))]
    pub fn dispatch_to_glib_and_wait<R, F>(
        &self,
        env: Env,
        task: F,
    ) -> Result<R, GlibDisconnectedError>
    where
        F: FnOnce() -> R + Send + 'static,
        R: Send + 'static,
    {
        let (tx, rx) = mpsc::channel();
        self.schedule_glib(Box::new(move || {
            if tx.send(task()).is_err() {
                NativeErrorReporter::global()
                    .report_str("GLib dispatch completed but result channel was closed");
            }
        }));
        self.wait_for_glib_result(env, &rx)
    }

    /// Blocks the JS thread until the receiver yields a value, draining any
    /// pending node callbacks along the way. Useful when callers schedule
    /// tasks via [`Mailbox::schedule_glib`] and want fine-grained control over
    /// what value the `GLib` task signals back through (for example, the
    /// freeze loop signals readiness mid-execution).
    #[cfg_attr(coverage_nightly, coverage(off))]
    pub fn wait_for_glib_result<R>(
        &self,
        env: Env,
        rx: &mpsc::Receiver<R>,
    ) -> Result<R, GlibDisconnectedError> {
        loop {
            self.process_node_pending(env);

            match rx.try_recv() {
                Ok(result) => return Ok(result),
                Err(mpsc::TryRecvError::Disconnected) => return Err(GlibDisconnectedError),
                Err(mpsc::TryRecvError::Empty) => self.wake_js.wait(),
            }
        }
    }

    /// Pushes a JS callback onto the node inbox and blocks the `GLib` thread
    /// until JS produces a result. While blocked, drains GLib-bound tasks
    /// pushed by the executing JS callback so re-entrant `JS → GLib → JS`
    /// calls progress.
    #[cfg_attr(coverage_nightly, coverage(off))]
    pub fn invoke_node_and_wait(
        &self,
        callback: &Arc<JsRef<JsFunction>>,
        args: Vec<Value>,
        capture_result: bool,
    ) -> anyhow::Result<Value> {
        let (tx, rx) = mpsc::channel();

        self.push_node_callback(NodeCallback {
            callback: callback.clone(),
            args,
            capture_result,
            result_tx: tx,
        });

        if let Some(tsfn) = self.wake_js_tsfn.get() {
            tsfn.call((), ThreadsafeFunctionCallMode::NonBlocking);
        }

        self.wait_for_node_result(&rx)
    }

    #[cfg_attr(coverage_nightly, coverage(off))]
    fn wait_for_node_result(
        &self,
        rx: &mpsc::Receiver<anyhow::Result<Value>>,
    ) -> anyhow::Result<Value> {
        loop {
            self.dispatch_pending();

            match rx.try_recv() {
                Ok(result) => return result,
                Err(mpsc::TryRecvError::Disconnected) => {
                    return Err(anyhow::anyhow!("JS callback channel disconnected"));
                }
                Err(mpsc::TryRecvError::Empty) => self.wake_glib.wait(),
            }
        }
    }

    /// Drains all currently-queued node callbacks and invokes them in JS.
    /// Intended to run on the JS thread, either from the wake TSFN scheduled by
    /// [`Mailbox::invoke_node_and_wait`] or from the wait loop in
    /// [`Mailbox::wait_for_glib_result`].
    #[cfg_attr(coverage_nightly, coverage(off))]
    pub fn process_node_pending(&self, env: Env) {
        while let Some(pending) = self.pop_node_callback() {
            let NodeCallback {
                callback,
                args,
                capture_result,
                result_tx,
            } = pending;
            let result = Self::execute_callback(env, &callback, args, capture_result);
            if result_tx.send(result).is_err() {
                NativeErrorReporter::global()
                    .report_str("Node callback completed but result channel was closed");
            }
            self.wake_glib.notify();
        }
    }

    #[cfg_attr(coverage_nightly, coverage(off))]
    fn execute_callback(
        env: Env,
        callback: &Arc<JsRef<JsFunction>>,
        args: Vec<Value>,
        capture_result: bool,
    ) -> anyhow::Result<Value> {
        use napi::sys;

        let js_args: Vec<Unknown<'_>> = args
            .into_iter()
            .map(|v| {
                v.to_js_value(&env)
                    .map_err(|e| anyhow::anyhow!("converting callback arg: {e}"))
            })
            .collect::<anyhow::Result<Vec<_>>>()?;

        let raw_args: Vec<sys::napi_value> = js_args.iter().map(napi::JsValue::raw).collect();

        let func = callback
            .get_value(&env)
            .map_err(|e| anyhow::anyhow!("retrieving callback function: {e}"))?;

        let func_raw = unsafe { napi::NapiRaw::raw(&func) };

        let mut undef_this = std::ptr::null_mut();
        unsafe {
            sys::napi_get_undefined(env.raw(), &mut undef_this);
        }

        let mut return_value = std::ptr::null_mut();
        let status = unsafe {
            sys::napi_call_function(
                env.raw(),
                undef_this,
                func_raw,
                raw_args.len(),
                raw_args.as_ptr(),
                &mut return_value,
            )
        };

        if status == sys::Status::napi_pending_exception {
            let mut exception = std::ptr::null_mut();
            unsafe {
                sys::napi_get_and_clear_last_exception(env.raw(), &mut exception);
            }
            let msg = if exception.is_null() {
                "JS callback threw an exception".to_owned()
            } else {
                Self::extract_exception_message(env.raw(), exception)
            };
            return Err(anyhow::anyhow!("{msg}"));
        }
        if status != sys::Status::napi_ok {
            return Err(anyhow::anyhow!("napi_call_function failed: {status:?}"));
        }

        if capture_result {
            let unknown = unsafe { Unknown::from_raw_unchecked(env.raw(), return_value) };
            Value::from_js_value(&env, unknown)
                .map_err(|e| anyhow::anyhow!("converting callback result: {e}"))
        } else {
            Ok(Value::Undefined)
        }
    }

    #[cfg_attr(coverage_nightly, coverage(off))]
    fn extract_exception_message(
        env: napi::sys::napi_env,
        exception: napi::sys::napi_value,
    ) -> String {
        use napi::sys;

        let mut value_type = sys::ValueType::napi_undefined;
        unsafe {
            sys::napi_typeof(env, exception, &mut value_type);
        }

        if value_type == sys::ValueType::napi_object {
            let mut message = std::ptr::null_mut();
            unsafe {
                sys::napi_get_named_property(env, exception, c"message".as_ptr(), &mut message);
            }
            if !message.is_null()
                && let Ok(s) = unsafe { String::from_napi_value(env, message) }
            {
                return s;
            }
        } else if value_type == sys::ValueType::napi_string
            && let Ok(s) = unsafe { String::from_napi_value(env, exception) }
        {
            return s;
        }

        "unknown exception".to_owned()
    }
}
