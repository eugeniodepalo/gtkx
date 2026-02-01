import type * as Gtk from "@gtkx/ffi/gtk";
import { isAddable, isAppendable, isContentWidget, isRemovable, isSingleChild } from "./predicates.js";

export function detachChild(child: Gtk.Widget, container: Gtk.Widget): void {
    if (isAppendable(container) || isAddable(container)) {
        if (isRemovable(container)) {
            container.remove(child);
        }
    } else if (isContentWidget(container)) {
        container.setContent(null);
    } else if (isSingleChild(container)) {
        container.setChild(null);
    } else if (isRemovable(container)) {
        container.remove(child);
    }
}

export function attachChild(child: Gtk.Widget, container: Gtk.Widget): void {
    if (isAppendable(container)) {
        container.append(child);
    } else if (isAddable(container)) {
        container.add(child);
    } else if (isContentWidget(container)) {
        container.setContent(child);
    } else if (isSingleChild(container)) {
        container.setChild(child);
    } else {
        throw new Error(`Cannot attach child to '${container.constructor.name}': container does not support children`);
    }
}

export function isAttachedTo(child: Gtk.Widget | null, parent: Gtk.Widget | null): boolean {
    if (!child || !parent) return false;
    const childParent = child.getParent();
    return childParent !== null && childParent === parent;
}
