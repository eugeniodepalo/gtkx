import type * as Gtk from "@gtkx/ffi/gtk";
import { PREFIX_SUFFIX_INTERFACE_METHODS } from "../generated/internal.js";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { ActionRowChild } from "./action-row-child.js";
import { matchesInterface } from "./internal/utils.js";
import { SlotNode } from "./slot.js";
import { WidgetNode } from "./widget.js";

type PrefixSuffixWidget = Gtk.Widget & {
    addPrefix(child: Gtk.Widget): void;
    addSuffix(child: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
};

class ActionRowNode extends WidgetNode<PrefixSuffixWidget> {
    public static override priority = 0;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return matchesInterface(PREFIX_SUFFIX_INTERFACE_METHODS, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (child instanceof ActionRowChild) {
            child.setParent(this.container);
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.appendChild(child);
            return;
        }

        throw new Error(
            `Cannot append '${child.typeName}' to 'ActionRow': expected x.ActionRowPrefix, x.ActionRowSuffix, or Widget`,
        );
    }

    public override insertBefore(child: Node, before: Node): void {
        if (child instanceof ActionRowChild) {
            child.setParent(this.container);
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.insertBefore(child, before);
            return;
        }

        throw new Error(
            `Cannot insert '${child.typeName}' into 'ActionRow': expected x.ActionRowPrefix, x.ActionRowSuffix, or Widget`,
        );
    }

    public override removeChild(child: Node): void {
        if (child instanceof ActionRowChild) {
            child.unmount();
            return;
        }

        if (child instanceof SlotNode || child instanceof WidgetNode) {
            super.removeChild(child);
            return;
        }

        throw new Error(
            `Cannot remove '${child.typeName}' from 'ActionRow': expected x.ActionRowPrefix, x.ActionRowSuffix, or Widget`,
        );
    }
}

registerNodeClass(ActionRowNode);
