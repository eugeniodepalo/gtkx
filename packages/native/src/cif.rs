//! C Interface Layer (CIF)
//!
//! This module provides the low-level C interface layer for FFI calls. It handles
//! the conversion between Rust types and C types that can be passed through libffi
//! to GTK4 functions. The CIF (Call Interface) layer ensures type safety and proper
//! memory management during FFI calls.

mod arg;
mod value;

pub use arg::*;
pub use value::*;
