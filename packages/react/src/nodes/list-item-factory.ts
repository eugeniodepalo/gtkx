import { getObjectId } from "@gtkx/ffi";
import * as GObject from "@gtkx/ffi/gobject";
import * as Gtk from "@gtkx/ffi/gtk";
import type Reconciler from "react-reconciler";
import { createFiberRoot } from "../fiber-root.js";
import { reconciler } from "../reconciler.js";
import type { RenderItemFn } from "../types.js";

export type ListItemInfo = {
    box: Gtk.Box;
    fiberRoot: Reconciler.FiberRoot;
};

type ListItemFactoryConfig = {
    factory: Gtk.SignalListItemFactory;
    listItemCache: Map<number, ListItemInfo>;
    getRenderFn: () => RenderItemFn<unknown>;
    getItemAtPosition: (position: number) => unknown;
};

export type ListItemFactoryHandlers = {
    handlerIds: number[];
    disconnect: () => void;
};

export function connectListItemFactorySignals(config: ListItemFactoryConfig): ListItemFactoryHandlers {
    const { factory, listItemCache, getRenderFn, getItemAtPosition } = config;
    const handlerIds: number[] = [];

    const setupId = factory.connect("setup", (_self, listItemObj) => {
        const listItem = listItemObj as Gtk.ListItem;
        const id = getObjectId(listItemObj.id);

        const box = new Gtk.Box(Gtk.Orientation.VERTICAL, 0);
        listItem.setChild(box);

        const fiberRoot = createFiberRoot(box);
        listItemCache.set(id, { box, fiberRoot });

        const element = getRenderFn()(null);
        reconciler.getInstance().updateContainer(element, fiberRoot, null, () => {});
    });
    handlerIds.push(setupId);

    const bindId = factory.connect("bind", (_self, listItemObj) => {
        const listItem = listItemObj as Gtk.ListItem;
        const id = getObjectId(listItemObj.id);
        const info = listItemCache.get(id);

        if (!info) return;

        const position = listItem.getPosition();
        const item = getItemAtPosition(position);
        const element = getRenderFn()(item ?? null);
        reconciler.getInstance().updateContainer(element, info.fiberRoot, null, () => {});
    });
    handlerIds.push(bindId);

    const unbindId = factory.connect("unbind", (_self, listItemObj) => {
        const id = getObjectId(listItemObj.id);
        const info = listItemCache.get(id);

        if (!info) return;

        reconciler.getInstance().updateContainer(null, info.fiberRoot, null, () => {});
    });
    handlerIds.push(unbindId);

    const teardownId = factory.connect("teardown", (_self, listItemObj) => {
        const id = getObjectId(listItemObj.id);
        const info = listItemCache.get(id);

        if (info) {
            reconciler.getInstance().updateContainer(null, info.fiberRoot, null, () => {});
            queueMicrotask(() => listItemCache.delete(id));
        }
    });
    handlerIds.push(teardownId);

    return {
        handlerIds,
        disconnect: () => {
            for (const handlerId of handlerIds) {
                GObject.signalHandlerDisconnect(factory, handlerId);
            }
            handlerIds.length = 0;
        },
    };
}
