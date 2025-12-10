type FlushCallback = () => void;

const pendingFlushes = new Set<FlushCallback>();
let inCommit = false;

/**
 * Marks the beginning of a React reconciler commit phase.
 * While in commit, flush callbacks are deferred until endCommit is called.
 */
export const beginCommit = (): void => {
    inCommit = true;
};

/**
 * Marks the end of a React reconciler commit phase.
 * Executes all pending flush callbacks that were deferred during the commit.
 */
export const endCommit = (): void => {
    inCommit = false;
    if (pendingFlushes.size > 0) {
        const callbacks = [...pendingFlushes];
        pendingFlushes.clear();
        queueMicrotask(() => {
            for (const callback of callbacks) {
                callback();
            }
        });
    }
};

/**
 * Schedules a callback to be executed, deferring it if currently in a commit phase.
 * This ensures GTK state updates happen after React has finished its batch of changes.
 */
export const scheduleFlush = (callback: FlushCallback): void => {
    if (inCommit) {
        pendingFlushes.add(callback);
    } else {
        callback();
    }
};
