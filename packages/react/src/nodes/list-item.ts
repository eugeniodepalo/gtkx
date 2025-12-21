import { registerNodeClass } from "../registry.js";
import type { ListStore } from "./internal/list-store.js";
import { VirtualNode } from "./virtual.js";

type ListItemProps<T = unknown> = {
    id: string;
    value: T;
};

export class ListItemNode<
    T extends Omit<ListStore, "items" | "model"> = ListStore,
    P extends ListItemProps = ListItemProps,
> extends VirtualNode<P> {
    public static override priority = 1;

    private store?: T;

    public static override matches(type: string): boolean {
        return type === "ListItem";
    }

    private getStore(): T {
        if (!this.store) {
            throw new Error("ListItemNode store is not set");
        }

        return this.store;
    }

    public setStore(store?: T): void {
        this.store = store;
    }

    public override updateProps(oldProps: P | null, newProps: P): void {
        if (!oldProps || oldProps.id !== newProps.id || oldProps.value !== newProps.value) {
            this.getStore().updateItem(newProps.id, newProps.value);
        }
    }
}

registerNodeClass(ListItemNode);
