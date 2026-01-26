import type * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import type { Container } from "../types.js";
import { VirtualContainerNode } from "./abstract/virtual-container.js";
import { matchesInterface } from "./internal/utils.js";

const TOOLBAR_INTERFACE_METHODS = ["addTopBar", "addBottomBar", "remove"] as const;

class ToolbarTopNode extends VirtualContainerNode<Adw.ToolbarView> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "ToolbarTop";
    }

    public override canBeChildOf(parent: Node): boolean {
        return matchesInterface(TOOLBAR_INTERFACE_METHODS, parent.container as Container);
    }

    protected override attachChild(parent: Adw.ToolbarView, widget: Gtk.Widget): void {
        parent.addTopBar(widget);
    }
}

class ToolbarBottomNode extends VirtualContainerNode<Adw.ToolbarView> {
    public static override priority = 1;

    public static override matches(type: string): boolean {
        return type === "ToolbarBottom";
    }

    public override canBeChildOf(parent: Node): boolean {
        return matchesInterface(TOOLBAR_INTERFACE_METHODS, parent.container as Container);
    }

    protected override attachChild(parent: Adw.ToolbarView, widget: Gtk.Widget): void {
        parent.addBottomBar(widget);
    }
}

registerNodeClass(ToolbarTopNode);
registerNodeClass(ToolbarBottomNode);
