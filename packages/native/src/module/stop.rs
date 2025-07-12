use std::sync::mpsc;

use gtk4::glib;
use neon::prelude::*;

use crate::state::{GtkThreadState, ObjectId};

pub fn stop(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let app_object_id = cx.argument::<JsBox<ObjectId>>(0)?.as_inner().clone();
    let (tx, rx) = mpsc::channel::<()>();

    glib::idle_add_once(move || {
        GtkThreadState::with(|state| {
            state.object_map.remove(&app_object_id.0).unwrap();
            let _ = state.app_hold_guard.take().unwrap();
        });

        tx.send(()).unwrap();
    });

    rx.recv().unwrap();

    Ok(cx.undefined())
}
