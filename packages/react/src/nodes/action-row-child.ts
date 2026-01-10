import type * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import { VirtualChildNode } from "./virtual-child.js";

type PrefixSuffixWidget = Gtk.Widget & {
    addPrefix(child: Gtk.Widget): void;
    addSuffix(child: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
};

export class ActionRowChild extends VirtualChildNode<PrefixSuffixWidget> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "ActionRowPrefix" || type === "ActionRowSuffix";
    }

    protected override getPositionLabel(): string {
        return this.typeName === "ActionRowPrefix" ? "prefix" : "suffix";
    }

    protected override attachChild(parent: PrefixSuffixWidget, widget: Gtk.Widget): void {
        if (this.getPositionLabel() === "prefix") {
            parent.addPrefix(widget);
        } else {
            parent.addSuffix(widget);
        }
    }
}

registerNodeClass(ActionRowChild);
