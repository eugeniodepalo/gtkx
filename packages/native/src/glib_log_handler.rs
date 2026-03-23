use std::ffi::CStr;

use gtk4::glib;

use crate::error_reporter::NativeErrorReporter;

#[derive(Debug)]
pub struct GlibLogHandler;

impl GlibLogHandler {
    pub fn install() {
        unsafe {
            glib::ffi::g_log_set_default_handler(Some(log_handler), std::ptr::null_mut());
        }
    }
}

unsafe extern "C" fn log_handler(
    domain: *const std::ffi::c_char,
    level: glib::ffi::GLogLevelFlags,
    message: *const std::ffi::c_char,
    user_data: glib::ffi::gpointer,
) {
    if (level & glib::ffi::G_LOG_FLAG_RECURSION) != 0 {
        unsafe {
            glib::ffi::g_log_default_handler(domain, level, message, user_data);
        }
        return;
    }

    let is_critical_or_error = (level & glib::ffi::G_LOG_LEVEL_CRITICAL) != 0
        || (level & glib::ffi::G_LOG_LEVEL_ERROR) != 0;

    if !is_critical_or_error {
        return;
    }

    let domain_str = if domain.is_null() {
        "unknown"
    } else {
        unsafe { CStr::from_ptr(domain) }
            .to_str()
            .unwrap_or("unknown")
    };

    let message_str = if message.is_null() {
        "no message"
    } else {
        unsafe { CStr::from_ptr(message) }
            .to_str()
            .unwrap_or("invalid UTF-8 message")
    };

    let level_str = if (level & glib::ffi::G_LOG_LEVEL_ERROR) != 0 {
        "ERROR"
    } else {
        "CRITICAL"
    };

    NativeErrorReporter::global().report_str(&format!("{domain_str}-{level_str}: {message_str}"));
}
