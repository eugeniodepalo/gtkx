import type * as Gtk from "@gtkx/ffi/gtk";
import type { SlotProps } from "../jsx.js";
import type { Node } from "../node.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

export class NotebookPageTabNode extends VirtualNode<SlotProps, Node, WidgetNode> {
    private notebook: Gtk.Notebook | null = null;
    private page: Gtk.Widget | null = null;

    public override isValidChild(child: Node): boolean {
        return child instanceof WidgetNode;
    }

    public override isValidParent(parent: Node): boolean {
        return parent instanceof VirtualNode && parent.typeName === "NotebookPage";
    }

    public setPage(notebook: Gtk.Notebook | null, page: Gtk.Widget | null): void {
        this.notebook = notebook;
        this.page = page;
    }

    public override appendChild(child: WidgetNode): void {
        super.appendChild(child);

        if (this.parent) {
            this.onChildChange();
        }
    }

    public override removeChild(child: WidgetNode): void {
        super.removeChild(child);

        if (this.parent) {
            this.onChildChange();
        }
    }

    public override detachDeletedInstance(): void {
        this.notebook = null;
        this.page = null;
        super.detachDeletedInstance();
    }

    private onChildChange(): void {
        if (!this.notebook || !this.page) {
            return;
        }

        if (this.notebook.pageNum(this.page) === -1) {
            return;
        }

        this.notebook.setTabLabel(this.page, this.children[0]?.container ?? null);
    }
}
