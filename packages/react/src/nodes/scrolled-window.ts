import * as Gtk from "@gtkx/ffi/gtk";
import { registerNodeClass } from "../registry.js";
import type { Container, ContainerClass, Props } from "../types.js";
import { filterProps, hasChanged, matchesAnyClass } from "./internal/utils.js";
import { WidgetNode } from "./widget.js";

const PROPS = ["hscrollbarPolicy", "vscrollbarPolicy"] as const;

type ScrolledWindowProps = Props & {
    hscrollbarPolicy?: Gtk.PolicyType;
    vscrollbarPolicy?: Gtk.PolicyType;
};

class ScrolledWindowNode extends WidgetNode<Gtk.ScrolledWindow, ScrolledWindowProps> {
    public static override priority = 2;

    public static override matches(_type: string, containerOrClass?: Container | ContainerClass | null): boolean {
        return matchesAnyClass([Gtk.ScrolledWindow], containerOrClass);
    }

    public override updateProps(oldProps: ScrolledWindowProps | null, newProps: ScrolledWindowProps): void {
        super.updateProps(oldProps ? filterProps(oldProps, PROPS) : null, filterProps(newProps, PROPS));
        this.applyOwnProps(oldProps, newProps);
    }

    protected applyOwnProps(oldProps: ScrolledWindowProps | null, newProps: ScrolledWindowProps): void {
        if (hasChanged(oldProps, newProps, "hscrollbarPolicy") || hasChanged(oldProps, newProps, "vscrollbarPolicy")) {
            const hPolicy = newProps.hscrollbarPolicy ?? Gtk.PolicyType.AUTOMATIC;
            const vPolicy = newProps.vscrollbarPolicy ?? Gtk.PolicyType.AUTOMATIC;
            this.container.setPolicy(hPolicy, vPolicy);
        }
    }
}

registerNodeClass(ScrolledWindowNode);
