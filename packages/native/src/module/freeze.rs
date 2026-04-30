use std::sync::mpsc;

use neon::prelude::*;

use super::handler::{JsThreadCommand, execute_js_command};
use crate::dispatch::Mailbox;
use crate::error_reporter::NativeErrorReporter;

struct FreezeCommand;

impl JsThreadCommand for FreezeCommand {
    fn from_js(_cx: &mut FunctionContext) -> NeonResult<Self> {
        Ok(Self)
    }

    fn execute<'a>(self, cx: &mut FunctionContext<'a>) -> JsResult<'a, JsValue> {
        let mailbox = Mailbox::global();

        if !mailbox.is_started() {
            return cx.throw_error("GTK application has not been started. Call start() first.");
        }

        let is_outermost = mailbox.freeze();

        if is_outermost {
            let (tx, rx) = mpsc::channel::<()>();

            mailbox.schedule_glib(move || {
                if tx.send(()).is_err() {
                    NativeErrorReporter::global()
                        .report_str("Freeze ready signal channel was closed");
                }
                let m = Mailbox::global();
                m.notify_js();
                m.run_freeze_loop();
            });

            mailbox
                .wait_for_glib_result(cx, &rx)
                .or_else(|err| cx.throw_error(err.to_string()))?;
        }

        Ok(cx.undefined().upcast())
    }
}

struct UnfreezeCommand;

impl JsThreadCommand for UnfreezeCommand {
    fn from_js(_cx: &mut FunctionContext) -> NeonResult<Self> {
        Ok(Self)
    }

    fn execute<'a>(self, cx: &mut FunctionContext<'a>) -> JsResult<'a, JsValue> {
        Mailbox::global().unfreeze();
        Ok(cx.undefined().upcast())
    }
}

pub fn freeze(mut cx: FunctionContext) -> JsResult<JsValue> {
    execute_js_command::<FreezeCommand>(&mut cx)
}

pub fn unfreeze(mut cx: FunctionContext) -> JsResult<JsValue> {
    execute_js_command::<UnfreezeCommand>(&mut cx)
}
