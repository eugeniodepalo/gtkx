import type * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { PREFIX_SUFFIX_INTERFACE_METHODS } from "../reconciler-metadata.js";
import { registerNodeClass } from "../registry.js";
import type { Container } from "../types.js";
import { VirtualContainerNode } from "./abstract/virtual-container.js";
import { matchesInterface } from "./internal/utils.js";

type PrefixSuffixWidget = Gtk.Widget & {
    addPrefix(child: Gtk.Widget): void;
    addSuffix(child: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
};

class ActionRowPrefixNode extends VirtualContainerNode<PrefixSuffixWidget> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "ActionRowPrefix";
    }

    public override canBeChildOf(parent: Node): boolean {
        return matchesInterface(PREFIX_SUFFIX_INTERFACE_METHODS, parent.container as Container);
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

    public override canBeChildOf(parent: Node): boolean {
        return matchesInterface(PREFIX_SUFFIX_INTERFACE_METHODS, parent.container as Container);
    }

    protected override attachChild(parent: PrefixSuffixWidget, widget: Gtk.Widget): void {
        parent.addSuffix(widget);
    }
}

registerNodeClass(ActionRowPrefixNode);
registerNodeClass(ActionRowSuffixNode);
