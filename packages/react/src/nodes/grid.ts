import type * as Gtk from "@gtkx/ffi/gtk";
import type { Props } from "../factory.js";
import { Node } from "../node.js";

export class GridNode extends Node<Gtk.Grid> {
    static matches(type: string): boolean {
        return type === "Grid.Root";
    }
}

export class GridChildNode extends Node<never> {
    static matches(type: string): boolean {
        return type === "Grid.Child";
    }

    protected override isVirtual(): boolean {
        return true;
    }

    private column: number;
    private row: number;
    private columnSpan: number;
    private rowSpan: number;
    private childWidget: Gtk.Widget | null = null;
    private parentGrid: GridNode | null = null;

    constructor(type: string, props: Props, app: Gtk.Application) {
        super(type, props, app);
        this.column = (props.column as number) ?? 0;
        this.row = (props.row as number) ?? 0;
        this.columnSpan = (props.columnSpan as number) ?? 1;
        this.rowSpan = (props.rowSpan as number) ?? 1;
    }

    override appendChild(child: Node): void {
        const widget = child.getWidget();

        if (widget) {
            this.childWidget = widget;

            if (this.parentGrid) {
                this.attachChildToGrid();
            }
        }
    }

    override removeChild(child: Node): void {
        const widget = child.getWidget();

        if (widget && this.childWidget === widget) {
            this.detachChildFromGrid();
            this.childWidget = null;
        }
    }

    private attachChildToGrid(): void {
        if (!this.parentGrid || !this.childWidget) return;
        const grid = this.parentGrid.getWidget();
        if (!grid) return;
        grid.attach(this.childWidget, this.column, this.row, this.columnSpan, this.rowSpan);
    }

    private detachChildFromGrid(): void {
        if (!this.parentGrid || !this.childWidget) return;
        const grid = this.parentGrid.getWidget();
        if (!grid) return;
        grid.remove(this.childWidget);
    }

    override attachToParent(parent: Node): void {
        if (parent instanceof GridNode) {
            this.parentGrid = parent;

            if (this.childWidget) {
                this.attachChildToGrid();
            }
        }
    }

    override detachFromParent(parent: Node): void {
        if (parent instanceof GridNode) {
            this.detachChildFromGrid();
            this.parentGrid = null;
        }
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        const positionChanged =
            oldProps.column !== newProps.column ||
            oldProps.row !== newProps.row ||
            oldProps.columnSpan !== newProps.columnSpan ||
            oldProps.rowSpan !== newProps.rowSpan;

        if (positionChanged) {
            this.detachChildFromGrid();
            this.column = (newProps.column as number) ?? 0;
            this.row = (newProps.row as number) ?? 0;
            this.columnSpan = (newProps.columnSpan as number) ?? 1;
            this.rowSpan = (newProps.rowSpan as number) ?? 1;
            this.attachChildToGrid();
        }
    }
}
