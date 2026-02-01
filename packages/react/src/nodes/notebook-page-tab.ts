import type * as Gtk from "@gtkx/ffi/gtk";
import type { SlotProps } from "../jsx.js";
import type { Node } from "../node.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

export class NotebookPageTabNode extends VirtualNode<SlotProps, WidgetNode, WidgetNode> {
    private notebook: Gtk.Notebook | null = null;
    private page: Gtk.Widget | null = null;

    public override isValidChild(child: Node): boolean {
        return child instanceof WidgetNode;
    }

    public setPage(notebook: Gtk.Notebook | null, page: Gtk.Widget | null): void {
        this.notebook = notebook;
        this.page = page;
    }

    public override appendChild(child: WidgetNode): void {
        const oldChildWidget = this.children[0]?.container ?? null;
        super.appendChild(child);

        if (this.parent) {
            this.onChildChange(oldChildWidget);
        }
    }

    public override removeChild(child: WidgetNode): void {
        const oldChildWidget = child.container;
        super.removeChild(child);

        if (this.parent && oldChildWidget) {
            this.onChildChange(oldChildWidget);
        }
    }

    private getNotebook(): Gtk.Notebook {
        if (!this.notebook) {
            throw new Error("Expected Notebook reference to be set on NotebookPageTabNode");
        }
        return this.notebook;
    }

    private getPage(): Gtk.Widget {
        if (!this.page) {
            throw new Error("Expected page reference to be set on NotebookPageTabNode");
        }
        return this.page;
    }

    private onChildChange(_oldChild: Gtk.Widget | null): void {
        if (!this.notebook || !this.page) {
            return;
        }

        const notebook = this.getNotebook();
        const page = this.getPage();

        if (notebook.pageNum(page) === -1) {
            return;
        }

        notebook.setTabLabel(page, this.children[0]?.container ?? null);
    }
}
