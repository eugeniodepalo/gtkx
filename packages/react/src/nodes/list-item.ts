import type { ListItemProps } from "../jsx.js";
import type { ListStore } from "./internal/list-store.js";
import { hasChanged } from "./internal/props.js";
import { VirtualNode } from "./virtual.js";

export class ListItemNode<
    T extends { updateItem(id: string, value: unknown): void } = ListStore,
    P extends ListItemProps = ListItemProps,
> extends VirtualNode<P> {
    private store: T | null = null;

    public setStore(store: T | null): void {
        this.store = store;
    }

    public override commitUpdate(oldProps: P | null, newProps: P): void {
        super.commitUpdate(oldProps, newProps);
        this.applyOwnProps(oldProps, newProps);
    }

    private applyOwnProps(oldProps: P | null, newProps: P): void {
        if (!this.store) return;

        if (hasChanged(oldProps, newProps, "id") || hasChanged(oldProps, newProps, "value")) {
            this.store.updateItem(newProps.id, newProps.value);
        }
    }
}
