import EventEmitter from "node:events";

type NativeEventMap = {
    start: [];
    stop: [];
};

/**
 * Event emitter for GTK lifecycle events.
 * Emits "start" when GTK is initialized and "stop" before shutdown.
 */
export const events = new EventEmitter<NativeEventMap>();
