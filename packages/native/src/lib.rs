mod arg;
mod cif;
mod module;
mod object;
mod result;
mod state;
mod types;
mod value;

use neon::prelude::*;

use module::{call, start, stop};

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("start", start)?;
    cx.export_function("stop", stop)?;
    cx.export_function("call", call)?;
    Ok(())
}
