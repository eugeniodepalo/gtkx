//! Routes `GLib` log messages to the JavaScript error reporter.
//!
//! The installed handler forwards through [`NativeErrorReporter`], whose
//! threadsafe function targets the Node.js event loop, so this module is
//! excluded from coverage instrumentation.

#![cfg_attr(coverage_nightly, coverage(off))]

use gtk4::glib::{self, LogLevel};

use crate::error_reporter::NativeErrorReporter;

#[derive(Debug)]
pub struct GlibLogHandler;

impl GlibLogHandler {
    pub fn install() {
        glib::log_set_default_handler(Self::handle_log);
    }

    fn handle_log(domain: Option<&str>, level: LogLevel, message: &str) {
        let level_str = match level {
            LogLevel::Error => "ERROR",
            LogLevel::Critical => "CRITICAL",
            LogLevel::Warning | LogLevel::Message | LogLevel::Info | LogLevel::Debug => return,
        };
        let domain_str = domain.unwrap_or("unknown");
        NativeErrorReporter::global().report_str(&format!("{domain_str}-{level_str}: {message}"));
    }
}
