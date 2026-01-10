import { isObjectEqual } from "@gtkx/ffi";
import type * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { CommitPriority, scheduleAfterCommit } from "../scheduler.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

type ChildParentWidget = Gtk.Widget & {
    remove(child: Gtk.Widget): void;
};

export abstract class VirtualChildNode<P extends ChildParentWidget = ChildParentWidget> extends VirtualNode {
    protected parent?: P;
    protected children: Gtk.Widget[] = [];

    public setParent(newParent?: P): void {
        this.parent = newParent;
    }

    protected abstract getPositionLabel(): string;
    protected abstract attachChild(parent: P, widget: Gtk.Widget): void;

    public override unmount(): void {
        const parent = this.parent;
        const childrenToRemove = [...this.children];

        if (parent && childrenToRemove.length > 0) {
            scheduleAfterCommit(() => {
                for (const widget of childrenToRemove) {
                    const currentParent = widget.getParent();

                    if (currentParent && isObjectEqual(currentParent, parent)) {
                        parent.remove(widget);
                    }
                }
            }, CommitPriority.HIGH);
        }

        this.children = [];
        this.parent = undefined;
        super.unmount();
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot append '${child.typeName}' to '${this.typeName}': expected Widget`);
        }

        const widget = child.container;
        this.children.push(widget);

        scheduleAfterCommit(() => {
            if (this.parent) {
                this.attachChild(this.parent, widget);
            }
        });
    }

    public override insertBefore(child: Node): void {
        this.appendChild(child);
    }

    public override removeChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot remove '${child.typeName}' from '${this.typeName}': expected Widget`);
        }

        const widget = child.container;
        const parent = this.parent;
        const index = this.children.indexOf(widget);

        if (index !== -1) {
            this.children.splice(index, 1);
        }

        scheduleAfterCommit(() => {
            if (parent) {
                const currentParent = widget.getParent();

                if (currentParent && isObjectEqual(currentParent, parent)) {
                    parent.remove(widget);
                }
            }
        }, CommitPriority.HIGH);
    }
}
