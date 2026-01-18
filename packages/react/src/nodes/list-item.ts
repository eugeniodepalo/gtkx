import type { ListItemProps } from "../jsx.js";
import { registerNodeClass } from "../registry.js";
import type { ListStore } from "./internal/list-store.js";
import { hasChanged } from "./internal/utils.js";
import { VirtualNode } from "./virtual.js";

type Props = Partial<ListItemProps>;

export class ListItemNode<
    T extends { updateItem(id: string, value: unknown): void } = ListStore,
    P extends Props = Props,
> extends VirtualNode<P> {
    public static override priority = 1;

    private store: T | null = null;

    public static override matches(type: string): boolean {
        return type === "ListItem";
    }

    public setStore(store: T | null): void {
        this.store = store;
    }

    public override updateProps(oldProps: P | null, newProps: P): void {
        super.updateProps(oldProps, newProps);
        this.applyOwnProps(oldProps, newProps);
    }

    protected applyOwnProps(oldProps: P | null, newProps: P): void {
        if (!this.store) return;

        if (hasChanged(oldProps, newProps, "id") || hasChanged(oldProps, newProps, "value")) {
            if (newProps.id !== undefined) {
                this.store.updateItem(newProps.id, newProps.value);
            }
        }
    }
}

registerNodeClass(ListItemNode);
