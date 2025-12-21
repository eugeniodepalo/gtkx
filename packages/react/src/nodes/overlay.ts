import * as Gtk from "@gtkx/ffi/gtk";
import type { OverlayChildProps } from "../jsx.js";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass } from "../types.js";
import { isContainerType } from "./internal/utils.js";
import { SlotNode } from "./slot.js";
import { WidgetNode } from "./widget.js";

type Props = Partial<OverlayChildProps>;

class OverlaySlotNode extends SlotNode<Props> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "Overlay";
    }

    private getOverlay(): Gtk.Overlay {
        if (!this.parent) {
            throw new Error("Parent is not set on OverlaySlotNode");
        }

        return this.parent as Gtk.Overlay;
    }

    protected override onChildChange(oldChild: Gtk.Widget | undefined): void {
        const overlay = this.getOverlay();

        if (oldChild) {
            overlay.removeOverlay(oldChild);
        }

        if (this.child) {
            overlay.addOverlay(this.child);

            if (this.props.measure !== undefined) {
                overlay.setMeasureOverlay(this.child, this.props.measure);
            }

            if (this.props.clipOverlay !== undefined) {
                overlay.setClipOverlay(this.child, this.props.clipOverlay);
            }
        }
    }

    public override updateProps(oldProps: Props | null, newProps: Props): void {
        super.updateProps(oldProps, newProps);

        if (!this.parent || !this.child) {
            return;
        }

        const overlay = this.getOverlay();

        if (oldProps?.measure !== newProps.measure && newProps.measure !== undefined) {
            overlay.setMeasureOverlay(this.child, newProps.measure);
        }

        if (oldProps?.clipOverlay !== newProps.clipOverlay && newProps.clipOverlay !== undefined) {
            overlay.setClipOverlay(this.child, newProps.clipOverlay);
        }
    }
}

class OverlayNode extends WidgetNode<Gtk.Overlay> {
    public static override priority = 1;

    private mainChild?: Gtk.Widget;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass): boolean {
        return isContainerType(Gtk.Overlay, containerOrClass);
    }

    public override appendChild(child: Node): void {
        if (child instanceof OverlaySlotNode) {
            child.setParent(this.container);
            return;
        }

        if (child instanceof SlotNode) {
            super.appendChild(child);
            return;
        }

        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot append child of type ${child.typeName} to Overlay`);
        }

        if (!this.mainChild) {
            this.mainChild = child.container;
            this.container.setChild(child.container);
        } else {
            this.container.addOverlay(child.container);
        }
    }

    public override insertBefore(child: Node, before: Node): void {
        if (child instanceof OverlaySlotNode) {
            child.setParent(this.container);
            return;
        }

        if (child instanceof SlotNode) {
            super.insertBefore(child, before);
            return;
        }

        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot insert child of type ${child.typeName} to Overlay`);
        }

        if (!this.mainChild) {
            this.mainChild = child.container;
            this.container.setChild(child.container);
        } else {
            this.container.addOverlay(child.container);
        }
    }

    public override removeChild(child: Node): void {
        if (child instanceof OverlaySlotNode) {
            child.setParent(undefined);
            return;
        }

        if (child instanceof SlotNode) {
            super.removeChild(child);
            return;
        }

        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot remove child of type ${child.typeName} from Overlay`);
        }

        if (this.mainChild === child.container) {
            this.mainChild = undefined;
            this.container.setChild(undefined);
        } else {
            this.container.removeOverlay(child.container);
        }
    }
}

registerNodeClass(OverlayNode);
registerNodeClass(OverlaySlotNode);
