import * as Gtk from "@gtkx/ffi/gtk";
import type { OverlayChildProps } from "../jsx.js";
import type { Node } from "../node.js";
import { hasChanged } from "./internal/props.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

export class OverlayChildNode extends VirtualNode<OverlayChildProps, WidgetNode<Gtk.Overlay>, WidgetNode> {
    public override isValidChild(child: Node): boolean {
        return child instanceof WidgetNode;
    }

    public override isValidParent(parent: Node): boolean {
        return parent instanceof WidgetNode && parent.container instanceof Gtk.Overlay;
    }

    public override setParent(parent: WidgetNode<Gtk.Overlay> | null): void {
        if (!parent && this.parent) {
            this.detachAllChildren(this.parent.container);
        }

        super.setParent(parent);

        if (parent) {
            for (const child of this.children) {
                this.attachToParent(parent.container, child.container);
            }
        }
    }

    public override appendChild(child: WidgetNode): void {
        super.appendChild(child);

        if (this.parent) {
            this.attachToParent(this.parent.container, child.container);
        }
    }

    public override insertBefore(child: WidgetNode, before: WidgetNode): void {
        super.insertBefore(child, before);

        if (this.parent) {
            this.attachToParent(this.parent.container, child.container);
        }
    }

    public override removeChild(child: WidgetNode): void {
        if (this.parent) {
            const widget = child.container;
            const currentParent = widget.getParent();
            if (currentParent && currentParent === this.parent.container) {
                this.parent.container.removeOverlay(widget);
            }
        }

        super.removeChild(child);
    }

    public override commitUpdate(oldProps: OverlayChildProps | null, newProps: OverlayChildProps): void {
        super.commitUpdate(oldProps, newProps);

        if (!this.parent) {
            return;
        }

        const measureChanged = hasChanged(oldProps, newProps, "measure");
        const clipOverlayChanged = hasChanged(oldProps, newProps, "clipOverlay");

        if (measureChanged || clipOverlayChanged) {
            const parent = this.parent.container;
            for (const child of this.children) {
                if (measureChanged) {
                    parent.setMeasureOverlay(child.container, newProps.measure ?? false);
                }
                if (clipOverlayChanged) {
                    parent.setClipOverlay(child.container, newProps.clipOverlay ?? false);
                }
            }
        }
    }

    public override detachDeletedInstance(): void {
        if (this.parent) {
            this.detachAllChildren(this.parent.container);
        }
        super.detachDeletedInstance();
    }

    private attachToParent(parent: Gtk.Overlay, child: Gtk.Widget): void {
        parent.addOverlay(child);

        if (this.props.measure !== undefined) {
            parent.setMeasureOverlay(child, this.props.measure);
        }

        if (this.props.clipOverlay !== undefined) {
            parent.setClipOverlay(child, this.props.clipOverlay);
        }
    }

    private detachAllChildren(parent: Gtk.Overlay): void {
        for (const child of this.children) {
            const currentParent = child.container.getParent();
            if (currentParent && currentParent === parent) {
                parent.removeOverlay(child.container);
            }
        }
    }
}
