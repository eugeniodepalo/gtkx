import * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { ActionRowChild } from "./action-row-child.js";
import { WidgetNode } from "./widget.js";

type PrefixSuffixWidget = Gtk.Widget & {
    addPrefix(child: Gtk.Widget): void;
    addSuffix(child: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
};

class ActionRowNode extends WidgetNode<PrefixSuffixWidget> {
    public static override priority = 0;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass): boolean {
        if (
            !containerOrClass ||
            (typeof containerOrClass !== "function" && !(containerOrClass instanceof Gtk.Widget))
        ) {
            return false;
        }

        const protoOrInstance = typeof containerOrClass === "function" ? containerOrClass.prototype : containerOrClass;
        return "addPrefix" in protoOrInstance && "addSuffix" in protoOrInstance && "remove" in protoOrInstance;
    }

    public override appendChild(child: Node): void {
        if (child instanceof ActionRowChild) {
            child.setParent(this.container);
            return;
        }

        super.appendChild(child);
    }

    public override insertBefore(child: Node): void {
        this.appendChild(child);
    }

    public override removeChild(child: Node): void {
        if (child instanceof ActionRowChild) {
            return;
        }

        super.removeChild(child);
    }
}

registerNodeClass(ActionRowNode);
