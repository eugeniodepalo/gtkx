use std::sync::{Condvar, Mutex};
use std::time::Duration;

pub struct WaitSignal {
    state: Mutex<bool>,
    condvar: Condvar,
}

impl Default for WaitSignal {
    fn default() -> Self {
        Self::new()
    }
}

impl WaitSignal {
    pub fn new() -> Self {
        Self {
            state: Mutex::new(false),
            condvar: Condvar::new(),
        }
    }

    pub fn notify(&self) {
        let mut notified = self.state.lock().unwrap();
        *notified = true;
        self.condvar.notify_one();
    }

    pub fn wait(&self) {
        let mut notified = self.state.lock().unwrap();
        if *notified {
            *notified = false;
            return;
        }
        let (mut guard, _) = self
            .condvar
            .wait_timeout(notified, Duration::from_millis(5))
            .unwrap();
        *guard = false;
    }
}
