//! State Management
//!
//! This module provides thread-safe state management for GTK4 applications running
//! in a separate thread from the Node.js event loop. It handles object lifecycle
//! management, library symbol resolution, and application hold guards.

mod object_id;
mod thread;

pub use object_id::*;
pub use thread::*;
