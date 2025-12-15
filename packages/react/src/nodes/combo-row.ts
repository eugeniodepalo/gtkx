import { getInterface } from "@gtkx/ffi";
import type * as Adw from "@gtkx/ffi/adw";
import * as Gio from "@gtkx/ffi/gio";
import * as Gtk from "@gtkx/ffi/gtk";
import type { ItemContainer } from "../container-interfaces.js";
import type { Props } from "../factory.js";
import { Node } from "../node.js";

type ItemLabelFn = (item: unknown) => string;

type ComboRowState = {
    store: ComboRowStore;
    onSelectionChanged?: (item: unknown, index: number) => void;
};

class ComboRowStore {
    private stringList: Gtk.StringList;
    private items: unknown[] = [];
    private labelFn: ItemLabelFn;

    constructor(labelFn: ItemLabelFn) {
        this.stringList = new Gtk.StringList([]);
        this.labelFn = labelFn;
    }

    getModel(): Gtk.StringList {
        return this.stringList;
    }

    append(item: unknown): void {
        const label = this.labelFn(item);
        this.stringList.append(label);
        this.items.push(item);
    }

    insertBefore(item: unknown, beforeItem: unknown): void {
        const beforeIndex = this.items.indexOf(beforeItem);

        if (beforeIndex === -1) {
            this.append(item);
            return;
        }

        const label = this.labelFn(item);
        this.stringList.splice(beforeIndex, 0, [label]);
        this.items.splice(beforeIndex, 0, item);
    }

    remove(item: unknown): void {
        const index = this.items.indexOf(item);

        if (index !== -1) {
            this.stringList.remove(index);
            this.items.splice(index, 1);
        }
    }

    update(oldItem: unknown, newItem: unknown): void {
        const index = this.items.indexOf(oldItem);

        if (index !== -1) {
            const label = this.labelFn(newItem);
            this.stringList.splice(index, 1, [label]);
            this.items[index] = newItem;
        }
    }

    getItem(index: number): unknown {
        return this.items[index];
    }
}

export class ComboRowNode extends Node<Adw.ComboRow, ComboRowState> implements ItemContainer<unknown> {
    static matches(type: string): boolean {
        return type === "AdwComboRow.Root";
    }

    override initialize(props: Props): void {
        const labelFn = (props.itemLabel as ItemLabelFn) ?? ((item: unknown) => String(item));
        const store = new ComboRowStore(labelFn);
        const onSelectionChanged = props.onSelectionChanged as ((item: unknown, index: number) => void) | undefined;

        this.state = { store, onSelectionChanged };

        super.initialize(props);

        this.widget.setModel(getInterface(store.getModel(), Gio.ListModel));

        if (onSelectionChanged) {
            const handler = () => {
                const index = this.widget.getSelected();
                const item = this.state.store.getItem(index);
                this.state.onSelectionChanged?.(item, index);
            };

            this.connectSignal(this.widget, "notify::selected", handler);
        }
    }

    addItem(item: unknown): void {
        this.state.store.append(item);
    }

    insertItemBefore(item: unknown, beforeItem: unknown): void {
        this.state.store.insertBefore(item, beforeItem);
    }

    removeItem(item: unknown): void {
        this.state.store.remove(item);
    }

    updateItem(oldItem: unknown, newItem: unknown): void {
        this.state.store.update(oldItem, newItem);
    }

    protected override consumedProps(): Set<string> {
        const consumed = super.consumedProps();
        consumed.add("itemLabel");
        consumed.add("onSelectionChanged");
        return consumed;
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        if (oldProps.onSelectionChanged !== newProps.onSelectionChanged) {
            this.state.onSelectionChanged = newProps.onSelectionChanged as
                | ((item: unknown, index: number) => void)
                | undefined;
        }

        super.updateProps(oldProps, newProps);
    }
}
