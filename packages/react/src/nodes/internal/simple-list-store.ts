import * as Gtk from "@gtkx/ffi/gtk";

export class SimpleListStore {
    private ids: string[] = [];
    private idToIndex = new Map<string, number>();
    private model = new Gtk.StringList();

    public addItem(id: string, label: string): void {
        this.idToIndex.set(id, this.ids.length);
        this.ids.push(id);
        this.model.append(label);
    }

    public appendItem(id: string, label: string): void {
        const existingIndex = this.idToIndex.get(id);

        if (existingIndex !== undefined) {
            this.model.remove(existingIndex);
            this.ids.splice(existingIndex, 1);
            this.rebuildIndices(existingIndex);
        }

        this.idToIndex.set(id, this.ids.length);
        this.ids.push(id);
        this.model.append(label);
    }

    public removeItem(id: string): void {
        const index = this.idToIndex.get(id);
        if (index === undefined) return;

        this.model.remove(index);
        this.ids.splice(index, 1);
        this.idToIndex.delete(id);
        this.rebuildIndices(index);
    }

    public insertItemBefore(id: string, beforeId: string, label: string): void {
        const beforeIndex = this.idToIndex.get(beforeId);
        if (beforeIndex === undefined) {
            this.addItem(id, label);
        } else {
            this.ids.splice(beforeIndex, 0, id);
            this.rebuildIndices(beforeIndex);
            this.model.splice(beforeIndex, 0, [label]);
        }
    }

    public updateItem(id: string, label: string): void {
        const index = this.idToIndex.get(id);
        if (index === undefined) {
            this.addItem(id, label);
            return;
        }
        this.model.splice(index, 1, [label]);
    }

    public getItem(id: string) {
        const index = this.idToIndex.get(id);
        if (index === undefined) return null;
        return this.model.getString(index);
    }

    public getIdAtIndex(index: number): string | null {
        return this.ids[index] ?? null;
    }

    public getIndexById(id: string): number | null {
        return this.idToIndex.get(id) ?? null;
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
