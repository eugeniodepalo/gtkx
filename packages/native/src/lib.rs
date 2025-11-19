mod arg;
mod boxed;
mod cif;
mod module;
mod object;
mod state;
mod types;
mod value;

use module::{call, start, stop};
use neon::prelude::*;

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("start", start)?;
    cx.export_function("stop", stop)?;
    cx.export_function("call", call)?;
    Ok(())
}
