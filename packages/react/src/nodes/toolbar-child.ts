import type * as Adw from "@gtkx/ffi/adw";
import { registerNodeClass } from "../registry.js";
import { SlotNode } from "./slot.js";

type ToolbarChildNodePosition = "top" | "bottom" | "content";

export class ToolbarChildNode extends SlotNode {
    public static override priority = 1;

    toolbar?: Adw.ToolbarView;

    public static override matches(type: string): boolean {
        return type === "AdwToolbarView.Top" || type === "AdwToolbarView.Bottom" || type === "AdwToolbarView.Child";
    }

    public setToolbar(toolbar?: Adw.ToolbarView): void {
        this.toolbar = toolbar;
    }

    private getToolbar(): Adw.ToolbarView {
        if (!this.toolbar) {
            throw new Error("ToolbarView is not set on ToolbarViewSlotNode");
        }

        return this.toolbar;
    }

    private getPosition(): ToolbarChildNodePosition {
        switch (this.typeName) {
            case "AdwToolbarView.Top":
                return "top";
            case "AdwToolbarView.Bottom":
                return "bottom";
            case "AdwToolbarView.Content":
                return "content";
            default:
                throw new Error(`Unknown ToolbarViewSlotNode type: ${this.typeName}`);
        }
    }

    protected override onChildChange(): void {
        if (!this.child) {
            return;
        }

        const toolbar = this.getToolbar();
        const position = this.getPosition();

        switch (position) {
            case "top":
                toolbar.addTopBar(this.child);
                break;
            case "bottom":
                toolbar.addBottomBar(this.child);
                break;
            case "content":
                toolbar.setContent(this.child);
                break;
        }
    }
}

registerNodeClass(ToolbarChildNode);
