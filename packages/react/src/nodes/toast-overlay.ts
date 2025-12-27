import * as Adw from "@gtkx/ffi/adw";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { isContainerType } from "./internal/utils.js";
import { ToastNode } from "./toast.js";
import { WidgetNode } from "./widget.js";

class ToastOverlayNode extends WidgetNode<Adw.ToastOverlay> {
    public static override priority = 1;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass): boolean {
        return isContainerType(Adw.ToastOverlay, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (child instanceof ToastNode) {
            child.setParent(this.container);
            return;
        }

        if (child instanceof WidgetNode) {
            this.container.setChild(child.container);
            return;
        }

        throw new Error(`Cannot append '${child.typeName}' to 'ToastOverlay': expected Widget or Toast`);
    }

    public override insertBefore(child: Node, _before: Node): void {
        this.appendChild(child);
    }

    public override removeChild(child: Node): void {
        if (child instanceof ToastNode) {
            return;
        }

        if (child instanceof WidgetNode) {
            this.container.setChild(undefined);
        }
    }
}

registerNodeClass(ToastOverlayNode);
