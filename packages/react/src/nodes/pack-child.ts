import type * as Gtk from "@gtkx/ffi/gtk";
import { PACK_INTERFACE_METHODS } from "../generated/internal.js";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container } from "../types.js";
import { VirtualContainerNode } from "./abstract/virtual-container.js";
import { matchesInterface } from "./internal/utils.js";

type PackableWidget = Gtk.Widget & {
    packStart(child: Gtk.Widget): void;
    packEnd(child: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
};

class PackStartNode extends VirtualContainerNode<PackableWidget> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "PackStart";
    }

    public override canBeChildOf(parent: Node): boolean {
        return matchesInterface(PACK_INTERFACE_METHODS, parent.container as Container);
    }

    protected override attachChild(parent: PackableWidget, widget: Gtk.Widget): void {
        parent.packStart(widget);
    }
}

class PackEndNode extends VirtualContainerNode<PackableWidget> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "PackEnd";
    }

    public override canBeChildOf(parent: Node): boolean {
        return matchesInterface(PACK_INTERFACE_METHODS, parent.container as Container);
    }

    protected override attachChild(parent: PackableWidget, widget: Gtk.Widget): void {
        parent.packEnd(widget);
    }
}

registerNodeClass(PackStartNode);
registerNodeClass(PackEndNode);
