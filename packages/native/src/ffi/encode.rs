//! Encoding and decoding traits for FFI values.
//!
//! Defines the [`FfiEncode`] and [`FfiDecode`] traits that type descriptors
//! implement to convert between JavaScript values and FFI representations.

use super::value::FfiValue;
use crate::arg::Arg;
use crate::value;

/// Trait for encoding JavaScript values to FFI-compatible representation.
///
/// Implemented by type descriptors (e.g., `IntegerType`, `StringType`, `GObjectType`)
/// to convert JavaScript values into [`FfiValue`] for native function calls.
pub trait FfiEncode {
    fn encode(&self, value: &value::Value, optional: bool) -> anyhow::Result<FfiValue>;
}

/// Trait for decoding FFI values back to JavaScript values.
///
/// Implemented by type descriptors to convert native return values or
/// out-parameter values back to JavaScript-compatible representations.
pub trait FfiDecode {
    /// Decodes an FFI value to a JavaScript value.
    fn decode(&self, ffi_value: &FfiValue) -> anyhow::Result<value::Value>;

    fn decode_with_context(
        &self,
        ffi_value: &FfiValue,
        ffi_args: &[FfiValue],
        args: &[Arg],
    ) -> anyhow::Result<value::Value> {
        let _ = (ffi_args, args);
        self.decode(ffi_value)
    }
}
