import type * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import { VirtualChildNode } from "./virtual-child.js";

type PackableWidget = Gtk.Widget & {
    packStart(child: Gtk.Widget): void;
    packEnd(child: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
};

export class PackChild extends VirtualChildNode<PackableWidget> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "PackStart" || type === "PackEnd";
    }

    protected override getPositionLabel(): string {
        return this.typeName === "PackStart" ? "start" : "end";
    }

    protected override attachChild(parent: PackableWidget, widget: Gtk.Widget): void {
        if (this.getPositionLabel() === "start") {
            parent.packStart(widget);
        } else {
            parent.packEnd(widget);
        }
    }
}

registerNodeClass(PackChild);
