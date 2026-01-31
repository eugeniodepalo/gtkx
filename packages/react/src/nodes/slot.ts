import type * as Gtk from "@gtkx/ffi/gtk";
import { toCamelCase } from "@gtkx/gir";
import type { SlotProps } from "../jsx.js";
import type { Node } from "../node.js";
import type { ContainerClass, Props } from "../types.js";
import { resolvePropMeta } from "./internal/utils.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

type SlotNodeProps = Omit<SlotProps, "children">;

export class SlotNode<P extends Props = SlotNodeProps> extends VirtualNode<P, WidgetNode, WidgetNode> {
    public parentWidget: Gtk.Widget | null = null;
    public childWidget: Gtk.Widget | null = null;
    private cachedSetter: ((child: Gtk.Widget | null) => void) | null = null;

    public setParentWidget(parent: Gtk.Widget | null): void {
        if (this.parentWidget !== parent) {
            this.cachedSetter = null;
        }
        this.parentWidget = parent;
    }

    public override canAcceptChild(child: Node): boolean {
        return child instanceof WidgetNode;
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot append '${child.typeName}' to '${this.typeName}': expected Widget`);
        }

        const oldChild = this.childWidget;
        this.childWidget = child.container;

        super.appendChild(child);

        if (this.parentWidget) {
            this.onChildChange(oldChild);
        }
    }

    public override removeChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`Cannot remove '${child.typeName}' from '${this.typeName}': expected Widget`);
        }

        const oldChild = this.childWidget;
        this.childWidget = null;

        super.removeChild(child);

        if (this.parentWidget && oldChild) {
            this.onChildChange(oldChild);
        }
    }

    public override onAddedToParent(parent: Node): void {
        if (parent instanceof WidgetNode) {
            this.setParentWidget(parent.container);
            if (this.childWidget) {
                this.onChildChange(null);
            }
        }
    }

    public override onRemovedFromParent(_parent: Node): void {}

    public override detachDeletedInstance(): void {
        if (this.parentWidget && this.childWidget) {
            const parent = this.parentWidget;
            const oldChild = this.childWidget;
            this.childWidget = null;

            queueMicrotask(() => {
                if (parent.getRoot() !== null) {
                    this.parentWidget = parent;
                    this.onChildChange(oldChild);
                }
                this.parentWidget = null;
            });
        } else {
            this.parentWidget = null;
        }

        super.detachDeletedInstance();
    }

    public getChildWidget(): Gtk.Widget {
        if (!this.childWidget) {
            throw new Error(`Expected child widget to be set on '${this.getId()}' SlotNode`);
        }

        return this.childWidget;
    }

    public getId(): string {
        const id = (this.props as SlotProps).id;

        if (!id) {
            throw new Error("Expected 'id' prop to be present on Slot");
        }

        return toCamelCase(id);
    }

    public getParentWidget(): Gtk.Widget {
        if (!this.parentWidget) {
            throw new Error(`Expected parent widget to be set on '${this.getId()}' SlotNode`);
        }

        return this.parentWidget;
    }

    public ensureChildSetter(): (child: Gtk.Widget | null) => void {
        if (this.cachedSetter) return this.cachedSetter;

        const parent = this.getParentWidget();
        const parentType = (parent.constructor as ContainerClass).glibTypeName;
        const propMeta = resolvePropMeta(parent, this.getId());

        if (!propMeta) {
            throw new Error(`Unable to find property for Slot '${this.getId()}' on type '${parentType}'`);
        }

        const [, setterName] = propMeta;
        const setter = parent[setterName as keyof Gtk.Widget];

        if (typeof setter !== "function") {
            throw new Error(`Expected setter function for Slot '${this.getId()}' on type '${parentType}'`);
        }

        this.cachedSetter = setter.bind(parent) as (child: Gtk.Widget | null) => void;
        return this.cachedSetter;
    }

    public onChildChange(oldChild: Gtk.Widget | null): void {
        const setter = this.ensureChildSetter();

        if (oldChild && !this.childWidget) {
            const parent = this.getParentWidget();
            const root = oldChild.getRoot();
            const focusWidget = root?.getFocus?.();

            if (focusWidget && this.isDescendantOf(focusWidget, oldChild)) {
                parent.grabFocus();
            }
        }

        setter(this.childWidget);
    }

    private isDescendantOf(widget: Gtk.Widget, ancestor: Gtk.Widget): boolean {
        let current: Gtk.Widget | null = widget;

        while (current) {
            if (current === ancestor) {
                return true;
            }

            current = current.getParent();
        }

        return false;
    }
}
