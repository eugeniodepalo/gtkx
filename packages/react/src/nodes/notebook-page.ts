import * as Gtk from "@gtkx/ffi/gtk";
import type { NotebookPageProps } from "../jsx.js";
import type { Node } from "../node.js";
import { hasChanged } from "./internal/props.js";
import { NotebookPageTabNode } from "./notebook-page-tab.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

type NotebookPageChild = WidgetNode | NotebookPageTabNode;

export class NotebookPageNode extends VirtualNode<NotebookPageProps, WidgetNode<Gtk.Notebook>, NotebookPageChild> {
    private position: number | null = null;
    private tabNode: NotebookPageTabNode | null = null;
    private contentChild: WidgetNode | null = null;

    public override isValidChild(child: Node): boolean {
        return child instanceof WidgetNode || child instanceof NotebookPageTabNode;
    }

    public override isValidParent(parent: Node): boolean {
        return parent instanceof WidgetNode && parent.container instanceof Gtk.Notebook;
    }

    public override setParent(parent: WidgetNode<Gtk.Notebook> | null): void {
        if (!parent && this.parent) {
            const childWidget = this.contentChild?.container ?? null;
            if (childWidget) {
                this.detachPage(childWidget);
            }
        }

        super.setParent(parent);

        if (parent && this.contentChild) {
            this.onChildChange(null);
        }

        this.updateTabNode();
    }

    public override appendChild(child: NotebookPageChild): void {
        if (child instanceof NotebookPageTabNode) {
            this.tabNode = child;
            super.appendChild(child);
            this.updateTabNode();
            return;
        }

        const oldContent = this.contentChild?.container ?? null;
        this.contentChild = child;
        super.appendChild(child);

        if (this.parent) {
            this.onChildChange(oldContent);
        }
    }

    public override removeChild(child: NotebookPageChild): void {
        if (child instanceof NotebookPageTabNode) {
            this.tabNode = null;
            super.removeChild(child);
            return;
        }

        if (child === this.contentChild) {
            const oldContent = this.contentChild.container;
            this.contentChild = null;
            super.removeChild(child);

            if (this.parent && oldContent) {
                this.onChildChange(oldContent);
            }
            return;
        }

        super.removeChild(child);
    }

    public override commitUpdate(oldProps: NotebookPageProps | null, newProps: NotebookPageProps): void {
        super.commitUpdate(oldProps, newProps);
        this.applyOwnProps(oldProps, newProps);
    }

    public override detachDeletedInstance(): void {
        const childWidget = this.contentChild?.container ?? null;
        if (childWidget && this.parent) {
            this.detachPage(childWidget);
        }
        this.contentChild = null;
        this.tabNode = null;
        super.detachDeletedInstance();
    }

    public setPosition(position: number | null): void {
        this.position = position;
    }

    public getChildWidget(): Gtk.Widget {
        if (!this.contentChild) {
            throw new Error("Expected content child widget to be set on NotebookPageNode");
        }

        return this.contentChild.container;
    }

    private getParentWidget(): Gtk.Notebook {
        if (!this.parent) {
            throw new Error("Expected parent widget to be set on NotebookPageNode");
        }

        return this.parent.container;
    }

    private updateTabNode(): void {
        if (this.tabNode) {
            this.tabNode.setPage(this.parent ? this.parent.container : null, this.contentChild?.container ?? null);
        }
    }

    private applyOwnProps(oldProps: NotebookPageProps | null, newProps: NotebookPageProps): void {
        const childWidget = this.contentChild?.container ?? null;

        if (hasChanged(oldProps, newProps, "label") && childWidget && this.parent && !this.tabNode?.children[0]) {
            const tabLabel = this.getParentWidget().getTabLabel(childWidget) as Gtk.Label;
            tabLabel.setLabel(newProps.label ?? "");
        }

        const pagePropsChanged =
            hasChanged(oldProps, newProps, "tabExpand") || hasChanged(oldProps, newProps, "tabFill");
        if (childWidget && this.parent && pagePropsChanged) {
            this.applyPageProps();
        }
    }

    private attachPage(): void {
        const child = this.getChildWidget();
        const notebook = this.getParentWidget();

        let tabLabel: Gtk.Widget;

        if (this.tabNode?.children[0]) {
            tabLabel = this.tabNode.children[0].container;
        } else {
            const label = new Gtk.Label();
            label.setLabel(this.props.label ?? "");
            tabLabel = label;
        }

        if (this.position != null) {
            notebook.insertPage(child, this.position, tabLabel);
        } else {
            notebook.appendPage(child, tabLabel);
        }

        this.applyPageProps();
    }

    private applyPageProps(): void {
        const child = this.contentChild?.container ?? null;
        if (!child || !this.parent) return;

        const notebook = this.getParentWidget();
        const page = notebook.getPage(child);
        if (!page) return;

        if (this.props.tabExpand !== undefined) {
            page.setTabExpand(this.props.tabExpand);
        }

        if (this.props.tabFill !== undefined) {
            page.setTabFill(this.props.tabFill);
        }
    }

    private detachPage(childToDetach: Gtk.Widget): void {
        const notebook = this.getParentWidget();
        const pageNum = notebook.pageNum(childToDetach);
        if (pageNum !== -1) {
            notebook.removePage(pageNum);
        }
    }

    private onChildChange(oldChild: Gtk.Widget | null): void {
        if (oldChild) {
            this.detachPage(oldChild);
        }

        if (this.contentChild) {
            this.attachPage();
        }
    }
}
