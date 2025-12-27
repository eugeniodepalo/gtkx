import * as Gtk from "@gtkx/ffi/gtk";
import { scheduleAfterCommit } from "../../scheduler.js";

export class ListStore {
    private items: Map<string, unknown> = new Map();
    private model: Gtk.StringList = new Gtk.StringList();
    private order: string[] = [];
    private committedOrder: string[] = [];
    private syncScheduled = false;

    public addItem(id: string, item: unknown): void {
        this.items.set(id, item);

        const existingIndex = this.order.indexOf(id);
        if (existingIndex !== -1) {
            this.order.splice(existingIndex, 1);
        }

        this.order.push(id);
        this.scheduleSync();
    }

    public removeItem(id: string): void {
        const index = this.order.indexOf(id);
        if (index !== -1) {
            this.order.splice(index, 1);
            this.items.delete(id);
            this.scheduleSync();
        }
    }

    public insertItemBefore(id: string, beforeId: string, item: unknown): void {
        this.items.set(id, item);

        const existingIndex = this.order.indexOf(id);
        if (existingIndex !== -1) {
            this.order.splice(existingIndex, 1);
        }

        const beforeIndex = this.order.indexOf(beforeId);
        if (beforeIndex === -1) {
            this.order.push(id);
        } else {
            this.order.splice(beforeIndex, 0, id);
        }

        this.scheduleSync();
    }

    public updateItem(id: string, item: unknown): void {
        if (this.items.has(id)) {
            this.items.set(id, item);
        } else {
            this.addItem(id, item);
        }
    }

    public getItem(id: string) {
        return this.items.get(id);
    }

    public getModel(): Gtk.StringList {
        return this.model;
    }

    private scheduleSync(): void {
        if (this.syncScheduled) {
            return;
        }

        this.syncScheduled = true;
        scheduleAfterCommit(() => this.sync());
    }

    private sync(): void {
        this.syncScheduled = false;

        const newOrder = this.order;
        const oldLength = this.committedOrder.length;

        this.model.splice(0, oldLength, newOrder.length > 0 ? newOrder : undefined);
        this.committedOrder = [...newOrder];
    }
}
