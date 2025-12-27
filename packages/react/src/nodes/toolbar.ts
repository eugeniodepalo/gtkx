import * as Adw from "@gtkx/ffi/adw";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { isContainerType } from "./internal/utils.js";
import { ToolbarChildNode } from "./toolbar-child.js";
import { WidgetNode } from "./widget.js";

class ToolbarNode extends WidgetNode<Adw.ToolbarView> {
    public static override priority = 0;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass): boolean {
        return isContainerType(Adw.ToolbarView, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (child instanceof ToolbarChildNode) {
            child.setParent(this.container);
            return;
        }

        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot append '${child.typeName}' to 'ToolbarView': expected Widget`);
        }

        this.container.setContent(child.container);
    }

    public override insertBefore(child: Node): void {
        if (child instanceof ToolbarChildNode) {
            child.setParent(this.container);
            return;
        }

        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot insert '${child.typeName}' to 'ToolbarView': expected Widget`);
        }

        this.container.setContent(child.container);
    }

    public override removeChild(child: Node): void {
        if (child instanceof ToolbarChildNode) {
            return;
        }

        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot remove '${child.typeName}' from 'ToolbarView': expected Widget`);
        }

        this.container.setContent(undefined);
    }
}

registerNodeClass(ToolbarNode);
