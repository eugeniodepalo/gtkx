import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import { VirtualChildNode } from "./virtual-child.js";

type ExpanderRowWidget = Adw.ExpanderRow & {
    addRow(child: Gtk.Widget): void;
    addAction(widget: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
};

export class ExpanderRowChild extends VirtualChildNode<ExpanderRowWidget> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "ExpanderRowRow" || type === "ExpanderRowAction";
    }

    protected override getPositionLabel(): string {
        return this.typeName === "ExpanderRowRow" ? "row" : "action";
    }

    protected override attachChild(parent: ExpanderRowWidget, widget: Gtk.Widget): void {
        if (this.getPositionLabel() === "row") {
            parent.addRow(widget);
        } else {
            parent.addAction(widget);
        }
    }
}

registerNodeClass(ExpanderRowChild);
