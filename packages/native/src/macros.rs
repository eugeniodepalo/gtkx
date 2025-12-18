macro_rules! dispatch_integer_read {
    ($int_type:expr, $ptr:expr) => {
        match ($int_type.size, $int_type.sign) {
            (IntegerSize::_8, IntegerSign::Signed) => unsafe {
                $ptr.cast::<i8>().read_unaligned() as f64
            },
            (IntegerSize::_8, IntegerSign::Unsigned) => unsafe {
                $ptr.cast::<u8>().read_unaligned() as f64
            },
            (IntegerSize::_16, IntegerSign::Signed) => unsafe {
                $ptr.cast::<i16>().read_unaligned() as f64
            },
            (IntegerSize::_16, IntegerSign::Unsigned) => unsafe {
                $ptr.cast::<u16>().read_unaligned() as f64
            },
            (IntegerSize::_32, IntegerSign::Signed) => unsafe {
                $ptr.cast::<i32>().read_unaligned() as f64
            },
            (IntegerSize::_32, IntegerSign::Unsigned) => unsafe {
                $ptr.cast::<u32>().read_unaligned() as f64
            },
            (IntegerSize::_64, IntegerSign::Signed) => unsafe {
                $ptr.cast::<i64>().read_unaligned() as f64
            },
            (IntegerSize::_64, IntegerSign::Unsigned) => unsafe {
                $ptr.cast::<u64>().read_unaligned() as f64
            },
        }
    };
}

macro_rules! dispatch_integer_write {
    ($int_type:expr, $ptr:expr, $value:expr) => {
        match ($int_type.size, $int_type.sign) {
            (IntegerSize::_8, IntegerSign::Signed) => unsafe {
                $ptr.cast::<i8>().write_unaligned($value as i8);
            },
            (IntegerSize::_8, IntegerSign::Unsigned) => unsafe {
                $ptr.cast::<u8>().write_unaligned($value as u8);
            },
            (IntegerSize::_16, IntegerSign::Signed) => unsafe {
                $ptr.cast::<i16>().write_unaligned($value as i16);
            },
            (IntegerSize::_16, IntegerSign::Unsigned) => unsafe {
                $ptr.cast::<u16>().write_unaligned($value as u16);
            },
            (IntegerSize::_32, IntegerSign::Signed) => unsafe {
                $ptr.cast::<i32>().write_unaligned($value as i32);
            },
            (IntegerSize::_32, IntegerSign::Unsigned) => unsafe {
                $ptr.cast::<u32>().write_unaligned($value as u32);
            },
            (IntegerSize::_64, IntegerSign::Signed) => unsafe {
                $ptr.cast::<i64>().write_unaligned($value as i64);
            },
            (IntegerSize::_64, IntegerSign::Unsigned) => unsafe {
                $ptr.cast::<u64>().write_unaligned($value as u64);
            },
        }
    };
}

macro_rules! dispatch_integer_to_cif {
    ($int_type:expr, $number:expr) => {
        match $int_type.size {
            IntegerSize::_8 => match $int_type.sign {
                IntegerSign::Unsigned => Ok(Value::U8($number as u8)),
                IntegerSign::Signed => Ok(Value::I8($number as i8)),
            },
            IntegerSize::_16 => match $int_type.sign {
                IntegerSign::Unsigned => Ok(Value::U16($number as u16)),
                IntegerSign::Signed => Ok(Value::I16($number as i16)),
            },
            IntegerSize::_32 => match $int_type.sign {
                IntegerSign::Unsigned => Ok(Value::U32($number as u32)),
                IntegerSign::Signed => Ok(Value::I32($number as i32)),
            },
            IntegerSize::_64 => match $int_type.sign {
                IntegerSign::Unsigned => Ok(Value::U64($number as u64)),
                IntegerSign::Signed => Ok(Value::I64($number as i64)),
            },
        }
    };
}
