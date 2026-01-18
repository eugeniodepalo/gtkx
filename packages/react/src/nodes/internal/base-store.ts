import { CommitPriority } from "../../scheduler.js";
import { DeferredAction } from "./deferred-action.js";

export abstract class BaseStore<TItem = unknown> {
    protected items: Map<string, TItem> = new Map();
    private syncAction: DeferredAction;

    constructor() {
        this.syncAction = new DeferredAction(() => this.sync(), CommitPriority.LOW);
    }

    public getItem(id: string): TItem | undefined {
        return this.items.get(id);
    }

    public updateItem(id: string, item: TItem): void {
        if (this.items.has(id)) {
            this.items.set(id, item);
        }
    }

    protected scheduleSync(): void {
        this.syncAction.schedule();
    }

    protected abstract sync(): void;
}
