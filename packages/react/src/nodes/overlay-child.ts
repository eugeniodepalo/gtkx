import type * as Gtk from "@gtkx/ffi/gtk";
import type { OverlayChildProps } from "../jsx.js";
import { registerNodeClass } from "../registry.js";
import { PositionalChildNode } from "./abstract/positional-child.js";
import { hasChanged } from "./internal/utils.js";

type Props = Partial<OverlayChildProps>;

class OverlayChildNode extends PositionalChildNode<Props> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "OverlayChild";
    }

    protected override attachToParent(parent: Gtk.Widget, child: Gtk.Widget): void {
        const overlay = parent as Gtk.Overlay;
        overlay.addOverlay(child);

        if (this.props.measure !== undefined) {
            overlay.setMeasureOverlay(child, this.props.measure);
        }

        if (this.props.clipOverlay !== undefined) {
            overlay.setClipOverlay(child, this.props.clipOverlay);
        }
    }

    protected override detachFromParent(parent: Gtk.Widget, child: Gtk.Widget): void {
        (parent as Gtk.Overlay).removeOverlay(child);
    }

    public override updateProps(oldProps: Props | null, newProps: Props): void {
        super.updateProps(oldProps, newProps);
        this.applyOwnProps(oldProps, newProps);
    }

    protected applyOwnProps(oldProps: Props | null, newProps: Props): void {
        if (!this.parent || !this.child) {
            return;
        }

        const overlay = this.getTypedParent<Gtk.Overlay>();

        if (hasChanged(oldProps, newProps, "measure")) {
            overlay.setMeasureOverlay(this.child, newProps.measure ?? false);
        }

        if (hasChanged(oldProps, newProps, "clipOverlay")) {
            overlay.setClipOverlay(this.child, newProps.clipOverlay ?? false);
        }
    }
}

registerNodeClass(OverlayChildNode);
