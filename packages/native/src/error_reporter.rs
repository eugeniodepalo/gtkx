use std::sync::{Arc, Mutex, OnceLock};

use napi::Status;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};

pub type ErrorReporterTsfn = ThreadsafeFunction<String, (), String, Status, false, true>;

pub struct NativeErrorReporter {
    tsfn: Mutex<Option<Arc<ErrorReporterTsfn>>>,
}

impl std::fmt::Debug for NativeErrorReporter {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("NativeErrorReporter")
            .field("initialized", &self.tsfn.lock().is_ok())
            .finish_non_exhaustive()
    }
}

static REPORTER: OnceLock<NativeErrorReporter> = OnceLock::new();

impl NativeErrorReporter {
    pub fn global() -> &'static Self {
        REPORTER.get_or_init(|| Self {
            tsfn: Mutex::new(None),
        })
    }

    pub fn initialize(&self, tsfn: Arc<ErrorReporterTsfn>) {
        *self
            .tsfn
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner) = Some(tsfn);
    }

    pub fn report(&self, error: &anyhow::Error) {
        self.report_str(&format!("{error:#}"));
    }

    pub fn report_str(&self, message: &str) {
        let tsfn = self
            .tsfn
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .clone();

        let Some(tsfn) = tsfn else {
            eprintln!("[gtkx] ERROR (not initialized): {message}");
            return;
        };

        tsfn.call(message.to_owned(), ThreadsafeFunctionCallMode::NonBlocking);
    }
}
