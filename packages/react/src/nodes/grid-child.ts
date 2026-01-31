import type * as Gtk from "@gtkx/ffi/gtk";
import type { GridChildProps } from "../jsx.js";
import type { Node } from "../node.js";
import { hasChanged } from "./internal/utils.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

type Props = Partial<GridChildProps>;

export class GridChildNode extends VirtualNode<Props, WidgetNode<Gtk.Grid>, WidgetNode> {
    private parentWidget: Gtk.Grid | null = null;
    childWidget: Gtk.Widget | null = null;

    public override canAcceptChild(child: Node): boolean {
        return child instanceof WidgetNode;
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot append '${child.typeName}' to '${this.typeName}': expected Widget`);
        }

        const oldChild = this.childWidget;
        this.childWidget = child.container;

        super.appendChild(child);

        if (this.parentWidget) {
            this.onChildChange(oldChild);
        }
    }

    public override removeChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot remove '${child.typeName}' from '${this.typeName}': expected Widget`);
        }

        const oldChild = this.childWidget;
        this.childWidget = null;

        super.removeChild(child);

        if (this.parentWidget && oldChild) {
            this.onChildChange(oldChild);
        }
    }

    public override onAddedToParent(parent: Node): void {
        if (parent instanceof WidgetNode) {
            this.parentWidget = parent.container as Gtk.Grid;
            if (this.childWidget) {
                this.onChildChange(null);
            }
        }
    }

    public override onRemovedFromParent(parent: Node): void {
        if (parent instanceof WidgetNode && this.childWidget) {
            this.detachWidgetIfAttached(parent.container as Gtk.Grid, this.childWidget);
        }
        this.parentWidget = null;
    }

    public override detachDeletedInstance(): void {
        if (this.parentWidget && this.childWidget) {
            this.detachWidgetIfAttached(this.parentWidget, this.childWidget);
        }
        this.childWidget = null;
        this.parentWidget = null;
        super.detachDeletedInstance();
    }

    public override commitUpdate(oldProps: Props | null, newProps: Props): void {
        super.commitUpdate(oldProps, newProps);
        this.applyOwnProps(oldProps, newProps);
    }

    private onChildChange(oldChild: Gtk.Widget | null): void {
        if (!this.parentWidget) return;

        if (oldChild) {
            this.detachWidgetIfAttached(this.parentWidget, oldChild);
        }
        if (this.childWidget) {
            this.attachToParent(this.parentWidget, this.childWidget);
        }
    }

    private attachToParent(parent: Gtk.Grid, child: Gtk.Widget): void {
        const column = this.props.column ?? 0;
        const row = this.props.row ?? 0;
        const columnSpan = this.props.columnSpan ?? 1;
        const rowSpan = this.props.rowSpan ?? 1;

        const existingChild = parent.getChildAt(column, row);
        if (existingChild && existingChild !== child) {
            parent.remove(existingChild);
        }

        parent.attach(child, column, row, columnSpan, rowSpan);
    }

    private detachWidgetIfAttached(parent: Gtk.Grid, child: Gtk.Widget): void {
        const childParent = child.getParent();
        if (childParent && childParent === (parent as Gtk.Widget)) {
            parent.remove(child);
        }
    }

    private applyOwnProps(oldProps: Props | null, newProps: Props): void {
        const positionChanged =
            hasChanged(oldProps, newProps, "column") ||
            hasChanged(oldProps, newProps, "row") ||
            hasChanged(oldProps, newProps, "columnSpan") ||
            hasChanged(oldProps, newProps, "rowSpan");

        if (positionChanged && this.parentWidget && this.childWidget) {
            this.reattachChild();
        }
    }

    private reattachChild(): void {
        if (!this.parentWidget || !this.childWidget) return;

        const column = this.props.column ?? 0;
        const row = this.props.row ?? 0;
        const columnSpan = this.props.columnSpan ?? 1;
        const rowSpan = this.props.rowSpan ?? 1;

        const existingChild = this.parentWidget.getChildAt(column, row);
        if (existingChild && existingChild !== this.childWidget) {
            this.parentWidget.remove(existingChild);
        }

        this.parentWidget.remove(this.childWidget);
        this.parentWidget.attach(this.childWidget, column, row, columnSpan, rowSpan);
    }
}
