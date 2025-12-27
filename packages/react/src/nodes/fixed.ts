import * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { FixedChildNode } from "./fixed-child.js";
import { isContainerType } from "./internal/utils.js";
import { WidgetNode } from "./widget.js";

class FixedNode extends WidgetNode<Gtk.Fixed> {
    public static override priority = 1;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass): boolean {
        return isContainerType(Gtk.Fixed, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof FixedChildNode)) {
            throw new Error(`Cannot append '${child.typeName}' to 'Fixed': expected FixedChild`);
        }

        child.setParent(this.container);
    }

    public override insertBefore(child: Node, _before: Node): void {
        this.appendChild(child);
    }

    public override removeChild(child: Node): void {
        if (!(child instanceof FixedChildNode)) {
            throw new Error(`Cannot remove '${child.typeName}' from 'Fixed': expected FixedChild`);
        }

        child.setParent(undefined);
    }
}

registerNodeClass(FixedNode);
