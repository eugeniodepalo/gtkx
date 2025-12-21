import * as Adw from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass, Props } from "../types.js";
import { filterProps, isContainerType } from "./internal/utils.js";
import { SimpleListStore } from "./internal/simple-list-store.js";
import { SimpleListItemNode } from "./simple-list-item.js";
import { WidgetNode } from "./widget.js";

const PROP_NAMES = ["selectedId", "onSelectionChanged"];

type SimpleListViewProps = Props & {
    selectedId?: string;
    onSelectionChanged?: (id: string) => void;
};

class SimpleListViewNode extends WidgetNode<Gtk.DropDown | Adw.ComboRow, SimpleListViewProps> {
    public static override priority = 1;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass): boolean {
        return isContainerType(Gtk.DropDown, containerOrClass) || isContainerType(Adw.ComboRow, containerOrClass);
    }

    private store = new SimpleListStore();

    public override mount(): void {
        super.mount();
        this.container.setModel(this.store.getModel());
    }

    public override updateProps(oldProps: SimpleListViewProps | null, newProps: SimpleListViewProps): void {
        if (!oldProps || oldProps.onSelectionChanged !== newProps.onSelectionChanged) {
            const onSelectionChanged = newProps.onSelectionChanged;
            const handleSelectionChange = onSelectionChanged
                ? () => {
                      const selectedIndex = this.container.getSelected();
                      const id = this.store.getIdAtIndex(selectedIndex);
                      if (id !== undefined) {
                          onSelectionChanged(id);
                      }
                  }
                : undefined;
            this.signalStore.set(this.container, "notify::selected", handleSelectionChange);
        }

        if (!oldProps || oldProps.selectedId !== newProps.selectedId) {
            this.signalStore.block(() => {
                const index =
                    newProps.selectedId !== undefined ? this.store.getIndexById(newProps.selectedId) : undefined;
                if (index !== undefined) {
                    this.container.setSelected(index);
                }
            });
        }

        super.updateProps(filterProps(oldProps ?? {}, PROP_NAMES), filterProps(newProps, PROP_NAMES));
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof SimpleListItemNode)) {
            throw new Error(`Cannot append child of type ${child.typeName} to SimpleListView`);
        }

        const { id, value } = child.props;
        if (!id || value === undefined) {
            throw new Error("SimpleListItem requires id and value props");
        }

        child.setStore(this.store);
        this.store.addItem(id, value);
    }

    public override insertBefore(child: Node, before: Node): void {
        if (!(child instanceof SimpleListItemNode) || !(before instanceof SimpleListItemNode)) {
            throw new Error(`Cannot insert child of type ${child.typeName} in SimpleListView`);
        }

        const { id, value } = child.props;
        const beforeId = before.props.id;
        if (!id || value === undefined || !beforeId) {
            throw new Error("SimpleListItem requires id and value props");
        }

        child.setStore(this.store);
        this.store.insertItemBefore(id, value, beforeId);
    }

    public override removeChild(child: Node): void {
        if (!(child instanceof SimpleListItemNode)) {
            throw new Error(`Cannot remove child of type ${child.typeName} from SimpleListView`);
        }

        const { id } = child.props;
        if (!id) {
            throw new Error("SimpleListItem requires id prop");
        }

        this.store.removeItem(id);
    }
}

registerNodeClass(SimpleListViewNode);
