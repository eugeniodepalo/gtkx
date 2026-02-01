import type { ListItemProps } from "../jsx.js";
import type { Node } from "../node.js";
import { hasChanged } from "./internal/props.js";
import { type TreeItemData, TreeStore } from "./internal/tree-store.js";
import { VirtualNode } from "./virtual.js";

type ItemStore = { updateItem(id: string, value: unknown): void };

export class ListItemNode extends VirtualNode<ListItemProps, Node, ListItemNode> {
    private store: ItemStore | null = null;
    private parentItemId: string | null = null;

    public static createItemData(props: ListItemProps): TreeItemData {
        return {
            value: props.value,
            indentForDepth: props.indentForDepth,
            indentForIcon: props.indentForIcon,
            hideExpander: props.hideExpander,
        };
    }

    public override isValidChild(child: Node): boolean {
        return child instanceof ListItemNode;
    }

    public override appendChild(child: ListItemNode): void {
        super.appendChild(child);
        child.setParentItemId(this.props.id);

        if (this.store instanceof TreeStore) {
            this.store.addItem(child.props.id, ListItemNode.createItemData(child.props), this.props.id);
            child.setStore(this.store);
        }
    }

    public override insertBefore(child: ListItemNode, before: ListItemNode): void {
        super.insertBefore(child, before);
        child.setParentItemId(this.props.id);

        if (this.store instanceof TreeStore) {
            this.store.insertItemBefore(
                child.props.id,
                before.props.id,
                ListItemNode.createItemData(child.props),
                this.props.id,
            );
            child.setStore(this.store);
        }
    }

    public override removeChild(child: ListItemNode): void {
        if (this.store instanceof TreeStore) {
            this.store.removeItem(child.props.id, this.props.id);
        }

        child.setStore(null);
        child.setParentItemId(null);
        super.removeChild(child);
    }

    public override commitUpdate(oldProps: ListItemProps | null, newProps: ListItemProps): void {
        super.commitUpdate(oldProps, newProps);
        this.applyOwnProps(oldProps, newProps);
    }

    private applyOwnProps(oldProps: ListItemProps | null, newProps: ListItemProps): void {
        if (!this.store) return;

        if (this.store instanceof TreeStore) {
            const propsChanged =
                hasChanged(oldProps, newProps, "id") ||
                hasChanged(oldProps, newProps, "value") ||
                hasChanged(oldProps, newProps, "indentForDepth") ||
                hasChanged(oldProps, newProps, "indentForIcon") ||
                hasChanged(oldProps, newProps, "hideExpander");

            if (propsChanged) {
                this.store.updateItem(newProps.id, ListItemNode.createItemData(newProps));
            }
        } else {
            if (hasChanged(oldProps, newProps, "id") || hasChanged(oldProps, newProps, "value")) {
                this.store.updateItem(newProps.id, newProps.value);
            }
        }
    }

    public setStore(store: ItemStore | null): void {
        this.store = store;
        if (store === null || store instanceof TreeStore) {
            for (const child of this.children) {
                child.setStore(store);
            }
        }
    }

    public getChildNodes(): readonly ListItemNode[] {
        return this.children;
    }

    public setParentItemId(parentId: string | null): void {
        this.parentItemId = parentId;
    }

    public getParentItemId(): string | null {
        return this.parentItemId;
    }
}
