import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import { Node } from "../node.js";

type ToolbarViewSlotType = "Top" | "Bottom";

export class ToolbarViewSlotNode extends Node<never> {
    static matches(type: string): boolean {
        if (!type.startsWith("AdwToolbarView.")) return false;
        const slot = type.split(".")[1];
        return slot === "Top" || slot === "Bottom";
    }

    protected override isVirtual(): boolean {
        return true;
    }

    private slotType: ToolbarViewSlotType;
    private children: Node[] = [];

    constructor(type: string) {
        super(type);
        const slot = type.split(".")[1];

        if (slot !== "Top" && slot !== "Bottom") {
            throw new Error(`Invalid toolbar view slot type: ${type}`);
        }

        this.slotType = slot;
    }

    override appendChild(child: Node): void {
        child.parent = this;
        const childWidget = child.getWidget() as Gtk.Widget | undefined;

        if (!childWidget) return;

        this.children.push(child);

        if (this.parent) {
            this.addBarToParent(childWidget);
        }
    }

    override removeChild(child: Node): void {
        child.unmount();

        const index = this.children.indexOf(child);

        if (index !== -1) {
            this.children.splice(index, 1);
        }

        const childWidget = child.getWidget() as Gtk.Widget | undefined;

        if (this.parent && childWidget) {
            this.removeBarFromParent(childWidget);
        }

        child.parent = null;
    }

    override mount(): void {
        for (const child of this.children) {
            const childWidget = child.getWidget() as Gtk.Widget | undefined;

            if (childWidget) {
                this.addBarToParent(childWidget);
            }
        }
    }

    override unmount(): void {
        for (const child of this.children) {
            const childWidget = child.getWidget() as Gtk.Widget | undefined;

            if (childWidget) {
                this.removeBarFromParent(childWidget);
            }
        }

        super.unmount();
    }

    private addBarToParent(childWidget: Gtk.Widget): void {
        const parentWidget = this.parent?.getWidget() as Adw.ToolbarView | undefined;

        if (!parentWidget) return;

        if (this.slotType === "Top") {
            parentWidget.addTopBar(childWidget);
        } else {
            parentWidget.addBottomBar(childWidget);
        }
    }

    private removeBarFromParent(childWidget: Gtk.Widget): void {
        const parentWidget = this.parent?.getWidget() as Adw.ToolbarView | undefined;

        if (!parentWidget) return;

        parentWidget.remove(childWidget);
    }
}
