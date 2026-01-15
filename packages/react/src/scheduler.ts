type Callback = () => void;

export enum CommitPriority {
    /** Runs first. Used for widget removals to unparent before reparenting. */
    HIGH = 0,
    /** Runs after HIGH priority. Used for widget additions. */
    NORMAL = 1,
    /** Runs after NORMAL. Used for model sync operations that need all data to be added first. */
    LOW = 2,
}

const queues: Record<CommitPriority, Callback[]> = {
    [CommitPriority.HIGH]: [],
    [CommitPriority.NORMAL]: [],
    [CommitPriority.LOW]: [],
};

const priorities = [CommitPriority.HIGH, CommitPriority.NORMAL, CommitPriority.LOW] as const;

/**
 * Schedule a callback to run after commit with the specified priority.
 * HIGH priority callbacks run before NORMAL priority callbacks.
 */
export const scheduleAfterCommit = (callback: Callback, priority = CommitPriority.NORMAL): void => {
    queues[priority].push(callback);
};

export const flushAfterCommit = (): void => {
    for (const priority of priorities) {
        while (queues[priority].length > 0) {
            const callback = queues[priority].shift()!;
            callback();
        }
    }
};
