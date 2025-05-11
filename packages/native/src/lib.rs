use neon::prelude::*;

fn start(mut cx: FunctionContext) -> JsResult<JsString> {
    Ok(cx.string("start"))
}

fn call(mut cx: FunctionContext) -> JsResult<JsString> {
    Ok(cx.string("call"))
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("start", start)?;
    cx.export_function("call", call)?;
    Ok(())
}
