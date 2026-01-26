import type * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container } from "../types.js";
import { VirtualContainerNode } from "./abstract/virtual-container.js";
import { matchesInterface } from "./internal/utils.js";

type ExpanderRowWidget = Gtk.Widget & {
    addRow(child: Gtk.Widget): void;
    addAction(child: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
};

const EXPANDER_ROW_INTERFACE_METHODS = ["addRow", "addAction", "remove"] as const;

class ExpanderRowRowNode extends VirtualContainerNode<ExpanderRowWidget> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "ExpanderRowRow";
    }

    public override canBeChildOf(parent: Node): boolean {
        return matchesInterface(EXPANDER_ROW_INTERFACE_METHODS, parent.container as Container);
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

    public override canBeChildOf(parent: Node): boolean {
        return matchesInterface(EXPANDER_ROW_INTERFACE_METHODS, parent.container as Container);
    }

    protected override attachChild(parent: ExpanderRowWidget, widget: Gtk.Widget): void {
        parent.addAction(widget);
    }
}

registerNodeClass(ExpanderRowRowNode);
registerNodeClass(ExpanderRowActionNode);
