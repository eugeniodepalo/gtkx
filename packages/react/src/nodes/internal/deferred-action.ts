import { type CommitPriority, scheduleAfterCommit } from "../../scheduler.js";

export class DeferredAction {
    private scheduled = false;

    constructor(
        private action: () => void,
        private priority: CommitPriority,
    ) {}

    schedule(): void {
        if (this.scheduled) return;
        this.scheduled = true;
        scheduleAfterCommit(() => {
            this.scheduled = false;
            this.action();
        }, this.priority);
    }
}
