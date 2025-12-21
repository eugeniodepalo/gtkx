import * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { WidgetNode } from "./widget.js";
import { isContainerType } from "./internal/helpers.js";

export class OverlayNode extends WidgetNode<Gtk.Overlay> {
    public static override priority = 1;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass): boolean {
        return isContainerType(Gtk.Overlay, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot append child of type ${child.typeName} to Overlay`);
        }

        if (!this.container.getChild()) {
            this.container.setChild(child.container);
        } else {
            this.container.addOverlay(child.container);
        }
    }

    public override insertBefore(child: Node, _before: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot insert child of type ${child.typeName} in Overlay`);
        }

        if (!this.container.getChild()) {
            this.container.setChild(child.container);
        } else {
            this.container.addOverlay(child.container);
        }
    }

    public override removeChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot remove child of type ${child.typeName} from Overlay`);
        }

        if (this.container.getChild() === child.container) {
            this.container.setChild(undefined);
        } else {
            this.container.removeOverlay(child.container);
        }
    }
}

registerNodeClass(OverlayNode);
