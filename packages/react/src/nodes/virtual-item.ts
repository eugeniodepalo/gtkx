import type { ItemContainer } from "../containers.js";
import type { Props } from "../factory.js";
import type { Node } from "../node.js";
import { Node as NodeClass } from "../node.js";
import { isItemContainer } from "../predicates.js";

export abstract class VirtualItemNode extends NodeClass<never> {
    static override consumedPropNames = ["id", "item"];

    protected override isVirtual(): boolean {
        return true;
    }

    private id = "";
    private item: unknown;
    private parentContainer: (Node & ItemContainer<unknown>) | null = null;

    override initialize(props: Props): void {
        this.id = props.id as string;
        this.item = props.item;
        super.initialize(props);
    }

    getId(): string {
        return this.id;
    }

    getItem(): unknown {
        return this.item;
    }

    setParentContainer(container: Node & ItemContainer<unknown>): void {
        this.parentContainer = container;
    }

    addToContainer(container: ItemContainer<unknown>): void {
        container.addItem(this.id, this.item);
    }

    insertBeforeInContainer(container: ItemContainer<unknown>, beforeId: string): void {
        container.insertItemBefore(this.id, this.item, beforeId);
    }

    override unmount(): void {
        if (this.parentContainer) {
            this.parentContainer.removeItem(this.id);
        }
        this.parentContainer = null;
        super.unmount();
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        const newId = newProps.id as string;
        const newItem = newProps.item;

        if ((oldProps.id !== newId || oldProps.item !== newItem) && this.parent && isItemContainer(this.parent)) {
            this.parent.updateItem(newId, newItem);
            this.id = newId;
            this.item = newItem;
        }

        super.updateProps(oldProps, newProps);
    }
}
