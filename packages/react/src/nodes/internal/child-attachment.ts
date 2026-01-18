import type * as Gtk from "@gtkx/ffi/gtk";
import { isAddable, isAppendable, isContentWidget, isRemovable, isSingleChild } from "./predicates.js";

type AttachmentStrategy =
    | { type: "appendable"; container: Gtk.Widget & { append(child: Gtk.Widget): void } }
    | { type: "addable"; container: Gtk.Widget & { add(child: Gtk.Widget): void } }
    | { type: "content"; container: Gtk.Widget & { setContent(content: Gtk.Widget | null): void } }
    | { type: "singleChild"; container: Gtk.Widget & { setChild(child: Gtk.Widget | null): void } };

export const getAttachmentStrategy = (container: Gtk.Widget): AttachmentStrategy | null => {
    if (isAppendable(container)) {
        return { type: "appendable", container };
    }
    if (isAddable(container)) {
        return { type: "addable", container };
    }
    if (isContentWidget(container)) {
        return { type: "content", container };
    }
    if (isSingleChild(container)) {
        return { type: "singleChild", container };
    }
    return null;
};

export const attachChild = (child: Gtk.Widget, strategy: AttachmentStrategy): void => {
    switch (strategy.type) {
        case "appendable":
            strategy.container.append(child);
            break;
        case "addable":
            strategy.container.add(child);
            break;
        case "content":
            strategy.container.setContent(child);
            break;
        case "singleChild":
            strategy.container.setChild(child);
            break;
    }
};

export const detachChild = (child: Gtk.Widget, strategy: AttachmentStrategy): void => {
    switch (strategy.type) {
        case "appendable":
        case "addable":
            if (isRemovable(strategy.container)) {
                strategy.container.remove(child);
            }
            break;
        case "content":
            strategy.container.setContent(null);
            break;
        case "singleChild":
            strategy.container.setChild(null);
            break;
    }
};
