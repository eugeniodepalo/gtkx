import type * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import { scheduleAfterCommit } from "../scheduler.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

type PackChildPosition = "start" | "end";

type PackableWidget = Gtk.Widget & {
    packStart(child: Gtk.Widget): void;
    packEnd(child: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
};

export class PackChild extends VirtualNode {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "Pack.Start" || type === "Pack.End";
    }

    private parent?: PackableWidget;
    private children: Gtk.Widget[] = [];

    private getPosition(): PackChildPosition {
        return this.typeName === "Pack.Start" ? "start" : "end";
    }

    public setParent(newParent?: PackableWidget): void {
        this.parent = newParent;
    }

    public override unmount(): void {
        const parent = this.parent;
        const childrenToRemove = [...this.children];

        if (parent && childrenToRemove.length > 0) {
            scheduleAfterCommit(() => {
                for (const widget of childrenToRemove) {
                    parent.remove(widget);
                }
            });
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
                if (this.getPosition() === "start") {
                    this.parent.packStart(widget);
                } else {
                    this.parent.packEnd(widget);
                }
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
        const index = this.children.indexOf(widget);

        if (index !== -1) {
            this.children.splice(index, 1);
        }

        scheduleAfterCommit(() => {
            if (this.parent) {
                this.parent.remove(widget);
            }
        });
    }
}

registerNodeClass(PackChild);
