//! Dispatching callbacks to the JS thread.
//!
//! This module provides a mechanism for invoking JavaScript callbacks from GTK signal handlers.
//!
//! Callbacks are always queued and can be processed in two ways:
//! - **Synchronous**: When JS is in a wait loop (e.g., waiting for FFI results), `process_pending()`
//!   is called repeatedly and processes the queue.
//! - **Asynchronous**: When JS is idle, a wake-up message is sent via a Neon channel, which
//!   triggers `process_pending()` on the UV event loop.

use std::sync::{Arc, mpsc};

use neon::prelude::*;

use crate::{queue::Queue, value::Value};

/// A pending callback waiting to be executed on the JS thread.
pub struct PendingCallback {
    /// The rooted JavaScript function to call.
    pub callback: Arc<Root<JsFunction>>,
    /// Arguments to pass to the function.
    pub args: Vec<Value>,
    /// Whether to capture and return the result.
    pub capture_result: bool,
    /// Channel to send the result back to the GTK thread.
    pub result_tx: mpsc::Sender<Result<Value, ()>>,
}

static QUEUE: Queue<PendingCallback> = Queue::new();

/// Queues a callback for execution on the JS thread.
///
/// The callback is added to a queue that will be processed either:
/// - Synchronously by `process_pending()` in the JS wait loop, or
/// - Asynchronously when the channel wake-up triggers `process_pending()`
pub fn queue(
    callback: Arc<Root<JsFunction>>,
    args: Vec<Value>,
    capture_result: bool,
) -> mpsc::Receiver<Result<Value, ()>> {
    let (tx, rx) = mpsc::channel();

    QUEUE.push(PendingCallback {
        callback,
        args,
        capture_result,
        result_tx: tx,
    });

    rx
}

/// Queues a callback and sends a wake-up message via the channel.
///
/// Use this when JS might be idle (not in a wait loop). The channel message
/// ensures the queue gets processed even if JS isn't actively polling.
pub fn queue_with_wakeup(
    channel: &Channel,
    callback: Arc<Root<JsFunction>>,
    args: Vec<Value>,
    capture_result: bool,
) -> mpsc::Receiver<Result<Value, ()>> {
    let rx = queue(callback, args, capture_result);

    channel.send(|mut cx| {
        process_pending(&mut cx);
        Ok(())
    });

    rx
}

/// Processes all pending callbacks using the provided context.
///
/// This should be called from the JS thread's wait loop while waiting for
/// GTK dispatch results. Each callback is executed synchronously and its result
/// is sent back through the callback's result channel.
pub fn process_pending<'a, C: Context<'a>>(cx: &mut C) {
    while let Some(pending) = QUEUE.pop() {
        let result = execute_callback(cx, &pending.callback, &pending.args, pending.capture_result);
        pending
            .result_tx
            .send(result)
            .expect("Pending callback result channel disconnected");
    }
}

fn execute_callback<'a, C: Context<'a>>(
    cx: &mut C,
    callback: &Arc<Root<JsFunction>>,
    args: &[Value],
    capture_result: bool,
) -> Result<Value, ()> {
    let js_args: Vec<Handle<JsValue>> = args
        .iter()
        .map(|v| v.to_js_value(cx))
        .collect::<NeonResult<Vec<_>>>()
        .map_err(|_| ())?;

    let js_this = cx.undefined();
    let js_callback = callback.to_inner(cx);

    if capture_result {
        let js_result = js_callback.call(cx, js_this, js_args).map_err(|_| ())?;
        Value::from_js_value(cx, js_result).map_err(|_| ())
    } else {
        js_callback.call(cx, js_this, js_args).map_err(|_| ())?;
        Ok(Value::Undefined)
    }
}
