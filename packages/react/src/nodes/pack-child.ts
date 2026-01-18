import type * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import { VirtualContainerNode } from "./abstract/virtual-container.js";
import type { PackableWidget } from "./pack.js";

class PackStartNode extends VirtualContainerNode<PackableWidget> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "PackStart";
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

    protected override attachChild(parent: PackableWidget, widget: Gtk.Widget): void {
        parent.packEnd(widget);
    }
}

registerNodeClass(PackStartNode);
registerNodeClass(PackEndNode);
