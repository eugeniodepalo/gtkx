//! Module Management Functions
//!
//! This module contains the main entry point functions for managing GTK4 applications
//! from JavaScript. It provides functions to start, stop, and interact with GTK4
//! applications through a type-safe FFI interface.

mod call;
mod start;
mod stop;

pub use call::*;
pub use start::*;
pub use stop::*;
