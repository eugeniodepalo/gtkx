import type * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../../node.js";
import type { Props } from "../../types.js";
import { SlotNode } from "../slot.js";
import { WidgetNode } from "../widget.js";
import { VirtualContainerNode } from "./virtual-container.js";

type PositionalChildParentWidget = Gtk.Widget & {
    remove(child: Gtk.Widget): void;
};

export abstract class PositionalParentNode<
    T extends PositionalChildParentWidget = PositionalChildParentWidget,
    P extends Props = Props,
> extends WidgetNode<T, P> {
    protected abstract acceptedPositionalChildTypes: Set<string>;
    protected abstract containerTypeName: string;

    private isPositionalChild(child: Node): child is VirtualContainerNode {
        return child instanceof VirtualContainerNode && this.acceptedPositionalChildTypes.has(child.typeName);
    }

    private formatExpectedTypes(): string {
        const types = Array.from(this.acceptedPositionalChildTypes)
            .map((t) => `x.${t}`)
            .join(", ");
        return `${types}, or Widget`;
    }

    private assertValidChild(
        child: Node,
        operation: "append" | "insert" | "remove",
    ): asserts child is SlotNode | WidgetNode {
        if (child instanceof SlotNode || child instanceof WidgetNode) return;

        const [verb, prep] =
            operation === "append"
                ? ["append", "to"]
                : operation === "insert"
                  ? ["insert", "into"]
                  : ["remove", "from"];

        throw new Error(
            `Cannot ${verb} '${child.typeName}' ${prep} '${this.containerTypeName}': expected ${this.formatExpectedTypes()}`,
        );
    }

    public override appendChild(child: Node): void {
        if (this.isPositionalChild(child)) {
            child.setParent(this.container);
            return;
        }
        this.assertValidChild(child, "append");
        super.appendChild(child);
    }

    public override insertBefore(child: Node, before: Node): void {
        if (this.isPositionalChild(child)) {
            child.setParent(this.container);
            return;
        }
        this.assertValidChild(child, "insert");
        super.insertBefore(child, before);
    }

    public override removeChild(child: Node): void {
        if (this.isPositionalChild(child)) {
            child.unmount();
            return;
        }
        this.assertValidChild(child, "remove");
        super.removeChild(child);
    }
}
