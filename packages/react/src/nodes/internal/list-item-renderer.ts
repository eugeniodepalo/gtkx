import * as Gtk from "@gtkx/ffi/gtk";
import type { ReactNode } from "react";
import type Reconciler from "react-reconciler";
import { reconciler } from "../../reconciler.js";
import { BaseItemRenderer } from "./base-item-renderer.js";
import type { ListStore } from "./list-store.js";

export type RenderItemFn<T> = (item: T | null) => ReactNode;

export class ListItemRenderer extends BaseItemRenderer<ListStore> {
    private renderFn: RenderItemFn<unknown> | null = () => null;
    private boundItems = new Map<string, Gtk.ListItem>();

    public setRenderFn(renderFn: RenderItemFn<unknown> | null): void {
        this.renderFn = renderFn;
    }

    public rebindItem(id: string): void {
        const listItem = this.boundItems.get(id);
        if (!listItem) return;

        const fiberRoot = this.fiberRoots.get(listItem);
        if (!fiberRoot) return;

        const item = this.getStore().getItem(id);
        const element = this.renderFn?.(item);

        reconciler.getInstance().updateContainer(element, fiberRoot, null, () => {});
    }

    protected override getStoreTypeName(): string {
        return "list store";
    }

    protected override renderItem(_listItem: Gtk.ListItem): ReactNode {
        return this.renderFn?.(null);
    }

    protected override getItemFromListItem(listItem: Gtk.ListItem): string | null {
        const stringObject = listItem.getItem();
        if (!(stringObject instanceof Gtk.StringObject)) return null;
        return stringObject.getString();
    }

    protected override onSetup(listItem: Gtk.ListItem): Gtk.Widget {
        const box = this.createBox();
        listItem.setChild(box);
        return box;
    }

    protected override onBind(listItem: Gtk.ListItem, fiberRoot: Reconciler.FiberRoot): void {
        const id = this.getItemFromListItem(listItem);
        if (id !== null) {
            this.boundItems.set(id, listItem);
        }

        const item = id !== null ? this.getStore().getItem(id) : null;
        const element = this.renderFn?.(item);

        reconciler.getInstance().updateContainer(element, fiberRoot, null, () => {
            if (this.tornDown.has(listItem)) return;
            if (this.estimatedItemHeight !== null) return;
            const currentFiberRoot = this.fiberRoots.get(listItem);
            if (!currentFiberRoot) return;
            this.clearBoxSizeRequest(currentFiberRoot.containerInfo);
        });
    }

    protected override onUnbind(listItem: Gtk.ListItem): void {
        const id = this.getItemFromListItem(listItem);
        if (id !== null) {
            this.boundItems.delete(id);
        }
    }

    protected override onTeardown(_listItem: Gtk.ListItem): void {}
}
