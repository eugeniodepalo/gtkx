//! # Native GTK4 Bridge
//!
//! This crate provides a Neon-based bridge between Node.js and GTK4, enabling
//! JavaScript applications to interact with GTK4 widgets and functionality through
//! FFI (Foreign Function Interface) calls.
//!
//! ## Architecture
//!
//! The crate consists of several key components:
//!
//! - **Module Management**: Functions to start and stop GTK4 applications
//! - **FFI Call Interface**: Dynamic calling of GTK4 functions with type-safe argument handling
//! - **Type System**: Comprehensive type definitions for GTK4 objects, primitives, and arrays
//! - **Object Management**: Lifetime management for GTK4 objects (GObject and Boxed types)
//! - **State Management**: Thread-safe state handling for the GTK4 main loop
//!
//! ## Exported Functions
//!
//! The crate exports three main functions to Node.js:
//!
//! - `start`: Initializes a GTK4 application and returns an application object ID
//! - `stop`: Terminates a GTK4 application and cleans up resources
//! - `call`: Dynamically calls GTK4 functions with type-safe argument marshalling
//!
//! ## Safety
//!
//! This crate uses unsafe FFI calls to interact with GTK4's C API. All unsafe
//! operations are carefully contained within well-defined boundaries with proper
//! error handling and resource management.

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

/// Main entry point for the Neon module.
///
/// Exports the three core functions that provide the bridge between Node.js and GTK4:
/// - `start`: Initializes GTK4 application
/// - `stop`: Terminates GTK4 application  
/// - `call`: Performs FFI calls to GTK4 functions
#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("start", start)?;
    cx.export_function("stop", stop)?;
    cx.export_function("call", call)?;
    Ok(())
}
