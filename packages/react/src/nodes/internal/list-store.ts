import * as Gtk from "@gtkx/ffi/gtk";

export class ListStore {
    private items: Map<string, unknown> = new Map();
    private model: Gtk.StringList = new Gtk.StringList();

    public addItem(id: string, item: unknown): void {
        this.items.set(id, item);
        this.model.append(id);
    }

    public removeItem(id: string): void {
        const index = this.model.find(id);
        if (index < this.model.getNItems()) {
            this.items.delete(id);
            this.model.remove(index);
        }
    }

    public insertItemBefore(id: string, beforeId: string, item: unknown): void {
        const beforeIndex = this.model.find(beforeId);
        this.items.set(id, item);
        this.model.splice(beforeIndex, 0, [id]);
    }

    public updateItem(id: string, item: unknown): void {
        const nItems = this.model.getNItems();
        const index = this.model.find(id);
        if (index >= nItems) {
            this.addItem(id, item);
            return;
        }
        this.items.set(id, item);
        this.model.splice(index, 1, [id]);
    }

    public getItem(id: string) {
        return this.items.get(id);
    }

    public getModel(): Gtk.StringList {
        return this.model;
    }
}
