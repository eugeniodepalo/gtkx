import type * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import type { PackableWidget } from "./pack.js";
import { SlotNode } from "./slot.js";

type PackChildPosition = "start" | "end";

export class PackChild extends SlotNode {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "Pack.Start" || type === "Pack.End";
    }

    public setPackableWidget(packableWidget?: PackableWidget): void {
        this.setParent(packableWidget);
    }

    private getPackableWidget(): PackableWidget {
        if (!this.parent) {
            throw new Error(`packableWidget is not set on ${this.typeName}`);
        }

        return this.parent as PackableWidget;
    }

    private getPosition(): PackChildPosition {
        return this.typeName === "Pack.Start" ? "start" : "end";
    }

    protected override onChildChange(oldChild: Gtk.Widget | undefined): void {
        const packableWidget = this.getPackableWidget();

        if (oldChild) {
            packableWidget.remove(oldChild);
        }

        if (this.child) {
            if (this.getPosition() === "start") {
                packableWidget.packStart(this.child);
            } else {
                packableWidget.packEnd(this.child);
            }
        }
    }
}

registerNodeClass(PackChild);
