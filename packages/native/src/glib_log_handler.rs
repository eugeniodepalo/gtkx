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
