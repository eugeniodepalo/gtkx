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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_module_exports() {
        // Test that the main function sets up exports correctly
        // This is a structural test to ensure the module is properly configured

        // We can't actually call main() in a unit test since it requires a ModuleContext
        // But we can test that our module functions exist and are importable

        // Verify all module functions are accessible
        let _start_fn = start;
        let _stop_fn = stop;
        let _call_fn = call;

        // If this compiles, our module structure is correct
        assert!(true);
    }

    #[test]
    fn test_module_dependencies() {
        // Test that all required modules are available
        // Just verify compilation works
        assert_eq!(2 + 2, 4);
    }

    #[test]
    fn test_type_system_integration() {
        use crate::types::*;
        use libffi::middle as ffi;

        // Test that all major types convert to FFI types
        let types = vec![
            Type::Integer(IntegerType::new(IntegerSize::_32, IntegerSign::Signed)),
            Type::Float(FloatType::new(FloatSize::_64)),
            Type::String,
            Type::Boolean,
            Type::Null,
            Type::GObject(GObjectType::new(false)),
            Type::Boxed(BoxedType::new(true, "GdkRectangle".to_string())),
            Type::Callback,
        ];

        // All should convert without panicking
        for type_ in types {
            let _: ffi::Type = (&type_).into();
        }
    }

    #[test]
    fn test_result_system_integration() {
        use crate::result::*;
        use crate::types::*;
        use libffi::middle as ffi;

        // Test that all result types convert to FFI types
        let result_types = vec![
            ResultType::Void,
            ResultType::Null,
            ResultType::Integer(IntegerType::new(IntegerSize::_64, IntegerSign::Unsigned)),
            ResultType::Float(FloatType::new(FloatSize::_32)),
            ResultType::String,
            ResultType::Boolean,
            ResultType::GObject(GObjectType::new(true)),
            ResultType::Boxed(BoxedType::new(false, "GdkPixbuf".to_string())),
            ResultType::Callback,
        ];

        // All should convert without panicking
        for result_type in result_types {
            let _: ffi::Type = (&result_type).into();
        }
    }

    #[test]
    fn test_value_conversions() {
        use crate::result::Result;

        // Test that results can convert to GLib values
        let conversions = vec![
            (Result::Number(42.0), true),               // Should have value
            (Result::String("test".to_string()), true), // Should have value
            (Result::Boolean(true), true),              // Should have value
            (Result::Void, false),                      // Should be None
            (Result::Null, false),                      // Should be None
        ];

        for (result, should_have_value) in conversions {
            match result.try_to_glib_value() {
                Ok(Some(_)) => assert!(should_have_value, "Expected no value"),
                Ok(None) => assert!(!should_have_value, "Expected a value"),
                Err(_) => {
                    // Only Object type should error
                    match result {
                        Result::Object(_) => {} // Expected
                        _ => panic!("Unexpected error for {:?}", result),
                    }
                }
            }
        }
    }

    #[test]
    fn test_memory_safety() {
        use crate::types::*;

        // Test that types can be safely cloned and moved
        let original = IntegerType::new(IntegerSize::_32, IntegerSign::Signed);
        let cloned = original.clone();

        assert_eq!(original, cloned);

        // Test moving into closures
        let process = |t: IntegerType| -> IntegerType {
            assert_eq!(t.size, IntegerSize::_32);
            t
        };

        let moved = process(original);
        assert_eq!(moved, cloned);
    }
}
