import * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { GridChildNode } from "./grid-child.js";
import { isContainerType } from "./internal/utils.js";
import { WidgetNode } from "./widget.js";

class GridNode extends WidgetNode<Gtk.Grid> {
    public static override priority = 1;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass): boolean {
        return isContainerType(Gtk.Grid, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof GridChildNode)) {
            throw new Error(`Cannot append '${child.typeName}' to 'Grid': expected GridChild`);
        }

        child.setGrid(this.container);
    }

    public override insertBefore(child: Node, _before: Node): void {
        this.appendChild(child);
    }

    public override removeChild(child: Node): void {
        if (!(child instanceof GridChildNode)) {
            throw new Error(`Cannot remove '${child.typeName}' from 'Grid': expected GridChild`);
        }

        child.setGrid(undefined);
    }
}

registerNodeClass(GridNode);
