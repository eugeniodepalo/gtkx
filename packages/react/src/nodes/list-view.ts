import type * as Gtk from "@gtkx/ffi/gtk";
import type { GtkListViewProps } from "../jsx.js";
import type { Node } from "../node.js";
import type { Container } from "../types.js";
import { EventControllerNode } from "./event-controller.js";
import { ListItemRenderer } from "./internal/list-item-renderer.js";
import { filterProps, hasChanged } from "./internal/props.js";
import { ListItemNode } from "./list-item.js";
import { ListModel, type ListModelProps } from "./models/list.js";
import { SlotNode } from "./slot.js";
import { WidgetNode } from "./widget.js";

const RENDERER_PROPS = ["renderItem", "estimatedItemHeight"] as const;
const OWN_PROPS = [...RENDERER_PROPS, "autoexpand", "selectionMode", "selected", "onSelectionChanged"] as const;

type ListViewProps = Pick<GtkListViewProps, (typeof RENDERER_PROPS)[number]> & ListModelProps;

type ListViewChild = ListItemNode | EventControllerNode | SlotNode;

export class ListViewNode extends WidgetNode<Gtk.ListView, ListViewProps, ListViewChild> {
    private itemRenderer: ListItemRenderer;
    private list: ListModel;

    public override isValidChild(child: Node): boolean {
        return child instanceof ListItemNode || child instanceof EventControllerNode || child instanceof SlotNode;
    }

    constructor(typeName: string, props: ListViewProps, container: Gtk.ListView, rootContainer: Container) {
        super(typeName, props, container, rootContainer);
        this.list = new ListModel(
            { owner: this, signalStore: this.signalStore },
            {
                autoexpand: props.autoexpand,
                selectionMode: props.selectionMode,
                selected: props.selected,
                onSelectionChanged: props.onSelectionChanged,
            },
        );
        this.itemRenderer = new ListItemRenderer(this.signalStore);
        this.itemRenderer.setStore(this.list.getStore());
        this.list.getStore().setOnItemUpdated((id) => this.itemRenderer.rebindItem(id));
        this.container.setFactory(this.itemRenderer.getFactory());
    }

    public override appendChild(child: ListViewChild): void {
        super.appendChild(child);
        if (child instanceof ListItemNode) {
            this.list.appendChild(child);
        }
    }

    public override insertBefore(child: ListViewChild, before: ListViewChild): void {
        super.insertBefore(child, before);
        if (child instanceof ListItemNode && before instanceof ListItemNode) {
            this.list.insertBefore(child, before);
        }
    }

    public override removeChild(child: ListViewChild): void {
        if (child instanceof ListItemNode) {
            this.list.removeChild(child);
        }
        super.removeChild(child);
    }

    public override finalizeInitialChildren(props: ListViewProps): boolean {
        super.finalizeInitialChildren(props);
        return true;
    }

    public override commitUpdate(oldProps: ListViewProps | null, newProps: ListViewProps): void {
        super.commitUpdate(oldProps ? filterProps(oldProps, OWN_PROPS) : null, filterProps(newProps, OWN_PROPS));
        this.applyOwnProps(oldProps, newProps);
    }

    public override commitMount(): void {
        super.commitMount();
        this.list.flushBatch();
        this.container.setModel(this.list.getSelectionModel());
    }

    public override detachDeletedInstance(): void {
        this.itemRenderer.dispose();
        super.detachDeletedInstance();
    }

    private applyOwnProps(oldProps: ListViewProps | null, newProps: ListViewProps): void {
        if (hasChanged(oldProps, newProps, "renderItem")) {
            this.itemRenderer.setRenderFn(newProps.renderItem ?? null);
        }

        if (hasChanged(oldProps, newProps, "estimatedItemHeight")) {
            this.itemRenderer.setEstimatedItemHeight(newProps.estimatedItemHeight ?? null);
        }

        const previousModel = this.list.getSelectionModel();
        this.list.updateProps(
            oldProps ? filterProps(oldProps, RENDERER_PROPS) : null,
            filterProps(newProps, RENDERER_PROPS),
        );
        const currentModel = this.list.getSelectionModel();

        if (previousModel !== currentModel) {
            this.container.setModel(currentModel);
        }
    }
}
