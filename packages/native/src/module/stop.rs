use std::sync::mpsc;

use gtk4::glib;
use neon::prelude::*;

use crate::state::ThreadState;

pub fn stop(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let (tx, rx) = mpsc::channel::<()>();

    
    glib::idle_add_once(move || {
        ThreadState::with(|state| {
            
            let _ = state.app_hold_guard.take().unwrap();
        });

        
        tx.send(()).unwrap();
    });

    
    rx.recv().unwrap();

    Ok(cx.undefined())
}
