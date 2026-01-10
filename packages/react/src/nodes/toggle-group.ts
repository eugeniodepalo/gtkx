import * as Adw from "@gtkx/ffi/adw";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { isContainerType } from "./internal/utils.js";
import { SlotNode } from "./slot.js";
import { ToggleNode } from "./toggle.js";
import { WidgetNode } from "./widget.js";

class ToggleGroupNode extends WidgetNode<Adw.ToggleGroup> {
    public static override priority = 1;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return isContainerType(Adw.ToggleGroup, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (child instanceof ToggleNode) {
            child.setToggleGroup(this.container);
            child.addToGroup();
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.appendChild(child);
            return;
        }

        throw new Error(`Cannot append '${child.typeName}' to 'ToggleGroup': expected x.Toggle or Widget`);
    }

    public override insertBefore(child: Node, before: Node): void {
        if (child instanceof ToggleNode) {
            child.setToggleGroup(this.container);
            child.addToGroup();
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.insertBefore(child, before);
            return;
        }

        throw new Error(`Cannot insert '${child.typeName}' into 'ToggleGroup': expected x.Toggle or Widget`);
    }

    public override removeChild(child: Node): void {
        if (child instanceof ToggleNode) {
            child.removeFromGroup();
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.removeChild(child);
            return;
        }

        throw new Error(`Cannot remove '${child.typeName}' from 'ToggleGroup': expected x.Toggle or Widget`);
    }
}

registerNodeClass(ToggleGroupNode);
