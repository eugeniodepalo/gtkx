import * as Adw from "@gtkx/ffi/adw";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { ToolbarChildNode } from "./toolbar-child.js";
import { WidgetNode } from "./widget.js";
import { isContainerType } from "./internal/helpers.js";

export class ToolbarNode extends WidgetNode<Adw.ToolbarView> {
    public static override priority = 0;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass): boolean {
        return isContainerType(Adw.ToolbarView, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof ToolbarChildNode)) {
            throw new Error(`Cannot append child of type ${child.typeName} to ToolbarView`);
        }

        child.setToolbar(this.container);
    }

    public override insertBefore(child: Node): void {
        if (!(child instanceof ToolbarChildNode)) {
            throw new Error(`Cannot insert child of type ${child.typeName} in ToolbarView`);
        }

        child.setToolbar(this.container);
    }

    public override removeChild(child: Node): void {
        if (!(child instanceof ToolbarChildNode)) {
            throw new Error(`Cannot remove child of type ${child.typeName} from ToolbarView`);
        }

        child.setToolbar(undefined);
    }
}

registerNodeClass(ToolbarNode);
