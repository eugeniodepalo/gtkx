import * as Gtk from "@gtkx/ffi/gtk";

export type ItemUpdatedCallback = (id: string) => void;

export class ListStore {
    private model = new Gtk.StringList();
    private ids: string[] = [];
    private idToIndex = new Map<string, number>();
    private items = new Map<string, unknown>();
    private onItemUpdated: ItemUpdatedCallback | null = null;

    public setOnItemUpdated(callback: ItemUpdatedCallback | null): void {
        this.onItemUpdated = callback;
    }

    public addItem(id: string, item: unknown): void {
        this.items.set(id, item);

        const existingIndex = this.idToIndex.get(id);
        if (existingIndex !== undefined) {
            this.model.remove(existingIndex);
            this.ids.splice(existingIndex, 1);
            this.rebuildIndices(existingIndex);
        }

        this.idToIndex.set(id, this.ids.length);
        this.ids.push(id);
        this.model.append(id);
    }

    public removeItem(id: string): void {
        const index = this.idToIndex.get(id);
        if (index === undefined) return;

        this.model.remove(index);
        this.ids.splice(index, 1);
        this.idToIndex.delete(id);
        this.rebuildIndices(index);
        this.items.delete(id);
    }

    public insertItemBefore(id: string, beforeId: string, item: unknown): void {
        this.items.set(id, item);

        const existingIndex = this.idToIndex.get(id);
        if (existingIndex !== undefined) {
            this.model.remove(existingIndex);
            this.ids.splice(existingIndex, 1);
            this.idToIndex.delete(id);
            this.rebuildIndices(existingIndex);
        }

        const beforeIndex = this.idToIndex.get(beforeId);
        if (beforeIndex === undefined) {
            this.idToIndex.set(id, this.ids.length);
            this.ids.push(id);
            this.model.append(id);
        } else {
            this.ids.splice(beforeIndex, 0, id);
            this.rebuildIndices(beforeIndex);
            this.model.splice(beforeIndex, 0, [id]);
        }
    }

    public updateItem(id: string, item: unknown): void {
        if (this.items.has(id)) {
            this.items.set(id, item);
            this.onItemUpdated?.(id);
        } else {
            this.addItem(id, item);
        }
    }

    public getItem(id: string): unknown {
        return this.items.get(id);
    }

    public getModel(): Gtk.StringList {
        return this.model;
    }

    private rebuildIndices(fromIndex: number): void {
        for (let i = fromIndex; i < this.ids.length; i++) {
            this.idToIndex.set(this.ids[i] as string, i);
        }
    }
}
