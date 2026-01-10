import { isObjectEqual } from "@gtkx/ffi";
import type * as Gtk from "@gtkx/ffi/gtk";
import type { OverlayChildProps } from "../jsx.js";
import { registerNodeClass } from "../registry.js";
import { SlotNode } from "./slot.js";

type Props = Partial<OverlayChildProps>;

class OverlayChildNode extends SlotNode<Props> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "OverlayChild";
    }

    private getOverlay(): Gtk.Overlay {
        if (!this.parent) {
            throw new Error("Expected parent widget to be set on OverlayChildNode");
        }

        return this.parent as Gtk.Overlay;
    }

    public override updateProps(oldProps: Props | null, newProps: Props): void {
        super.updateProps(oldProps, newProps);

        if (!this.parent || !this.child) {
            return;
        }

        const overlay = this.getOverlay();

        if (!oldProps || oldProps.measure !== newProps.measure) {
            overlay.setMeasureOverlay(this.child, newProps.measure ?? false);
        }

        if (!oldProps || oldProps.clipOverlay !== newProps.clipOverlay) {
            overlay.setClipOverlay(this.child, newProps.clipOverlay ?? false);
        }
    }

    protected override onChildChange(oldChild: Gtk.Widget | null): void {
        const overlay = this.getOverlay();

        if (oldChild) {
            const parent = oldChild.getParent();

            if (parent && isObjectEqual(parent, overlay)) {
                overlay.removeOverlay(oldChild);
            }
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
}

registerNodeClass(OverlayChildNode);
