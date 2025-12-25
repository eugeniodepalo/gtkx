import type * as Adw from "@gtkx/ffi/adw";
import { registerNodeClass } from "../registry.js";
import { SlotNode } from "./slot.js";

type ToolbarChildNodePosition = "top" | "bottom";

export class ToolbarChildNode extends SlotNode {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "Toolbar.Top" || type === "Toolbar.Bottom";
    }

    public setToolbar(toolbar?: Adw.ToolbarView): void {
        this.setParent(toolbar);
    }

    private getToolbar(): Adw.ToolbarView {
        if (!this.parent) {
            throw new Error("Expected ToolbarView reference to be set on ToolbarChildNode");
        }

        return this.parent as Adw.ToolbarView;
    }

    private getPosition(): ToolbarChildNodePosition {
        return this.typeName === "Toolbar.Top" ? "top" : "bottom";
    }

    protected override onChildChange(): void {
        if (!this.child) {
            return;
        }

        const toolbar = this.getToolbar();
        const position = this.getPosition();

        if (position === "top") {
            toolbar.addTopBar(this.child);
        } else {
            toolbar.addBottomBar(this.child);
        }
    }
}

registerNodeClass(ToolbarChildNode);
