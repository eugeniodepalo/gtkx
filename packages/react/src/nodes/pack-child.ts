import type * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

type PackableWidget = Gtk.Widget & {
    packStart(child: Gtk.Widget): void;
    packEnd(child: Gtk.Widget): void;
    remove(child: Gtk.Widget): void;
};

export class PackStartNode extends VirtualNode<unknown, WidgetNode<PackableWidget>, WidgetNode> {
    private parentWidget: PackableWidget | null = null;

    public override canAcceptChild(child: Node): boolean {
        return child instanceof WidgetNode;
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot append '${child.typeName}' to '${this.typeName}': expected Widget`);
        }

        super.appendChild(child);

        if (this.parentWidget) {
            this.parentWidget.packStart(child.container);
        }
    }

    public override insertBefore(child: Node, before: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot insert '${child.typeName}' into '${this.typeName}': expected Widget`);
        }

        super.insertBefore(child, before);

        if (this.parentWidget) {
            this.parentWidget.packStart(child.container);
        }
    }

    public override removeChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot remove '${child.typeName}' from '${this.typeName}': expected Widget`);
        }

        if (this.parentWidget) {
            const currentParent = child.container.getParent();
            if (currentParent && currentParent === this.parentWidget) {
                this.parentWidget.remove(child.container);
            }
        }

        super.removeChild(child);
    }

    public override onAddedToParent(parent: Node): void {
        if (parent instanceof WidgetNode) {
            this.parentWidget = parent.container as PackableWidget;
            for (const child of this.children) {
                if (child instanceof WidgetNode && this.parentWidget) {
                    this.parentWidget.packStart(child.container);
                }
            }
        }
    }

    public override onRemovedFromParent(parent: Node): void {
        if (parent instanceof WidgetNode) {
            this.detachAllChildren(parent.container as PackableWidget);
        }
        this.parentWidget = null;
    }

    public override detachDeletedInstance(): void {
        if (this.parentWidget) {
            this.detachAllChildren(this.parentWidget);
        }
        this.parentWidget = null;
        super.detachDeletedInstance();
    }

    private detachAllChildren(parent: PackableWidget): void {
        for (const child of this.children) {
            if (child instanceof WidgetNode) {
                const currentParent = child.container.getParent();
                if (currentParent && currentParent === parent) {
                    parent.remove(child.container);
                }
            }
        }
    }
}

export class PackEndNode extends VirtualNode<unknown, WidgetNode<PackableWidget>, WidgetNode> {
    private parentWidget: PackableWidget | null = null;

    public override canAcceptChild(child: Node): boolean {
        return child instanceof WidgetNode;
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot append '${child.typeName}' to '${this.typeName}': expected Widget`);
        }

        super.appendChild(child);

        if (this.parentWidget) {
            this.parentWidget.packEnd(child.container);
        }
    }

    public override insertBefore(child: Node, before: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot insert '${child.typeName}' into '${this.typeName}': expected Widget`);
        }

        super.insertBefore(child, before);

        if (this.parentWidget) {
            this.parentWidget.packEnd(child.container);
        }
    }

    public override removeChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot remove '${child.typeName}' from '${this.typeName}': expected Widget`);
        }

        if (this.parentWidget) {
            const currentParent = child.container.getParent();
            if (currentParent && currentParent === this.parentWidget) {
                this.parentWidget.remove(child.container);
            }
        }

        super.removeChild(child);
    }

    public override onAddedToParent(parent: Node): void {
        if (parent instanceof WidgetNode) {
            this.parentWidget = parent.container as PackableWidget;
            for (const child of this.children) {
                if (child instanceof WidgetNode && this.parentWidget) {
                    this.parentWidget.packEnd(child.container);
                }
            }
        }
    }

    public override onRemovedFromParent(parent: Node): void {
        if (parent instanceof WidgetNode) {
            this.detachAllChildren(parent.container as PackableWidget);
        }
        this.parentWidget = null;
    }

    public override detachDeletedInstance(): void {
        if (this.parentWidget) {
            this.detachAllChildren(this.parentWidget);
        }
        this.parentWidget = null;
        super.detachDeletedInstance();
    }

    private detachAllChildren(parent: PackableWidget): void {
        for (const child of this.children) {
            if (child instanceof WidgetNode) {
                const currentParent = child.container.getParent();
                if (currentParent && currentParent === parent) {
                    parent.remove(child.container);
                }
            }
        }
    }
}
