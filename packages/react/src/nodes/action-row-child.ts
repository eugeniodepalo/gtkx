import type * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import { VirtualContainerNode } from "./abstract/virtual-container.js";
import type { PrefixSuffixWidget } from "./action-row.js";

class ActionRowPrefixNode extends VirtualContainerNode<PrefixSuffixWidget> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "ActionRowPrefix";
    }

    protected override attachChild(parent: PrefixSuffixWidget, widget: Gtk.Widget): void {
        parent.addPrefix(widget);
    }
}

class ActionRowSuffixNode extends VirtualContainerNode<PrefixSuffixWidget> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "ActionRowSuffix";
    }

    protected override attachChild(parent: PrefixSuffixWidget, widget: Gtk.Widget): void {
        parent.addSuffix(widget);
    }
}

registerNodeClass(ActionRowPrefixNode);
registerNodeClass(ActionRowSuffixNode);
