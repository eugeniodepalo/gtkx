import { getNativeObject } from "@gtkx/ffi";
import * as Gio from "@gtkx/ffi/gio";
import * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container, Props } from "../types.js";
import { isContainerType } from "./internal/utils.js";
import { MenuNode } from "./menu.js";
import { Menu } from "./models/menu.js";
import { WidgetNode } from "./widget.js";

class PopoverMenuNode extends WidgetNode<Gtk.PopoverMenu | Gtk.PopoverMenuBar> {
    public static override priority = 1;

    private menu: Menu;

    public static override matches(_type: string, containerOrClass?: Container): boolean {
        return (
            isContainerType(Gtk.PopoverMenu, containerOrClass) || isContainerType(Gtk.PopoverMenuBar, containerOrClass)
        );
    }

    constructor(
        typeName: string,
        props: Props,
        container: Gtk.PopoverMenu | Gtk.PopoverMenuBar,
        rootContainer?: Container,
    ) {
        super(typeName, props, container, rootContainer);
        const application = rootContainer instanceof Gtk.Application ? rootContainer : undefined;
        this.menu = new Menu("root", application);

        if (application) {
            const actionMap = getNativeObject(application.id, Gio.ActionMap);
            if (actionMap) {
                this.menu.setActionMap(actionMap);
            }
        }

        this.container.setMenuModel(this.menu.getMenu());
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof MenuNode)) {
            throw new Error(`Cannot append '${child.typeName}' to 'PopoverMenu': expected MenuItem`);
        }

        this.menu.appendChild(child);
    }

    public override insertBefore(child: Node, before: Node): void {
        if (!(child instanceof MenuNode)) {
            throw new Error(`Cannot insert '${child.typeName}' to 'PopoverMenu': expected MenuItem`);
        }

        this.menu.insertBefore(child, before);
    }

    public override removeChild(child: Node): void {
        if (!(child instanceof MenuNode)) {
            throw new Error(`Cannot remove '${child.typeName}' from 'PopoverMenu': expected MenuItem`);
        }

        this.menu.removeChild(child);
    }
}

registerNodeClass(PopoverMenuNode);
