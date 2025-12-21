import * as Adw from "@gtkx/ffi/adw";
import * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { WidgetNode } from "./widget.js";
import { isContainerType } from "./internal/helpers.js";
import { SimpleListItemNode } from "./simple-list-item.js";
import { SimpleListStore } from "./internal/simple-list-store.js";

export class SimpleListViewNode extends WidgetNode<Gtk.DropDown | Adw.ComboRow> {
    public static override priority = 1;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass): boolean {
        return isContainerType(Gtk.DropDown, containerOrClass) || isContainerType(Adw.ComboRow, containerOrClass);
    }

    private store = new SimpleListStore();

    public override appendChild(child: Node): void {
        if (!(child instanceof SimpleListItemNode)) {
            throw new Error(`Cannot append child of type ${child.typeName} to SimpleListView`);
        }

        child.setStore(this.store);
        this.store.addItem(child.props.id, child.props.value);
    }

    public override insertBefore(child: Node, before: Node): void {
        if (!(child instanceof SimpleListItemNode) || !(before instanceof SimpleListItemNode)) {
            throw new Error(`Cannot insert child of type ${child.typeName} in SimpleListView`);
        }

        child.setStore(this.store);
        this.store.insertItemBefore(child.props.id, child.props.value, before.props.id);
    }

    public override removeChild(child: Node): void {
        if (!(child instanceof SimpleListItemNode)) {
            throw new Error(`Cannot remove child of type ${child.typeName} from SimpleListView`);
        }

        this.store.removeItem(child.props.id);
    }
}

registerNodeClass(SimpleListViewNode);
