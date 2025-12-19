type FlushCallback = () => void;

type BatchState = {
    depth: number;
    pendingFlushes: Set<FlushCallback>;
};

const state: BatchState = {
    depth: 0,
    pendingFlushes: new Set(),
};

export const beginCommit = (): void => {
    state.depth++;
};

export const endCommit = (): void => {
    if (state.depth <= 0) {
        state.depth = 0;
        return;
    }

    state.depth--;

    if (state.depth === 0 && state.pendingFlushes.size > 0) {
        const callbacks = [...state.pendingFlushes];
        state.pendingFlushes.clear();
        queueMicrotask(() => {
            for (const callback of callbacks) {
                callback();
            }
        });
    }
};

export const scheduleFlush = (callback: FlushCallback): void => {
    if (state.depth > 0) {
        state.pendingFlushes.add(callback);
    } else {
        callback();
    }
};
