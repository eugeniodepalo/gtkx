import { batch } from "@gtkx/ffi";
import * as Gtk from "@gtkx/ffi/gtk";
import { BaseStore } from "./base-store.js";

export class ListStore extends BaseStore<unknown> {
    private model: Gtk.StringList = new Gtk.StringList();
    private newSortedIds: string[] = [];
    private sortedIds: string[] = [];

    public addItem(id: string, item: unknown): void {
        this.items.set(id, item);

        const existingIndex = this.newSortedIds.indexOf(id);

        if (existingIndex !== -1) {
            this.newSortedIds.splice(existingIndex, 1);
        }

        this.newSortedIds.push(id);
        this.scheduleSync();
    }

    public removeItem(id: string): void {
        const index = this.newSortedIds.indexOf(id);

        if (index !== -1) {
            this.newSortedIds.splice(index, 1);
            this.items.delete(id);
            this.scheduleSync();
        }
    }

    public insertItemBefore(id: string, beforeId: string, item: unknown): void {
        this.items.set(id, item);

        const existingIndex = this.newSortedIds.indexOf(id);

        if (existingIndex !== -1) {
            this.newSortedIds.splice(existingIndex, 1);
        }

        const beforeIndex = this.newSortedIds.indexOf(beforeId);

        if (beforeIndex === -1) {
            this.newSortedIds.push(id);
        } else {
            this.newSortedIds.splice(beforeIndex, 0, id);
        }

        this.scheduleSync();
    }

    public override updateItem(id: string, item: unknown): void {
        if (this.items.has(id)) {
            this.items.set(id, item);
        } else {
            this.addItem(id, item);
        }
    }

    public getModel(): Gtk.StringList {
        return this.model;
    }

    protected override sync(): void {
        const newOrder = this.newSortedIds;
        const oldLength = this.sortedIds.length;
        batch(() => this.model.splice(0, oldLength, newOrder.length > 0 ? newOrder : undefined));
        this.sortedIds = [...newOrder];
    }
}
