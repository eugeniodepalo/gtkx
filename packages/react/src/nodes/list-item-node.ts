import type * as Gtk from "@gtkx/ffi/gtk";
import { Node } from "../node.js";
import type { Container, Props } from "../types.js";
import { WidgetNode } from "./widget.js";

export class ListItemNode extends Node<Gtk.ListItem | Gtk.ListHeader, Props, Node, WidgetNode> {
    public override isValidChild(child: Node): boolean {
        return child instanceof WidgetNode;
    }

    public override appendChild(child: WidgetNode): void {
        super.appendChild(child);
        this.container.setChild(child.container);
    }

    public override removeChild(child: WidgetNode): void {
        this.container.setChild(null);
        super.removeChild(child);
    }

    public override insertBefore(child: WidgetNode, before: WidgetNode): void {
        super.insertBefore(child, before);
        this.container.setChild(child.container);
    }

    public static override createContainer(): Container {
        throw new Error("ListItemNode does not support container creation");
    }
}
