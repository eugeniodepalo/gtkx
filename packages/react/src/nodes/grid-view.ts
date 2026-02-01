import type * as Gtk from "@gtkx/ffi/gtk";
import type { GtkGridViewProps } from "../jsx.js";
import type { Node } from "../node.js";
import type { Container } from "../types.js";
import { GridItemRenderer } from "./internal/grid-item-renderer.js";
import { filterProps, hasChanged } from "./internal/props.js";
import { ListItemNode } from "./list-item.js";
import { GridModel, type GridModelProps } from "./models/grid.js";
import { WidgetNode } from "./widget.js";

const OWN_PROPS = ["renderItem", "estimatedItemHeight"] as const;

type GridViewProps = Pick<GtkGridViewProps, (typeof OWN_PROPS)[number]> & GridModelProps;

export class GridViewNode extends WidgetNode<Gtk.GridView, GridViewProps, ListItemNode> {
    private itemRenderer: GridItemRenderer;
    private grid: GridModel;

    constructor(typeName: string, props: GridViewProps, container: Gtk.GridView, rootContainer: Container) {
        super(typeName, props, container, rootContainer);
        this.grid = new GridModel(
            { owner: this, signalStore: this.signalStore },
            {
                selectionMode: props.selectionMode,
                selected: props.selected,
                onSelectionChanged: props.onSelectionChanged,
            },
        );
        this.itemRenderer = new GridItemRenderer(this.signalStore);
        this.itemRenderer.setStore(this.grid.getStore());
        this.grid.getStore().setOnItemUpdated((id) => this.itemRenderer.rebindItem(id));
        this.container.setFactory(this.itemRenderer.getFactory());
    }

    public override isValidChild(child: Node): boolean {
        if (!(child instanceof ListItemNode)) return false;
        if (child.getChildNodes().length > 0) {
            throw new Error("GtkGridView does not support nested ListItems. Use GtkListView for tree lists.");
        }
        return true;
    }

    public override appendChild(child: ListItemNode): void {
        super.appendChild(child);
        this.grid.appendChild(child);
    }

    public override insertBefore(child: ListItemNode, before: ListItemNode): void {
        super.insertBefore(child, before);
        this.grid.insertBefore(child, before);
    }

    public override removeChild(child: ListItemNode): void {
        this.grid.removeChild(child);
        super.removeChild(child);
    }

    public override finalizeInitialChildren(props: GridViewProps): boolean {
        super.finalizeInitialChildren(props);
        return true;
    }

    public override commitUpdate(oldProps: GridViewProps | null, newProps: GridViewProps): void {
        super.commitUpdate(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));
        this.applyOwnProps(oldProps, newProps);
    }

    public override commitMount(): void {
        super.commitMount();
        this.container.setModel(this.grid.getSelectionModel());
    }

    public override detachDeletedInstance(): void {
        this.itemRenderer.dispose();
        super.detachDeletedInstance();
    }

    private applyOwnProps(oldProps: GridViewProps | null, newProps: GridViewProps): void {
        if (hasChanged(oldProps, newProps, "renderItem")) {
            this.itemRenderer.setRenderFn(newProps.renderItem ?? null);
        }

        if (hasChanged(oldProps, newProps, "estimatedItemHeight")) {
            this.itemRenderer.setEstimatedItemHeight(newProps.estimatedItemHeight ?? null);
        }

        const previousModel = this.grid.getSelectionModel();
        this.grid.updateProps(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));
        const currentModel = this.grid.getSelectionModel();

        if (previousModel !== currentModel) {
            this.container.setModel(currentModel);
        }
    }
}
