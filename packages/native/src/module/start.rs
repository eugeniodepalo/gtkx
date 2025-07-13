use std::sync::mpsc;

use gtk4::prelude::*;
use neon::prelude::*;

use crate::{
    object::Object,
    state::{ObjectId, ThreadState},
};

pub fn start(mut cx: FunctionContext) -> JsResult<JsValue> {
    let app_id = cx.argument::<JsString>(0)?.value(&mut cx);
    let (tx, rx) = mpsc::channel::<ObjectId>();

    
    std::thread::spawn(move || {
        let app = gtk4::Application::builder().application_id(app_id).build();
        let app_object_id = ObjectId::new(Object::GObject(app.clone().into()));

        
        ThreadState::with(|state| {
            state.app_hold_guard = Some(app.hold());
        });

        
        app.connect_activate(move |_| {
            tx.send(app_object_id.clone()).unwrap();
        });

        
        app.run_with_args::<&str>(&[]);
    });

    
    let app_object_id = rx.recv().unwrap();

    Ok(cx.boxed(app_object_id).upcast())
}
