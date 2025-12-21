import type * as Gtk from "@gtkx/ffi/gtk";

import { SlotNode } from "./slot.js";
import { registerNodeClass } from "../registry.js";

type OverlayChildType = "child" | "overlay";

export class OverlayChild extends SlotNode {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "Overlay.Child" || type === "Overlay.Overlay";
    }

    overlay?: Gtk.Overlay;

    public setOverlay(overlay?: Gtk.Overlay): void {
        this.overlay = overlay;
    }

    private getType(): OverlayChildType {
        return this.typeName === "Overlay.Child" ? "child" : "overlay";
    }

    protected override onChildChange(oldChild: Gtk.Widget | undefined): void {
        if (!this.overlay) {
            throw new Error(`overlay is not set on ${this.typeName}`);
        }

        if (oldChild) {
            if (this.getType() === "child") {
                this.overlay.setChild(undefined);
            } else {
                this.overlay.removeOverlay(oldChild);
            }
        }

        if (this.child) {
            if (this.getType() === "child") {
                this.overlay.setChild(this.child);
            } else {
                this.overlay.addOverlay(this.child);
            }
        }
    }
}

registerNodeClass(OverlayChild);
