mod common;

use std::sync::{
    Arc,
    atomic::{AtomicUsize, Ordering},
};

use native::dispatch::Mailbox;

fn drain_pending() {
    let mailbox = Mailbox::global();
    while mailbox.dispatch_pending() {}
}

#[test]
fn dispatch_pending_returns_false_when_empty() {
    let _guard = common::serial_guard();
    common::ensure_gtk_init();
    drain_pending();

    let dispatched = Mailbox::global().dispatch_pending();
    assert!(!dispatched);
}

#[test]
fn schedule_glib_then_dispatch_pending_runs_task() {
    let _guard = common::serial_guard();
    common::ensure_gtk_init();
    drain_pending();

    let counter = Arc::new(AtomicUsize::new(0));
    let counter_clone = counter.clone();

    Mailbox::global().schedule_glib(Box::new(move || {
        counter_clone.fetch_add(1, Ordering::SeqCst);
    }));

    assert_eq!(counter.load(Ordering::SeqCst), 0);

    let dispatched = Mailbox::global().dispatch_pending();
    assert!(dispatched);
    assert_eq!(counter.load(Ordering::SeqCst), 1);
}

#[test]
fn schedule_glib_drops_task_when_stopped() {
    let _guard = common::serial_guard();
    common::ensure_gtk_init();
    drain_pending();

    let mailbox = Mailbox::global();
    mailbox.mark_stopped();

    let counter = Arc::new(AtomicUsize::new(0));
    let counter_clone = counter.clone();

    mailbox.schedule_glib(Box::new(move || {
        counter_clone.fetch_add(1, Ordering::SeqCst);
    }));

    let dispatched = mailbox.dispatch_pending();
    assert!(!dispatched);
    assert_eq!(counter.load(Ordering::SeqCst), 0);

    mailbox.reset_for_test();
}

#[test]
fn freeze_returns_true_only_for_outermost_call() {
    let _guard = common::serial_guard();
    let mailbox = Mailbox::global();

    assert!(mailbox.freeze());
    assert!(!mailbox.freeze());
    assert!(!mailbox.freeze());

    mailbox.unfreeze();
    mailbox.unfreeze();
    mailbox.unfreeze();

    assert!(mailbox.freeze());
    mailbox.unfreeze();
}

/// Named with a leading `a_` so libtest's alphabetical ordering runs it first:
/// `gtk4::init` acquires the global default `MainContext` for whichever thread
/// calls it first, so the idle source `schedule_glib` registers there can only
/// be dispatched from that same thread.
#[test]
fn a_schedule_glib_idle_source_dispatches_through_global_main_context() {
    let _guard = common::serial_guard();
    common::ensure_gtk_init();
    drain_pending();

    let counter = Arc::new(AtomicUsize::new(0));
    let counter_clone = counter.clone();

    Mailbox::global().schedule_glib(Box::new(move || {
        counter_clone.fetch_add(1, Ordering::SeqCst);
    }));

    let context = gtk4::glib::MainContext::default();
    for _ in 0..1000 {
        if counter.load(Ordering::SeqCst) == 1 {
            break;
        }
        if !context.iteration(false) {
            std::thread::yield_now();
        }
    }

    assert_eq!(counter.load(Ordering::SeqCst), 1);
}

#[test]
fn is_stopped_reflects_mark_and_reset() {
    let _guard = common::serial_guard();
    let mailbox = Mailbox::global();

    assert!(!mailbox.is_stopped());

    mailbox.mark_stopped();
    assert!(mailbox.is_stopped());

    mailbox.reset_for_test();
    assert!(!mailbox.is_stopped());
}

#[test]
fn notify_js_does_not_panic() {
    let _guard = common::serial_guard();
    Mailbox::global().notify_js();
}

#[test]
fn run_freeze_loop_drains_until_unfrozen() {
    let _guard = common::serial_guard();
    common::ensure_gtk_init();
    drain_pending();

    let mailbox = Mailbox::global();
    let counter = Arc::new(AtomicUsize::new(0));

    assert!(mailbox.freeze());

    let counter_for_task = counter.clone();
    mailbox.schedule_glib(Box::new(move || {
        counter_for_task.fetch_add(1, Ordering::SeqCst);
    }));

    let unfreezer = {
        let counter = counter.clone();
        std::thread::spawn(move || {
            let mailbox = Mailbox::global();
            while counter.load(Ordering::SeqCst) == 0 {
                std::thread::yield_now();
            }
            mailbox.schedule_glib(Box::new(move || {
                counter.fetch_add(1, Ordering::SeqCst);
            }));
            mailbox.unfreeze();
        })
    };

    mailbox.run_freeze_loop();
    unfreezer.join().expect("unfreezer thread should finish");

    assert_eq!(counter.load(Ordering::SeqCst), 2);
}

#[test]
fn schedule_glib_inside_freeze_loop_skips_idle_source() {
    let _guard = common::serial_guard();
    common::ensure_gtk_init();
    drain_pending();

    let mailbox = Mailbox::global();
    let nested_ran = Arc::new(AtomicUsize::new(0));

    assert!(mailbox.freeze());

    let nested_for_outer = nested_ran.clone();
    mailbox.schedule_glib(Box::new(move || {
        let mailbox = Mailbox::global();
        mailbox.schedule_glib(Box::new(move || {
            nested_for_outer.fetch_add(1, Ordering::SeqCst);
        }));
    }));

    let unfreezer = {
        let nested = nested_ran.clone();
        std::thread::spawn(move || {
            let mailbox = Mailbox::global();
            while nested.load(Ordering::SeqCst) == 0 {
                std::thread::yield_now();
            }
            mailbox.unfreeze();
        })
    };

    mailbox.run_freeze_loop();
    unfreezer.join().expect("unfreezer thread should finish");

    assert_eq!(nested_ran.load(Ordering::SeqCst), 1);
}

#[test]
fn glib_disconnected_error_display_and_debug() {
    use native::dispatch::GlibDisconnectedError;

    let error = GlibDisconnectedError;
    assert_eq!(error.to_string(), "GLib thread disconnected");

    let debug_str = format!("{error:?}");
    assert!(debug_str.contains("GlibDisconnectedError"));
}

#[test]
fn mailbox_debug_format_lists_state() {
    let _guard = common::serial_guard();
    let debug_str = format!("{:?}", Mailbox::global());
    assert!(debug_str.contains("Mailbox"));
    assert!(debug_str.contains("stopped"));
    assert!(debug_str.contains("freeze_depth"));
}

#[test]
fn dispatch_pending_drains_multiple_tasks_in_fifo_order() {
    let _guard = common::serial_guard();
    common::ensure_gtk_init();
    drain_pending();

    let order = Arc::new(std::sync::Mutex::new(Vec::<u32>::new()));

    for i in 0..5 {
        let order_clone = order.clone();
        Mailbox::global().schedule_glib(Box::new(move || {
            order_clone.lock().unwrap().push(i);
        }));
    }

    Mailbox::global().dispatch_pending();

    let collected = order.lock().unwrap().clone();
    assert_eq!(collected, vec![0, 1, 2, 3, 4]);
}
