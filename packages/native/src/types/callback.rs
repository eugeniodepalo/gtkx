//! JavaScript callback wrapper.

use neon::prelude::*;
use std::sync::Arc;

/// A JavaScript function that can be called from native code.
///
/// Holds a rooted reference to the JavaScript function and a channel for
/// dispatching calls back to the JavaScript thread.
#[derive(Debug, Clone)]
pub struct Callback {
    /// Rooted reference to the JavaScript function.
    pub js_func: Arc<Root<JsFunction>>,
    /// Channel for sending calls to the JavaScript thread.
    pub channel: Channel,
}

impl Callback {
    /// Creates a new callback wrapper.
    pub fn new(js_func: Arc<Root<JsFunction>>, channel: Channel) -> Self {
        Callback { js_func, channel }
    }

    /// Creates a callback from a JavaScript function value.
    ///
    /// # Errors
    ///
    /// Returns a `NeonResult` error if the value is not a function.
    pub fn from_js_value<'a, C: Context<'a>>(
        cx: &mut C,
        value: Handle<JsValue>,
    ) -> NeonResult<Self> {
        let js_func = value.downcast::<JsFunction, _>(cx).or_throw(cx)?;
        let js_func_root = js_func.root(cx);
        let mut channel = cx.channel();

        channel.unref(cx);

        Ok(Callback::new(Arc::new(js_func_root), channel))
    }

    /// Converts this callback back to a JavaScript function handle.
    ///
    /// # Errors
    ///
    /// Returns a `NeonResult` error if the conversion fails.
    pub fn to_js_value<'a, C: Context<'a>>(&self, cx: &mut C) -> NeonResult<Handle<'a, JsValue>> {
        let js_func = self.js_func.to_inner(cx);
        Ok(js_func.upcast())
    }
}
