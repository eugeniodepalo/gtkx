import type * as Gtk from "@gtkx/ffi/gtk";
import { PACK_INTERFACE_METHODS } from "../generated/internal.js";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { matchesInterface } from "./internal/utils.js";
import { PackChild } from "./pack-child.js";
import { SlotNode } from "./slot.js";
import { WidgetNode } from "./widget.js";

type PackableWidget = Gtk.Widget & {
    packStart(child: Gtk.Widget): void;
    packEnd(child: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
};

class PackNode extends WidgetNode<PackableWidget> {
    public static override priority = 0;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return matchesInterface(PACK_INTERFACE_METHODS, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (child instanceof PackChild) {
            child.setParent(this.container);
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.appendChild(child);
            return;
        }

        throw new Error(`Cannot append '${child.typeName}' to 'Pack': expected x.PackStart, x.PackEnd, or Widget`);
    }

    public override insertBefore(child: Node, before: Node): void {
        if (child instanceof PackChild) {
            child.setParent(this.container);
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.insertBefore(child, before);
            return;
        }

        throw new Error(`Cannot insert '${child.typeName}' into 'Pack': expected x.PackStart, x.PackEnd, or Widget`);
    }

    public override removeChild(child: Node): void {
        if (child instanceof PackChild) {
            child.unmount();
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.removeChild(child);
            return;
        }

        throw new Error(`Cannot remove '${child.typeName}' from 'Pack': expected x.PackStart, x.PackEnd, or Widget`);
    }
}

registerNodeClass(PackNode);
