import * as GtkSource from "@gtkx/ffi/gtksource";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { isContainerType } from "./internal/utils.js";
import { SourceBufferNode } from "./source-buffer.js";
import { WidgetNode } from "./widget.js";

class SourceViewNode extends WidgetNode<GtkSource.View> {
    public static override priority = 1;

    private bufferChild?: SourceBufferNode;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return isContainerType(GtkSource.View, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (this.tryAttachSourceBuffer(child)) return;
        super.appendChild(child);
    }

    public override insertBefore(child: Node, before: Node): void {
        if (this.tryAttachSourceBuffer(child)) return;
        super.insertBefore(child, before);
    }

    public override removeChild(child: Node): void {
        if (child instanceof SourceBufferNode) {
            if (this.bufferChild === child) {
                this.bufferChild = undefined;
            }
            return;
        }
        super.removeChild(child);
    }

    private tryAttachSourceBuffer(child: Node): boolean {
        if (!(child instanceof SourceBufferNode)) return false;

        if (this.bufferChild) {
            throw new Error("SourceView can only have one SourceBuffer child");
        }

        this.bufferChild = child;
        child.setSourceView(this.container);
        return true;
    }
}

registerNodeClass(SourceViewNode);
