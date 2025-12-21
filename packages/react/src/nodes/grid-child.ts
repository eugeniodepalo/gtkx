import type * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import { SlotNode } from "./slot.js";
import type { SlotProps } from "./slot.js";

type GridChildProps = SlotProps & {
    column?: number;
    row?: number;
    columnSpan?: number;
    rowSpan?: number;
};

export class GridChildNode extends SlotNode<GridChildProps> {
    public static override priority = 1;

    private grid?: Gtk.Grid;

    public static override matches(type: string): boolean {
        return type === "GridChild";
    }

    public setGrid(grid?: Gtk.Grid): void {
        this.grid = grid;
    }

    private getGrid(): Gtk.Grid {
        if (!this.grid) {
            throw new Error("Grid is not set on GridChildNode");
        }

        return this.grid;
    }

    public override updateProps(oldProps: GridChildProps | null, newProps: GridChildProps): void {
        if (
            !oldProps ||
            oldProps.column !== newProps.column ||
            oldProps.row !== newProps.row ||
            oldProps.columnSpan !== newProps.columnSpan ||
            oldProps.rowSpan !== newProps.rowSpan
        ) {
            this.attachChild();
        }
    }

    private attachChild(): void {
        const grid = this.getGrid();
        const column = this.props.column ?? 0;
        const row = this.props.row ?? 0;
        const columnSpan = this.props.columnSpan ?? 1;
        const rowSpan = this.props.rowSpan ?? 1;
        const existingChild = grid.getChildAt(column, row);

        if (existingChild) {
            grid.remove(existingChild);
        }

        if (this.child) {
            grid.attach(this.child, column, row, columnSpan, rowSpan);
        }
    }

    protected override onChildChange(): void {
        this.attachChild();
    }
}

registerNodeClass(GridChildNode);
