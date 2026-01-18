import type * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import { VirtualContainerNode } from "./abstract/virtual-container.js";
import type { ExpanderRowWidget } from "./expander-row.js";

class ExpanderRowRowNode extends VirtualContainerNode<ExpanderRowWidget> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "ExpanderRowRow";
    }

    protected override attachChild(parent: ExpanderRowWidget, widget: Gtk.Widget): void {
        parent.addRow(widget);
    }
}

class ExpanderRowActionNode extends VirtualContainerNode<ExpanderRowWidget> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "ExpanderRowAction";
    }

    protected override attachChild(parent: ExpanderRowWidget, widget: Gtk.Widget): void {
        parent.addAction(widget);
    }
}

registerNodeClass(ExpanderRowRowNode);
registerNodeClass(ExpanderRowActionNode);
