//! Array Type Definitions
//!
//! This module provides type definitions for array types used in GTK4 FFI calls.
//! Arrays contain elements of a specific type and are passed as pointers to
//! the first element in C function calls.

use libffi::middle as ffi;
use neon::prelude::*;

use crate::types::Type;

/// Represents an array type specification.
///
/// This struct defines an array type for use in GTK4 FFI calls. It specifies
/// the type of elements contained in the array. Arrays are always passed as
/// pointers to the first element in C function calls.
#[derive(Debug, Clone)]
pub struct ArrayType {
    /// The type of elements contained in the array
    pub item_type: Box<Type>,
}

impl ArrayType {
    /// Creates an ArrayType from a JavaScript type description object.
    ///
    /// # Arguments
    ///
    /// * `cx` - Neon function context
    /// * `value` - JavaScript object with an 'itemType' property
    ///
    /// # Returns
    ///
    /// Returns an ArrayType representing the JavaScript type description.
    ///
    /// # Errors
    ///
    /// Returns a JavaScript error if the type description is invalid or
    /// if the 'itemType' property is missing or invalid.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let item_type_value: Handle<'_, JsValue> = obj.prop(cx, "itemType").get()?;
        let item_type = Type::from_js_value(cx, item_type_value)?;

        Ok(Self {
            item_type: Box::new(item_type),
        })
    }
}

impl Into<ffi::Type> for &ArrayType {
    /// Converts the ArrayType to a libffi type.
    ///
    /// Arrays are always represented as pointers in C, regardless of their
    /// element type. The actual array data is passed by reference, with the
    /// pointer pointing to the first element.
    fn into(self) -> ffi::Type {
        ffi::Type::pointer()
    }
}

impl Into<ffi::Type> for ArrayType {
    fn into(self) -> ffi::Type {
        (&self).into()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{FloatSize, FloatType, IntegerSign, IntegerSize, IntegerType};

    #[test]
    fn test_array_type_creation() {
        let int_type = Type::Integer(IntegerType::new(IntegerSize::_32, IntegerSign::Signed));
        let array_type = ArrayType {
            item_type: Box::new(int_type),
        };

        match &*array_type.item_type {
            Type::Integer(int_type) => {
                assert_eq!(int_type.size, IntegerSize::_32);
                assert_eq!(int_type.sign, IntegerSign::Signed);
            }
            _ => panic!("Expected integer type"),
        }
    }

    #[test]
    fn test_array_of_integers() {
        let int_type = Type::Integer(IntegerType::new(IntegerSize::_64, IntegerSign::Unsigned));
        let array_type = ArrayType {
            item_type: Box::new(int_type),
        };

        if let Type::Integer(inner_type) = &*array_type.item_type {
            assert_eq!(inner_type.size, IntegerSize::_64);
            assert_eq!(inner_type.sign, IntegerSign::Unsigned);
        } else {
            panic!("Expected integer item type");
        }
    }

    #[test]
    fn test_array_of_floats() {
        let float_type = Type::Float(FloatType::new(FloatSize::_64));
        let array_type = ArrayType {
            item_type: Box::new(float_type),
        };

        if let Type::Float(inner_type) = &*array_type.item_type {
            assert_eq!(inner_type.size, FloatSize::_64);
        } else {
            panic!("Expected float item type");
        }
    }

    #[test]
    fn test_array_of_strings() {
        let string_type = Type::String;
        let array_type = ArrayType {
            item_type: Box::new(string_type),
        };

        match &*array_type.item_type {
            Type::String => {} // Expected
            _ => panic!("Expected string type"),
        }
    }

    #[test]
    fn test_array_of_booleans() {
        let bool_type = Type::Boolean;
        let array_type = ArrayType {
            item_type: Box::new(bool_type),
        };

        match &*array_type.item_type {
            Type::Boolean => {} // Expected
            _ => panic!("Expected boolean type"),
        }
    }

    #[test]
    fn test_ffi_type_conversion() {
        let int_type = Type::Integer(IntegerType::new(IntegerSize::_32, IntegerSign::Signed));
        let array_type = ArrayType {
            item_type: Box::new(int_type),
        };

        // Test that conversion works without panicking
        let _: ffi::Type = (&array_type).into();

        // Test owned conversion
        let _: ffi::Type = array_type.into();
    }

    #[test]
    fn test_debug_output() {
        let int_type = Type::Integer(IntegerType::new(IntegerSize::_32, IntegerSign::Signed));
        let array_type = ArrayType {
            item_type: Box::new(int_type),
        };

        let debug_str = format!("{:?}", array_type);
        assert!(debug_str.contains("ArrayType"));
        assert!(debug_str.contains("Integer"));
    }

    #[test]
    fn test_clone() {
        let float_type = Type::Float(FloatType::new(FloatSize::_32));
        let original = ArrayType {
            item_type: Box::new(float_type),
        };
        let cloned = original.clone();

        // Both should have the same item type
        match (&*original.item_type, &*cloned.item_type) {
            (Type::Float(orig), Type::Float(clone)) => {
                assert_eq!(orig.size, clone.size);
            }
            _ => panic!("Expected float types"),
        }
    }

    #[test]
    fn test_nested_array_concept() {
        // Test the concept of arrays containing other complex types
        use crate::types::{BoxedType, GObjectType};

        let gobject_type = Type::GObject(GObjectType::new(false));
        let array_of_objects = ArrayType {
            item_type: Box::new(gobject_type),
        };

        let boxed_type = Type::Boxed(BoxedType::new(true, "GdkRectangle".to_string()));
        let array_of_boxed = ArrayType {
            item_type: Box::new(boxed_type),
        };

        // Both should convert to pointer types
        let _: ffi::Type = (&array_of_objects).into();
        let _: ffi::Type = (&array_of_boxed).into();
    }

    #[test]
    fn test_all_primitive_array_types() {
        let types = vec![
            Type::String,
            Type::Boolean,
            Type::Null,
            Type::Integer(IntegerType::new(IntegerSize::_8, IntegerSign::Unsigned)),
            Type::Float(FloatType::new(FloatSize::_32)),
        ];

        for item_type in types {
            let array_type = ArrayType {
                item_type: Box::new(item_type),
            };

            // Should successfully convert to FFI type
            let _: ffi::Type = (&array_type).into();
        }
    }
}
