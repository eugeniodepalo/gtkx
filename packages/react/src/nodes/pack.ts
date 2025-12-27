import * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { PackChild } from "./pack-child.js";
import { WidgetNode } from "./widget.js";

type PackableWidget = Gtk.Widget & {
    packStart(child: Gtk.Widget): void;
    packEnd(child: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
};

class PackNode extends WidgetNode<PackableWidget> {
    public static override priority = 0;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass): boolean {
        if (
            !containerOrClass ||
            (typeof containerOrClass !== "function" && !(containerOrClass instanceof Gtk.Widget))
        ) {
            return false;
        }

        const protoOrInstance = typeof containerOrClass === "function" ? containerOrClass.prototype : containerOrClass;
        return "packStart" in protoOrInstance && "packEnd" in protoOrInstance && "remove" in protoOrInstance;
    }

    public override appendChild(child: Node): void {
        if (child instanceof PackChild) {
            child.setParent(this.container);
            return;
        }

        super.appendChild(child);
    }

    public override insertBefore(child: Node): void {
        this.appendChild(child);
    }

    public override removeChild(child: Node): void {
        if (child instanceof PackChild) {
            return;
        }

        super.removeChild(child);
    }
}

registerNodeClass(PackNode);
