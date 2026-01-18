import { getNativeId } from "@gtkx/ffi";
import * as Gtk from "@gtkx/ffi/gtk";
import type { ReactNode } from "react";
import type Reconciler from "react-reconciler";
import { createFiberRoot } from "../../fiber-root.js";
import { reconciler } from "../../reconciler.js";
import { signalStore } from "./signal-store.js";

export abstract class BaseItemRenderer<TStore = unknown> {
    protected factory: Gtk.SignalListItemFactory;
    protected fiberRoots = new Map<number, Reconciler.FiberRoot>();
    protected tornDown = new Set<number>();
    protected estimatedItemHeight: number | null = null;
    private store: TStore | null = null;

    protected abstract getStoreTypeName(): string;

    constructor() {
        this.factory = new Gtk.SignalListItemFactory();
        this.initializeFactory();
    }

    public getFactory(): Gtk.SignalListItemFactory {
        return this.factory;
    }

    public setEstimatedItemHeight(height: number | null): void {
        this.estimatedItemHeight = height;
    }

    public setStore(store: TStore | null): void {
        this.store = store;
    }

    protected getStore(): TStore {
        if (!this.store) {
            throw new Error(`Expected ${this.getStoreTypeName()} to be set on ${this.constructor.name}`);
        }
        return this.store;
    }

    public dispose(): void {
        signalStore.clear(this);
        this.fiberRoots.clear();
        this.tornDown.clear();
    }

    protected abstract renderItem(ptr: number): ReactNode;
    protected abstract getItemFromListItem(listItem: Gtk.ListItem): unknown;
    protected abstract onSetup(listItem: Gtk.ListItem, ptr: number): Gtk.Widget;
    protected abstract onBind(listItem: Gtk.ListItem, ptr: number, fiberRoot: Reconciler.FiberRoot): void;
    protected abstract onUnbind(listItem: Gtk.ListItem): void;
    protected abstract onTeardown(listItem: Gtk.ListItem, ptr: number): void;

    protected onSetupComplete(_ptr: number): void {}

    protected createBox(): Gtk.Box {
        const box = new Gtk.Box(Gtk.Orientation.HORIZONTAL);
        box.setValign(Gtk.Align.CENTER);

        if (this.estimatedItemHeight !== null) {
            box.setSizeRequest(-1, this.estimatedItemHeight);
        }

        return box;
    }

    protected clearBoxSizeRequest(box: Gtk.Widget): void {
        if (box instanceof Gtk.Box) {
            box.setSizeRequest(-1, -1);
        }
    }

    private initializeFactory(): void {
        signalStore.set(this, this.factory, "setup", (_self, listItem: Gtk.ListItem) => {
            const ptr = getNativeId(listItem.handle);
            const container = this.onSetup(listItem, ptr);
            const fiberRoot = createFiberRoot(container);
            this.fiberRoots.set(ptr, fiberRoot);
            const element = this.renderItem(ptr);
            reconciler.getInstance().updateContainer(element, fiberRoot, null, () => {
                if (this.tornDown.has(ptr)) return;
                this.onSetupComplete(ptr);
            });
        });

        signalStore.set(this, this.factory, "bind", (_self, listItem: Gtk.ListItem) => {
            const ptr = getNativeId(listItem.handle);
            const fiberRoot = this.fiberRoots.get(ptr);
            if (!fiberRoot) return;
            this.onBind(listItem, ptr, fiberRoot);
        });

        signalStore.set(this, this.factory, "unbind", (_self, listItem: Gtk.ListItem) => {
            this.onUnbind(listItem);
        });

        signalStore.set(this, this.factory, "teardown", (_self, listItem) => {
            const ptr = getNativeId(listItem.handle);
            const fiberRoot = this.fiberRoots.get(ptr);

            if (fiberRoot) {
                this.tornDown.add(ptr);
                this.onTeardown(listItem, ptr);
                reconciler.getInstance().updateContainer(null, fiberRoot, null, () => {});
                queueMicrotask(() => {
                    this.fiberRoots.delete(ptr);
                    this.tornDown.delete(ptr);
                });
            }
        });
    }
}
