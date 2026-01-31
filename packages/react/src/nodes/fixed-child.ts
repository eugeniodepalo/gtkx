import type * as Gtk from "@gtkx/ffi/gtk";
import type { FixedChildProps } from "../jsx.js";
import type { Node } from "../node.js";
import { hasChanged } from "./internal/utils.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

type Props = Partial<FixedChildProps>;

export class FixedChildNode extends VirtualNode<Props, WidgetNode<Gtk.Fixed>, WidgetNode> {
    private parentWidget: Gtk.Fixed | null = null;
    childWidget: Gtk.Widget | null = null;

    public override canAcceptChild(child: Node): boolean {
        return child instanceof WidgetNode;
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot append '${child.typeName}' to '${this.typeName}': expected Widget`);
        }

        const oldChild = this.childWidget;
        this.childWidget = child.container;

        super.appendChild(child);

        if (this.parentWidget) {
            this.onChildChange(oldChild);
        }
    }

    public override removeChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot remove '${child.typeName}' from '${this.typeName}': expected Widget`);
        }

        const oldChild = this.childWidget;
        this.childWidget = null;

        super.removeChild(child);

        if (this.parentWidget && oldChild) {
            this.onChildChange(oldChild);
        }
    }

    public override onAddedToParent(parent: Node): void {
        if (parent instanceof WidgetNode) {
            this.parentWidget = parent.container as Gtk.Fixed;
            if (this.childWidget) {
                this.onChildChange(null);
            }
        }
    }

    public override onRemovedFromParent(parent: Node): void {
        if (parent instanceof WidgetNode && this.childWidget) {
            this.detachWidgetIfAttached(parent.container as Gtk.Fixed, this.childWidget);
        }
        this.parentWidget = null;
    }

    public override detachDeletedInstance(): void {
        if (this.parentWidget && this.childWidget) {
            this.detachWidgetIfAttached(this.parentWidget, this.childWidget);
        }
        this.childWidget = null;
        this.parentWidget = null;
        super.detachDeletedInstance();
    }

    public override commitUpdate(oldProps: Props | null, newProps: Props): void {
        super.commitUpdate(oldProps, newProps);
        this.applyOwnProps(oldProps, newProps);
    }

    private onChildChange(oldChild: Gtk.Widget | null): void {
        if (!this.parentWidget) return;

        if (oldChild) {
            this.detachWidgetIfAttached(this.parentWidget, oldChild);
        }
        if (this.childWidget) {
            this.attachToParent(this.parentWidget, this.childWidget);
            this.applyTransform();
        }
    }

    private attachToParent(parent: Gtk.Fixed, child: Gtk.Widget): void {
        const x = this.props.x ?? 0;
        const y = this.props.y ?? 0;
        parent.put(child, x, y);
    }

    private detachWidgetIfAttached(parent: Gtk.Fixed, child: Gtk.Widget): void {
        const childParent = child.getParent();
        if (childParent && childParent === (parent as Gtk.Widget)) {
            parent.remove(child);
        }
    }

    private applyOwnProps(oldProps: Props | null, newProps: Props): void {
        if (!this.parentWidget || !this.childWidget) {
            return;
        }

        const positionChanged = hasChanged(oldProps, newProps, "x") || hasChanged(oldProps, newProps, "y");

        if (positionChanged) {
            this.repositionChild();
        } else if (hasChanged(oldProps, newProps, "transform")) {
            this.applyTransform();
        }
    }

    private repositionChild(): void {
        if (!this.parentWidget || !this.childWidget) return;

        const x = this.props.x ?? 0;
        const y = this.props.y ?? 0;

        this.parentWidget.remove(this.childWidget);
        this.parentWidget.put(this.childWidget, x, y);
        this.applyTransform();
    }

    private applyTransform(): void {
        if (!this.parentWidget || !this.childWidget || !this.props.transform) {
            return;
        }

        const layoutManager = this.parentWidget.getLayoutManager();

        if (!layoutManager) {
            return;
        }

        const layoutChild = layoutManager.getLayoutChild(this.childWidget) as Gtk.FixedLayoutChild;
        layoutChild.setTransform(this.props.transform);
    }
}
