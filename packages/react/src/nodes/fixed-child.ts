import * as Gtk from "@gtkx/ffi/gtk";
import type { FixedChildProps } from "../jsx.js";
import type { Node } from "../node.js";
import { hasChanged } from "./internal/props.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

export class FixedChildNode extends VirtualNode<FixedChildProps, WidgetNode<Gtk.Fixed>, WidgetNode> {
    public override isValidChild(child: Node): boolean {
        return child instanceof WidgetNode;
    }

    public override isValidParent(parent: Node): boolean {
        return parent instanceof WidgetNode && parent.container instanceof Gtk.Fixed;
    }

    public override setParent(parent: WidgetNode<Gtk.Fixed> | null): void {
        if (!parent && this.parent && this.children[0]) {
            this.detachFromParent(this.parent.container, this.children[0].container);
        }

        super.setParent(parent);

        if (parent && this.children[0]) {
            this.attachToParent(parent.container, this.children[0].container);
            this.applyTransform();
        }
    }

    public override appendChild(child: WidgetNode): void {
        super.appendChild(child);

        if (this.parent) {
            this.attachToParent(this.parent.container, child.container);
            this.applyTransform();
        }
    }

    public override removeChild(child: WidgetNode): void {
        if (this.parent) {
            this.detachFromParent(this.parent.container, child.container);
        }

        super.removeChild(child);
    }

    public override commitUpdate(oldProps: FixedChildProps | null, newProps: FixedChildProps): void {
        super.commitUpdate(oldProps, newProps);

        if (!this.parent || !this.children[0]) {
            return;
        }

        const positionChanged = hasChanged(oldProps, newProps, "x") || hasChanged(oldProps, newProps, "y");

        if (positionChanged) {
            this.repositionChild();
        } else if (hasChanged(oldProps, newProps, "transform")) {
            this.applyTransform();
        }
    }

    public override detachDeletedInstance(): void {
        if (this.parent && this.children[0]) {
            this.detachFromParent(this.parent.container, this.children[0].container);
        }
        super.detachDeletedInstance();
    }

    private attachToParent(parent: Gtk.Fixed, child: Gtk.Widget): void {
        const x = this.props.x ?? 0;
        const y = this.props.y ?? 0;
        parent.put(child, x, y);
    }

    private detachFromParent(parent: Gtk.Fixed, child: Gtk.Widget): void {
        const childParent = child.getParent();
        if (childParent && childParent === parent) {
            parent.remove(child);
        }
    }

    private repositionChild(): void {
        if (!this.parent || !this.children[0]) return;

        const x = this.props.x ?? 0;
        const y = this.props.y ?? 0;

        this.parent.container.remove(this.children[0].container);
        this.parent.container.put(this.children[0].container, x, y);
        this.applyTransform();
    }

    private applyTransform(): void {
        if (!this.parent || !this.children[0] || !this.props.transform) {
            return;
        }

        const layoutManager = this.parent.container.getLayoutManager();

        if (!layoutManager) {
            return;
        }

        const layoutChild = layoutManager.getLayoutChild(this.children[0].container) as Gtk.FixedLayoutChild;
        layoutChild.setTransform(this.props.transform);
    }
}
